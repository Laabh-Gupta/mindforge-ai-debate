import { aiFetch } from "@/lib/api-transport";
import { ConversationText } from "./ConversationText";
import { useFlushSession } from "@/hooks/use-flush-session";
import { useChat } from "@ai-sdk/react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ArrowRight,
  Brain,
  Flag,
  Play,
  SendHorizontal,
  Square,
  RotateCcw,
  Timer,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SpeakerBubble, parseSpeakerTurns } from "./SpeakerTurn";
import { ThinkingCard } from "./ThinkingView";
import { VoiceRecorder } from "./VoiceRecorder";
import { usePractice } from "./PracticeProvider";
import { defaultProfileIdForMode, loadSelectedProfileId } from "@/lib/evaluation-profiles";
import { OPENING_TRIGGER } from "@/lib/session-prompt";
import { generateExtemporeTopic } from "@/lib/session.functions";
import { adaptiveDifficulty } from "@/lib/gamification";
import {
  canComplete,
  contributionWords,
  wordCount,
  type PracticeSession,
  type Difficulty,
} from "@/lib/practice-types";
import { useSessionClock, formatDuration } from "@/hooks/use-session-clock";
import type { TrainingMode } from "@/lib/training-modes";

export const messageText = (message: UIMessage) =>
  message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();
const EVIDENCE_TYPES = [
  "Any evidence",
  "Academic Research",
  "Historical Examples",
  "Economic Data",
  "Government Reports",
  "Case Studies",
  "Legal Precedents",
  "Scientific Evidence",
  "Business Examples",
  "Current Affairs",
  "Personal Experience",
  "Hypothetical Scenarios",
];
export function ModeSession({ mode }: { mode: TrainingMode }) {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const getTopic = generateExtemporeTopic;
  const { sessions, save, ready, preferences, owner } = usePractice();
  const [input, setInput] = useState(search.topic ?? "");
  const [variant, setVariant] = useState(mode.variants?.[0] ?? "");
  const [topic, setTopic] = useState("");
  const [phase, setPhase] = useState<"setup" | "prep" | "live">("setup");
  const [preparing, setPreparing] = useState(false);
  const [sending, setSending] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [draft, setDraft] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("adaptive");
  const [evidenceType, setEvidenceType] = useState("Any evidence");
  const [userRole, setUserRole] = useState("");
  const [thinkingOn, setThinkingOn] = useState(false);
  const [meta, setMeta] = useState<{ id: string; startedAt: number } | null>(null);
  const [elapsed, setElapsed] = useSessionClock(phase !== "setup");
  const endRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const openingSent = useRef(false);
  const finished = useRef(false);
  const sessionOwner = useRef(owner);
  const snapshot = useRef<PracticeSession | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;
  const isExtempore = mode.id === "extempore";
  const effectiveDifficulty =
    difficulty === "adaptive" ? adaptiveDifficulty(sessions, mode.id) : difficulty;
  const resumable = sessions.find(
    (s) =>
      s.modeId === mode.id && s.status === "active" && (!search.resume || s.id === search.resume),
  );
  useEffect(() => {
    if (phase === "setup") setDifficulty(preferences.difficulty);
  }, [preferences.difficulty, phase]);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/session",
        fetch: aiFetch,
        body: () => ({
          topic,
          modeId: mode.id,
          variant,
          difficulty: effectiveDifficulty,
          language: preferences.language,
          evidenceType,
          userRole,
        }),
      }),
    [topic, mode.id, variant, effectiveDifficulty, preferences.language, evidenceType, userRole],
  );
  const { messages, setMessages, sendMessage, regenerate, stop, status, error, clearError } =
    useChat({
      id: `practice:${mode.id}:${owner}`,
      transport,
      onError: () =>
        toast.error(
          "The response could not be completed. Your conversation is saved; retry below.",
        ),
    });
  const busy = sending || status === "submitted" || status === "streaming";
  const visible = messages.filter(
    (m) => messageText(m) !== OPENING_TRIGGER && !messageText(m).startsWith("__mindforge_event__"),
  );
  const turns = visible
    .filter((m) => messageText(m))
    .map((m) => ({
      speaker: m.role === "user" ? "You" : mode.name,
      role: m.role === "user" ? ("user" as const) : ("ai" as const),
      content: messageText(m),
    }));
  const meaningful = canComplete({ modeId: mode.id, modeName: mode.name, topic, turns });
  const request = (text: string) => {
    setSending(true);
    void sendMessage({ text })
      .catch(() => undefined)
      .finally(() => setSending(false));
  };

  useEffect(() => {
    if (meta && topic && !openingSent.current && !messages.length) {
      openingSent.current = true;
      request(OPENING_TRIGGER);
    }
  }, [meta, topic, messages.length]); // opening runs once per session
  useEffect(() => {
    if (endRef.current && phase !== "setup")
      endRef.current.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [messages, phase]);
  useEffect(() => {
    if (phase === "live" && !busy) composerRef.current?.focus({ preventScroll: true });
  }, [phase, busy]);
  useEffect(() => {
    if (!isExtempore || phase === "setup") return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") setSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [isExtempore, phase]);
  useEffect(() => {
    if (isExtempore && phase === "prep" && seconds === 0 && topic) {
      setPhase("live");
      setSeconds(mode.speakSeconds ?? 120);
    }
  }, [isExtempore, phase, seconds, topic, mode.speakSeconds]);

  const current: PracticeSession | null =
    meta && phase !== "setup"
      ? {
          ...meta,
          modeId: mode.id,
          modeName: mode.name,
          topic,
          variant,
          turns,
          messages,
          durationSeconds: elapsed,
          status: "active",
          updatedAt: Date.now(),
          difficulty: effectiveDifficulty,
          profileId: loadSelectedProfileId(defaultProfileIdForMode(mode.id)),
          draft,
          phase,
          remainingSeconds: seconds,
          userRole,
          evidenceType,
        }
      : null;
  snapshot.current = current;
  useEffect(() => {
    if (!current || finished.current || sessionOwner.current !== owner) return;
    const timeout = setTimeout(() => {
      if (!finished.current && snapshot.current) saveRef.current(snapshot.current);
    }, 400);
    return () => clearTimeout(timeout);
  }, [messages, topic, variant, phase, draft, elapsed, seconds, owner]);
  useFlushSession(snapshot, finished, saveRef);
  useEffect(() => {
    if (sessionOwner.current !== owner) {
      finished.current = true;
      snapshot.current = null;
      void stop();
      setPhase("setup");
      setMeta(null);
      setTopic("");
      setDraft("");
      setMessages([]);
      sessionOwner.current = owner;
    }
  }, [owner, stop, setMessages]);

  async function start(chosen: string) {
    let value = chosen.trim();
    if ((!value && !isExtempore) || !ready || preparing) return;
    setPreparing(true);
    try {
      if (isExtempore) {
        value = (await getTopic({ data: { theme: value || "Surprise me" } })) ?? "";
        if (!value) throw new Error();
      }
      finished.current = false;
      openingSent.current = false;
      setMessages([]);
      clearError();
      setMeta({ id: crypto.randomUUID(), startedAt: Date.now() });
      setTopic(value);
      setElapsed(0);
      setDraft("");
      setPhase(isExtempore ? "prep" : "live");
      setSeconds(isExtempore ? (mode.prepSeconds ?? 60) : 0);
    } catch {
      toast.error("A topic could not be generated. Please try again.");
    } finally {
      setPreparing(false);
    }
  }
  function resume() {
    if (!resumable) return;
    finished.current = false;
    openingSent.current = resumable.messages.length > 0;
    setMeta({ id: resumable.id, startedAt: resumable.startedAt });
    setTopic(resumable.topic);
    setVariant(resumable.variant ?? "");
    setDifficulty(resumable.difficulty);
    setEvidenceType(resumable.evidenceType ?? "Any evidence");
    setUserRole(resumable.userRole ?? "");
    setElapsed(resumable.durationSeconds);
    setDraft(resumable.draft ?? "");
    setPhase(resumable.phase ?? "live");
    setSeconds(resumable.remainingSeconds ?? 0);
    setMessages(resumable.messages);
    clearError();
  }
  function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy || phase === "prep") return;
    setDraft("");
    request(text);
  }
  function finish() {
    if (!current || busy || !meaningful) return;
    finished.current = true;
    save({
      ...current,
      status: "completed",
      completedAt: Date.now(),
      updatedAt: Date.now(),
      draft: "",
    });
    void navigate({ to: "/evaluation", search: { session: current.id } });
  }
  if (phase === "setup")
    return (
      <section className="mf-session">
        {resumable && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/30 bg-primary/5 p-5">
            <div>
              <p className="text-sm font-medium">Unfinished session</p>
              <p className="mt-1 text-sm text-muted-foreground">{resumable.topic}</p>
            </div>
            <Button variant="outline" onClick={resume}>
              <Play className="size-4" />
              Resume session
            </Button>
          </div>
        )}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(240px,1fr)]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void start(input);
            }}
            className="mf-panel p-6 sm:p-8"
          >
            <div className="flex items-center gap-3">
              <mode.icon className="size-5 text-primary" />
              <h2 className="text-lg font-medium">Set up your session</h2>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{mode.description}</p>
            {mode.variants && (
              <div className="mt-7 space-y-2">
                <Label>{mode.variantLabel}</Label>
                <Select value={variant} onValueChange={setVariant}>
                  <SelectTrigger aria-label={mode.variantLabel}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mode.variants.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="mt-6 space-y-2">
              <Label htmlFor="session-topic">{mode.setupLabel}</Label>
              <Textarea
                id="session-topic"
                disabled={!ready || preparing}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={3000}
                required={!isExtempore}
                placeholder={mode.placeholder}
                className="min-h-24 resize-y"
              />
            </div>
            {mode.id === "real-world-simulation" && (
              <div className="mt-5 space-y-2">
                <Label htmlFor="user-role">Your role</Label>
                <Input
                  id="user-role"
                  maxLength={120}
                  placeholder="e.g. CEO, UN delegate, RBI Governor"
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                />
              </div>
            )}
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                  <SelectTrigger aria-label="Difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["adaptive", "beginner", "intermediate", "advanced"].map((v) => (
                      <SelectItem key={v} value={v}>
                        {v[0]!.toUpperCase() + v.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Evidence coach</Label>
                <Select value={evidenceType} onValueChange={setEvidenceType}>
                  <SelectTrigger aria-label="Evidence coach">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVIDENCE_TYPES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {difficulty === "adaptive" && (
              <p className="mt-3 text-xs text-muted-foreground">
                Starts at {effectiveDifficulty}, based on your recent reviews in this mode.
              </p>
            )}
            <Button
              type="submit"
              className="mt-7"
              disabled={preparing || !ready || (!input.trim() && !isExtempore)}
            >
              {preparing ? "Preparing your topic…" : mode.ctaLabel}
              <ArrowRight className="size-4" />
            </Button>
          </form>
          <div>
            <h3 className="text-sm font-medium">Need a starting point?</h3>
            <div className="mt-4 space-y-2">
              {mode.presets.map((preset) => (
                <button
                  key={preset}
                  disabled={preparing}
                  onClick={() => setInput(preset)}
                  className="w-full rounded-lg border border-border p-4 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {preset}
                </button>
              ))}
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              100 XP for a completed session. Your review is based on your own contributions.
            </p>
          </div>
        </div>
      </section>
    );
  return (
    <section className="mf-session">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {variant || mode.name} · {effectiveDifficulty}
          </p>
          <h2 className="mt-2 max-w-2xl text-xl font-medium">{topic}</h2>
          {userRole && <p className="mt-2 text-sm text-muted-foreground">Your role: {userRole}</p>}
        </div>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Timer className="size-4" />
          {formatDuration(elapsed)}
        </span>
      </div>
      {isExtempore && (
        <div
          role="status"
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 px-5 py-4"
        >
          <span>
            {phase === "prep"
              ? "Preparation time"
              : seconds > 0
                ? "Speaking time"
                : "Time is up. Finish your thought and submit."}
          </span>
          <span className="font-mono">{formatDuration(seconds)}</span>
          {phase === "prep" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPhase("live");
                setSeconds(mode.speakSeconds ?? 120);
              }}
            >
              Ready to speak
            </Button>
          )}
        </div>
      )}
      <div className="mb-5 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setThinkingOn((v) => !v)}
          aria-pressed={thinkingOn}
        >
          <Brain className="size-4" />
          Thinking View {thinkingOn ? "on" : "off"}
        </Button>
        {mode.id === "real-world-simulation" && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              request(
                "__mindforge_event__ Introduce a plausible unexpected development, clearly labelled as a simulated event, and let the stakeholders react.",
              )
            }
          >
            Introduce an event
          </Button>
        )}
      </div>
      <div className="mf-transcript space-y-6" role="log" aria-label="Session transcript">
        {visible.map((m, i) => {
          const text = messageText(m);
          const prior = visible
            .slice(0, i)
            .reverse()
            .find((p) => p.role === "user");
          return (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "ml-6 rounded-xl border border-border bg-secondary/40 p-5 sm:ml-14"
                  : "rounded-xl border border-border bg-card p-5 sm:p-6"
              }
            >
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                {m.role === "user"
                  ? "You"
                  : mode.kind === "panel"
                    ? "The room"
                    : mode.kind === "interview"
                      ? "Interviewer"
                      : "Coach"}
              </p>
              {m.role !== "user" && mode.kind === "panel" ? (
                parseSpeakerTurns(text).map((t, j) => <SpeakerBubble key={j} {...t} />)
              ) : (
                <ConversationText text={text || (busy ? "Preparing a response…" : "")} />
              )}
              {thinkingOn &&
                m.role === "assistant" &&
                !(busy && i === visible.length - 1) &&
                text && (
                  <div className="mt-4">
                    <ThinkingCard
                      pair={{ id: m.id, userTurn: prior ? messageText(prior) : "", aiTurn: text }}
                      index={i}
                      context={{ modeId: mode.id, modeName: mode.name, topic, variant }}
                    />
                  </div>
                )}
            </div>
          );
        })}
        {status === "submitted" && (
          <p role="status" className="py-3 text-sm text-muted-foreground">
            Considering your response…
          </p>
        )}
        <div ref={endRef} />
      </div>
      {error && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 p-4 text-sm"
        >
          <span>{error.message || "The response was interrupted."}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void regenerate().catch(() => undefined);
            }}
          >
            <RotateCcw className="size-4" />
            Retry response
          </Button>
        </div>
      )}
      <form onSubmit={send} className="mt-6 space-y-3">
        <Label htmlFor="session-answer">Your response</Label>
        <Textarea
          ref={composerRef}
          id="session-answer"
          value={draft}
          maxLength={12000}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            phase === "prep"
              ? "Use this space to prepare your opening…"
              : "Make your point. Give a reason or an example."
          }
          className="min-h-32 text-base"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              if (draft.trim() && !busy && phase !== "prep") {
                setDraft("");
                request(draft.trim());
              }
            }
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {wordCount(draft)} words · Ctrl Enter to send
          </p>
          <div className="flex gap-2">
            {busy && (
              <Button type="button" variant="outline" onClick={() => void stop()}>
                <Square className="size-4" />
                Stop response
              </Button>
            )}
            <Button type="submit" disabled={busy || !draft.trim() || phase === "prep"}>
              <SendHorizontal className="size-4" />
              Send response
            </Button>
          </div>
        </div>
        {wordCount(draft) > 200 && (
          <p className="text-sm text-warning">
            Try closing with your main point in one or two sentences.
          </p>
        )}
      </form>
      <div className="mt-5">
        <VoiceRecorder />
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border py-5">
        <p className="text-xs text-muted-foreground">
          {meaningful
            ? "Your conversation is saved as you practice."
            : `Add at least 20 words of your own before finishing (${contributionWords({ modeId: mode.id, modeName: mode.name, topic, turns })}/20).`}
        </p>
        <Button variant="outline" onClick={finish} disabled={busy || !meaningful}>
          <Flag className="size-4" />
          Finish & review
        </Button>
      </div>
    </section>
  );
}
