import { z } from "zod/v3";
import { accountRequest } from "./account-api";
import { PracticeSchema } from "./practice-schema";
export { PracticeSchema } from "./practice-schema";
import { EVALUATION_DIMENSIONS } from "./evaluation-shared";
import type { PracticeSession } from "./practice-types";

export function readClearedAt(owner: string) {
  try {
    return Number(localStorage.getItem(`mindforge:cleared-at:${owner}`)) || 0;
  } catch {
    return 0;
  }
}
const storageKey = (owner: string) => `mindforge:practice:v2:${owner}`;
const scoreShape = Object.fromEntries(
  EVALUATION_DIMENSIONS.map((key) => [key, z.number().min(0).max(100)]),
) as Record<(typeof EVALUATION_DIMENSIONS)[number], z.ZodNumber>;
const LegacySchema = z.object({
  modeId: z.string().max(60),
  modeName: z.string().max(120),
  topic: z.string().max(3000),
  at: z.number().finite().nonnegative(),
  overall: z.number().min(0).max(100),
  scores: z.object(scoreShape),
});
export function migrateLegacyRecords(raw: unknown): PracticeSession[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((row) => {
    const parsed = LegacySchema.safeParse(row);
    if (!parsed.success) return [];
    const r = parsed.data;
    return [
      {
        id: crypto.randomUUID(),
        modeId: r.modeId,
        modeName: r.modeName,
        topic: r.topic,
        startedAt: r.at,
        updatedAt: r.at,
        completedAt: r.at,
        status: "completed" as const,
        durationSeconds: 0,
        difficulty: "intermediate" as const,
        turns: [],
        messages: [],
        overall: r.overall,
        evaluation: {
          scores: r.scores,
          summary:
            "Imported from your earlier practice history. The original transcript and duration were not recorded.",
          strengths: [],
          weaknesses: [],
          suggestions: [],
          fallacies: [],
        },
        extra: { imported: true },
      },
    ];
  });
}
export function readLocalSessions(owner: string): PracticeSession[] {
  if (typeof window === "undefined") return [];
  try {
    if (
      owner === "guest" &&
      localStorage.getItem(storageKey(owner)) === null &&
      localStorage.getItem("mindforge:skills")
    ) {
      const imported = migrateLegacyRecords(JSON.parse(localStorage.getItem("mindforge:skills")!));
      writeLocalSessions(owner, imported);
      localStorage.removeItem("mindforge:skills");
      return imported;
    }
    const raw: unknown = JSON.parse(localStorage.getItem(storageKey(owner)) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((row) => {
      const parsed = PracticeSchema.safeParse(row);
      return parsed.success ? [parsed.data as PracticeSession] : [];
    });
  } catch {
    return [];
  }
}
export function writeLocalSessions(owner: string, sessions: PracticeSession[]) {
  localStorage.setItem(storageKey(owner), JSON.stringify(sessions));
}
export function mergeSessions(local: PracticeSession[], remote: PracticeSession[]) {
  const map = new Map<string, PracticeSession>();
  for (const session of [...remote, ...local]) {
    const previous = map.get(session.id);
    if (previous?.status === "completed" && session.status === "active") continue;
    if (
      !previous ||
      (session.status === "completed" && previous.status === "active") ||
      session.updatedAt > previous.updatedAt
    )
      map.set(session.id, session);
  }
  return [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}
export async function loadCloudSessions(owner: string) {
  if (owner === "guest") return { sessions: [] as PracticeSession[], clearedAt: 0 };
  const sessions: PracticeSession[] = [];
  let clearedAt = 0;
  for (let offset = 0; ; offset += 100) {
    const page = await accountRequest<{ sessions: PracticeSession[]; clearedAt: number }>(
      "/api/practice?offset=" + offset,
      "GET",
      undefined,
      owner,
    );
    clearedAt = Math.max(clearedAt, page.clearedAt);
    for (const row of page.sessions) {
      const parsed = PracticeSchema.safeParse(row);
      if (parsed.success) sessions.push(parsed.data as PracticeSession);
    }
    if (page.sessions.length < 100) break;
  }
  return { sessions: sessions.filter((s) => s.startedAt > clearedAt), clearedAt };
}
export async function syncCloudSessions(owner: string, sessions: PracticeSession[]) {
  if (owner === "guest") return;
  for (const session of sessions) await accountRequest("/api/practice", "POST", session, owner);
}
export async function clearSessions(owner: string) {
  if (owner !== "guest") {
    const { clearedAt } = await accountRequest<{ clearedAt: number }>(
      "/api/practice",
      "DELETE",
      undefined,
      owner,
    );
    localStorage.setItem(`mindforge:cleared-at:${owner}`, String(clearedAt));
  }
  localStorage.removeItem(storageKey(owner));
  if (owner === "guest") {
    localStorage.removeItem("mindforge:skills");
    localStorage.removeItem("mindforge:last-session");
  }
}
