import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth-user";
import {
  clearSessions,
  loadCloudSessions,
  mergeSessions,
  readLocalSessions,
  readClearedAt,
  syncCloudSessions,
  writeLocalSessions,
} from "@/lib/practice-store";
import { DEFAULT_PREFERENCES, readPreferences, type Preferences } from "@/lib/preferences";
import { computeProgress } from "@/lib/gamification";
import type { PracticeSession } from "@/lib/practice-types";

type PracticeContext = {
  sessions: PracticeSession[];
  ready: boolean;
  owner: string;
  syncError: string | null;
  save: (session: PracticeSession) => void;
  clear: () => Promise<void>;
  retrySync: () => Promise<void>;
  preferences: Preferences;
  setPreferences: (next: Partial<Preferences>) => void;
};
const Context = createContext<PracticeContext | null>(null);
export function PracticeProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthUser();
  const owner = user?.id ?? "guest";
  const [loadedOwner, setLoadedOwner] = useState<string | null>(null);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [preferences, updatePreferences] = useState(DEFAULT_PREFERENCES);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const versionRef = useRef(0);
  const generation = useRef(0);
  const clearing = useRef(false);
  const current = useRef<PracticeSession[]>([]);
  const activeOwner = useRef(owner);
  activeOwner.current = owner;
  const pending = useRef(new Map<string, PracticeSession>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncQueue = useRef<Promise<void>>(Promise.resolve());
  const storageWarned = useRef(false);

  const persist = useCallback((who: string, next: PracticeSession[]) => {
    try {
      writeLocalSessions(who, next);
    } catch {
      if (!storageWarned.current) {
        toast.error(
          "Device storage is full or disabled. Keep this tab open and export your sessions.",
        );
        storageWarned.current = true;
      }
    }
  }, []);
  // One writer at a time prevents old drafts finishing after newer snapshots.
  const flush = useCallback((who: string) => {
    const token = generation.current;
    syncQueue.current = syncQueue.current.then(async () => {
      if (who !== activeOwner.current || token !== generation.current || clearing.current) return;
      const batch = [...pending.current.values()];
      try {
        await syncCloudSessions(who, batch);
        if (who !== activeOwner.current || token !== generation.current) return;
        for (const sent of batch)
          if (pending.current.get(sent.id)?.updatedAt === sent.updatedAt)
            pending.current.delete(sent.id);
        setSyncError(null);
      } catch (error) {
        if (who === activeOwner.current && token === generation.current)
          setSyncError(error instanceof Error ? error.message : "Cloud sync is unavailable.");
      }
    });
    return syncQueue.current;
  }, []);
  const reloadCloud = useCallback(
    async (who: string) => {
      const token = generation.current;
      if (who === "guest" || clearing.current) return;
      try {
        const { sessions: remote, clearedAt } = await loadCloudSessions(who);
        if (token !== generation.current || who !== activeOwner.current || clearing.current) return;
        if (clearedAt > readClearedAt(who)) {
          localStorage.setItem(`mindforge:cleared-at:${who}`, String(clearedAt));
          versionRef.current++;
          setVersion(versionRef.current);
        }
        for (const [id, session] of pending.current)
          if (clearedAt && session.startedAt <= clearedAt) pending.current.delete(id);
        const next = mergeSessions(current.current, remote).filter(
          (s) => !clearedAt || s.startedAt > clearedAt,
        );
        current.current = next;
        setSessions(next);
        persist(who, next);
        const cloud = new Map(remote.map((s) => [s.id, s.updatedAt]));
        next.forEach((s) => {
          if ((cloud.get(s.id) ?? 0) < s.updatedAt) pending.current.set(s.id, s);
        });
        await flush(who);
      } catch (error) {
        if (token === generation.current && who === activeOwner.current)
          setSyncError(error instanceof Error ? error.message : "Cloud history is unavailable.");
      }
    },
    [persist, flush],
  );
  useEffect(() => {
    if (loading) return;
    generation.current++;
    pending.current.clear();
    setSyncError(null);
    const local = readLocalSessions(owner);
    current.current = local;
    setSessions(local);
    setLoadedOwner(owner);
    void reloadCloud(owner);
    return () => {
      generation.current++;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [owner, loading, reloadCloud]);

  useEffect(() => {
    updatePreferences(readPreferences());
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset["theme"] =
        preferences.theme === "system" ? (media.matches ? "dark" : "light") : preferences.theme;
      document.documentElement.classList.toggle(
        "dark",
        document.documentElement.dataset["theme"] === "dark",
      );
      document.documentElement.dataset["reducedMotion"] = String(preferences.reducedMotion);
      document.documentElement.style.fontSize = preferences.largerText ? "18px" : "16px";
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preferences]);
  useEffect(() => {
    const online = () => void reloadCloud(owner);
    const changed = (event: StorageEvent) => {
      if (event.key === `mindforge:practice:v2:${owner}`) {
        const next = readLocalSessions(owner);
        if (event.newValue === null) {
          generation.current++;
          pending.current.clear();
          versionRef.current++;
          setVersion(versionRef.current);
        }
        current.current = next;
        setSessions(next);
      }
      if (event.key === `mindforge:cleared-at:${owner}`) {
        generation.current++;
        const clearedAt = readClearedAt(owner);
        for (const [id, session] of pending.current)
          if (session.startedAt <= clearedAt) pending.current.delete(id);
        versionRef.current++;
        setVersion(versionRef.current);
        const next = current.current.filter((session) => session.startedAt > clearedAt);
        current.current = next;
        setSessions(next);
      }
      if (event.key === "mindforge:preferences") updatePreferences(readPreferences());
    };
    window.addEventListener("online", online);
    window.addEventListener("storage", changed);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("storage", changed);
    };
  }, [owner, reloadCloud]);

  const save = useCallback(
    (session: PracticeSession) => {
      if (
        loading ||
        loadedOwner !== owner ||
        activeOwner.current !== owner ||
        clearing.current ||
        version !== versionRef.current
      )
        return;
      const next = mergeSessions(
        [session],
        mergeSessions(current.current, readLocalSessions(owner)),
      );
      current.current = next;
      setSessions(next);
      persist(owner, next);
      if (owner !== "guest") {
        const latest = next.find((s) => s.id === session.id)!;
        pending.current.set(session.id, latest);
        if (!timer.current)
          timer.current = setTimeout(() => {
            timer.current = null;
            void flush(owner);
          }, 2500);
      }
    },
    [owner, loading, loadedOwner, persist, flush, version],
  );
  const clear = useCallback(async () => {
    clearing.current = true;
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pending.current.clear();
    try {
      await syncQueue.current;
      await clearSessions(owner);
      current.current = [];
      setSessions([]);
      setSyncError(null);
      versionRef.current++;
      setVersion(versionRef.current);
    } finally {
      clearing.current = false;
    }
  }, [owner]);
  const setPreferences = useCallback(
    (next: Partial<Preferences>) =>
      updatePreferences((previous) => {
        const value = { ...previous, ...next };
        try {
          localStorage.setItem("mindforge:preferences", JSON.stringify(value));
        } catch {
          toast.error("Preferences could not be saved on this device.");
        }
        return value;
      }),
    [],
  );
  return (
    <Context.Provider
      value={{
        sessions: loadedOwner === owner && !loading ? sessions : [],
        ready: loadedOwner === owner && !loading,
        owner,
        save,
        clear,
        retrySync: () => reloadCloud(owner),
        syncError,
        preferences,
        setPreferences,
      }}
    >
      <Fragment key={`${owner}:${version}`}>{children}</Fragment>
    </Context.Provider>
  );
}
export function usePractice() {
  const context = useContext(Context);
  if (!context) throw new Error("PracticeProvider is required");
  return context;
}
export function useProgress() {
  const { sessions, preferences } = usePractice();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(tick);
  }, []);
  return useMemo(
    () => computeProgress(sessions, now, preferences.dailyGoal),
    [sessions, now, preferences.dailyGoal],
  );
}
