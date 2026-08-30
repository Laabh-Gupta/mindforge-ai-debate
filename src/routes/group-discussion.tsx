import { useChat } from "@ai-sdk/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ClipboardList,
  Flag,
  Hand,
  Mic,
  SendHorizontal,
  Sparkle,
  Timer as TimerIcon,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AppShellRaw } from "@/components/mindforge/AppShell";
import { parseSpeakerTurns, speakerColor } from "@/components/mindforge/SpeakerTurn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SESSION_KEY, type StoredSession } from "@/lib/evaluation-shared";
import { defaultProfileIdForMode, loadSelectedProfileId } from "@/lib/evaluation-profiles";
import { GD_CAST, GD_MODERATOR, GD_PARTICIPANTS, OPENING_TRIGGER } from "@/lib/session-prompt";
import { summarizeGroupDiscussion } from "@/lib/session.functions";

const TITLE = "Group Discussion Simulator — MindForge";
const DESCRIPTION =
  "Join a live MBA-style group discussion room with an AI moderator and five opinionated participants who argue with each other. Speak, get a real transcript, moderator feedback and a contribution summary.";

export const Route = createFileRoute("/group-discussion")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GroupDiscussionPage,
});

const FORMATS = [
  { id: "Current Affairs GD", hint: "Policy and news topics, facts matter" },
  { id: "Abstract GD", hint: "Open-ended prompts, interpretation matters" },
  { id: "Case-Based GD", hint: "A situation with constraints to resolve" },
  { id: "Placement GD", hint: "Corporate panel, crisp and time-boxed" },
] as const;

const TOPICS = [
  "Should India privatise its public sector banks?",
  "Is work-from-home hurting early-career learning?",
  "Should electric vehicle subsidies continue?",
  "Does gig work exploit or empower young Indians?",
  "Is AI regulation slowing down innovation?",
  "Should college admissions drop entrance exams?",
];

type Wrap = {
  moderatorClosing: string;
  moderatorFeedback: string[];
  userVerdict: string;
  contributions: {
    name: string;
    role: string;
    stance: string;
    contribution: string;
    impact: "high" | "medium" | "low";
  }[];
};

type TranscriptLine = {
  key: string;
  index: number;
  speaker: string;
  role: string;
  content: string;
  isUser: boolean;
};

function messageText(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function initialsOf(name: string) {
  return name
    .replace(/\(.*\)/, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Match a spoken name back onto the fixed cast so cards stay stable. */
function resolveCast(raw: string | null) {
  if (!raw) return null;
  const bare = raw.replace(/\s*\(.*\)/, "").trim().toLowerCase();
  return (
    GD_CAST.find((p) => p.name.toLowerCase() === bare) ??
    GD_CAST.find(
      (p) => bare.includes(p.name.split(" ").at(-1)!.toLowerCase()) && bare.length > 2,
    ) ??
    null
  );
}

const IMPACT_STYLES: Record<Wrap["contributions"][number]["impact"], string> = {
  high: "bg-success/15 text-success",
  medium: "bg-warning/15 text-warning",
  low: "bg-secondary text-muted-foreground",
};

function GroupDiscussionPage() {
  const navigate = useNavigate();
  const wrapUp = useServerFn(summarizeGroupDiscussion);
  const [phase, setPhase] = useState<"setup" | "live">("setup");
  const [topicInput, setTopicInput] = useState("");
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState<string>(FORMATS[0].id);
  const [draft, setDraft] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [wrap, setWrap] = useState<Wrap | null>(null);
  const [wrapping, setWrapping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/session",
        body: () => ({ topic, modeId: "group-discussion", variant: format }),
      }),
    [topic, format],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: `gd:${topic || "idle"}`,
    transport,
    onError: (err) => toast.error(err.message || "The room could not respond. Please try again."),
  });

  const busy = status === "submitted" || status === "streaming";
  const visible = messages.filter((m) => messageText(m) !== OPENING_TRIGGER);
  const roomThinking = busy && !(status === "streaming" && visible.at(-1)?.role === "assistant");

  // Flatten every message into a single ordered discussion transcript.
  const transcript = useMemo<TranscriptLine[]>(() => {
    const lines: TranscriptLine[] = [];
    visible.forEach((m) => {
      const text = messageText(m);
      if (!text) return;
      if (m.role === "user") {
        if (text.startsWith("(I stay silent")) return;
        lines.push({
          key: `${m.id}-you`,
          index: lines.length + 1,
          speaker: "You",
          role: "Participant",
          content: text,
          isUser: true,
        });
        return;
      }
      parseSpeakerTurns(text).forEach((turn, i) => {
        const cast = resolveCast(turn.speaker);
        lines.push({
          key: `${m.id}-${i}`,
          index: lines.length + 1,
          speaker: cast?.name ?? turn.speaker ?? "Participant",
          role: cast?.role ?? "Participant",
          content: turn.content,
          isUser: false,
        });
      });
    });
    return lines;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const yourLines = transcript.filter((l) => l.isUser);
  const yourTurns = yourLines.length;
  const yourWords = yourLines.reduce(
    (sum, l) => sum + l.content.split(/\s+/).filter(Boolean).length,
    0,
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    transcript.forEach((l) => map.set(l.speaker, (map.get(l.speaker) ?? 0) + 1));
    return map;
  }, [transcript]);

  const lastSpeaker = transcript.at(-1)?.speaker ?? null;

  function statusOf(name: string) {
    if (busy && status === "streaming" && lastSpeaker === name) return "Speaking";
    if (roomThinking) return "Preparing";
    if ((counts.get(name) ?? 0) === 0) return "Waiting";
    return "Listening";
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, roomThinking]);

  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (!topic || phase !== "live" || messages.length > 0) return;
    void sendMessage({ text: OPENING_TRIGGER });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, phase]);

  useEffect(() => {
    if (phase === "live" && !busy) composerRef.current?.focus();
  }, [phase, busy]);

  function start(value: string) {
    const chosen = value.trim();
    if (!chosen) return;
    setTopic(chosen);
    setElapsed(0);
    setWrap(null);
    setPhase("live");
  }

  function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    void sendMessage({ text });
  }

  function letRoomRun() {
    if (busy) return;
    void sendMessage({
      text: "(I stay silent and listen — let the other participants continue the discussion among themselves.)",
    });
  }

  function transcriptText() {
    return transcript.map((l) => `${l.speaker} (${l.role}): ${l.content}`).join("\n");
  }

  async function closeDiscussion() {
    if (wrapping || busy) return;
    setWrapping(true);
    try {
      const result = await wrapUp({
        data: {
          topic,
          format,
          roster: GD_CAST.map((p) => `- ${p.name} (${p.role})`).join("\n"),
          transcript: transcriptText(),
        },
      });
      if (!result) {
        toast.error("The moderator could not summarise this discussion. Try again.");
        return;
      }
      setWrap(result as Wrap);
      setTimeout(() => wrapRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } finally {
      setWrapping(false);
    }
  }

  function finish() {
    const session: StoredSession = {
      modeId: "group-discussion",
      modeName: "Group Discussion Simulator",
      topic,
      variant: format,
      profileId: loadSelectedProfileId(defaultProfileIdForMode("group-discussion")),
      turns: transcript.map((l) => ({
        speaker: l.isUser ? "You" : `${l.speaker} (${l.role})`,
        role: l.isUser ? ("user" as const) : ("ai" as const),
        content: l.content,
      })),
    };
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // storage unavailable — the evaluation page shows an empty state
    }
    void navigate({ to: "/evaluation" });
  }

  return (
    <AppShellRaw>
      <main className="mx-auto max-w-6xl px-5 pt-8">
        {phase === "setup" ? (
          <section className="animate-rise">
            <p className="text-xs tracking-widest text-primary uppercase">
              Moderator + 5 AI participants
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
              Group Discussion Room
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              A live GD table where participants argue with each other, build on points and talk
              over one another. You have to cut in to be heard — exactly like a real placement or
              MBA discussion.
            </p>

            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div>
                <p className="text-xs tracking-widest text-muted-foreground uppercase">
                  Discussion format
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {FORMATS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFormat(f.id)}
                      className={`rounded-2xl px-4 py-3 text-left transition-colors ${
                        format === f.id
                          ? "bg-gradient-brand text-primary-foreground"
                          : "glass text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="block text-sm font-semibold">{f.id}</span>
                      <span className="mt-0.5 block text-xs opacity-80">{f.hint}</span>
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    start(topicInput);
                  }}
                  className="glass mt-6 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row"
                >
                  <Input
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="e.g. Should India privatise its public sector banks?"
                    aria-label="GD topic"
                    className="h-12 flex-1 bg-secondary/40"
                  />
                  <Button
                    type="submit"
                    className="h-12 bg-gradient-brand px-6 text-primary-foreground"
                  >
                    <Users className="mr-1 h-4 w-4" /> Enter the room
                  </Button>
                </form>

                <h2 className="mt-10 text-sm tracking-widest text-muted-foreground uppercase">
                  Popular topics
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {TOPICS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => start(t)}
                      className="glass hover-lift rounded-2xl px-5 py-4 text-left text-sm"
                    >
                      <Sparkle className="mb-2 h-4 w-4 text-primary" />
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <aside className="glass h-fit rounded-2xl p-5">
                <p className="text-xs tracking-widest text-muted-foreground uppercase">
                  Who's at the table
                </p>
                <div className="mt-4 flex gap-3 rounded-2xl bg-secondary/40 p-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-brand text-xs font-semibold text-primary-foreground">
                    {initialsOf(GD_MODERATOR.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{GD_MODERATOR.name}</p>
                    <p className="text-xs text-primary">{GD_MODERATOR.role}</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-4">
                  {GD_PARTICIPANTS.map((p) => (
                    <li key={p.name} className="flex gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-xs font-semibold">
                        {initialsOf(p.name)}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${speakerColor(p.name)}`}>{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.role}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground/80">{p.style}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          </section>
        ) : (
          <section className="animate-rise">
            <div className="glass flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs tracking-widest text-muted-foreground uppercase">
                  Group Discussion · {format}
                </p>
                <h1 className="truncate text-base font-semibold">{topic}</h1>
              </div>
              <span className="flex shrink-0 items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs">
                <TimerIcon className="h-3.5 w-3.5 text-primary" /> {clock(elapsed)}
              </span>
              <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                Your turns: {yourTurns} · {yourWords} words
              </span>
            </div>

            <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
              <div>
                {/* Discussion transcript */}
                <div className="glass overflow-hidden rounded-2xl">
                  <div className="flex items-center justify-between border-b border-border px-5 py-3">
                    <p className="text-xs tracking-widest text-muted-foreground uppercase">
                      Discussion transcript
                    </p>
                    <span className="text-[11px] text-muted-foreground">
                      {transcript.length} turns
                    </span>
                  </div>
                  <ol className="divide-y divide-border/60">
                    {transcript.map((line) => (
                      <li
                        key={line.key}
                        className={`grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 px-5 py-4 ${
                          line.isUser ? "bg-primary/5" : ""
                        }`}
                      >
                        <span className="pt-0.5 font-mono text-[11px] text-muted-foreground">
                          {line.index.toString().padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-baseline gap-x-2">
                            <span
                              className={`text-xs font-semibold tracking-wide uppercase ${
                                line.isUser ? "text-primary" : speakerColor(line.speaker)
                              }`}
                            >
                              {line.speaker}
                            </span>
                            <span className="text-[11px] text-muted-foreground">{line.role}</span>
                          </p>
                          <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-foreground">
                            {line.content}
                          </p>
                        </div>
                      </li>
                    ))}
                    {transcript.length === 0 && !roomThinking && (
                      <li className="px-5 py-6 text-sm text-muted-foreground">
                        The room is settling in...
                      </li>
                    )}
                  </ol>
                  {roomThinking && (
                    <div className="flex items-center gap-2 border-t border-border px-5 py-3 text-sm text-muted-foreground">
                      <span className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="h-2 w-2 animate-bounce rounded-full bg-primary"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </span>
                      The room is talking...
                    </div>
                  )}
                </div>

                {error && !busy && (
                  <p className="mt-3 px-1 text-sm text-destructive">
                    {error.message || "The room could not respond. Please try again."}
                  </p>
                )}
                <div ref={endRef} />

                <form onSubmit={send} className="glass sticky bottom-4 mt-6 rounded-2xl p-4">
                  <Textarea
                    ref={composerRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Cut in with your point..."
                    rows={3}
                    className="resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Voice input (coming soon)"
                        disabled
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={letRoomRun}
                        disabled={busy}
                        className="text-xs"
                      >
                        <Hand className="mr-1 h-3.5 w-3.5" /> Stay silent
                      </Button>
                    </div>
                    <Button
                      type="submit"
                      disabled={busy || !draft.trim()}
                      className="bg-gradient-brand text-primary-foreground"
                    >
                      Speak <SendHorizontal className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </form>

                {transcript.length > 1 && (
                  <div className="mt-4 flex flex-wrap justify-end gap-3">
                    <Button variant="outline" onClick={closeDiscussion} disabled={busy || wrapping}>
                      <ClipboardList className="mr-1 h-4 w-4" />
                      {wrapping ? "Moderator is closing..." : "Close & get moderator feedback"}
                    </Button>
                    <Button
                      className="h-11 bg-gradient-brand px-6 text-primary-foreground"
                      onClick={finish}
                      disabled={busy}
                    >
                      <Flag className="mr-1 h-4 w-4" /> Finish &amp; get evaluation
                    </Button>
                  </div>
                )}

                {wrap && (
                  <div ref={wrapRef} className="animate-rise mt-8 space-y-5">
                    <div className="glass rounded-2xl p-5">
                      <p className="text-xs tracking-widest text-primary uppercase">
                        Moderator's closing — {GD_MODERATOR.name}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-foreground">
                        {wrap.moderatorClosing}
                      </p>
                      <p className="mt-4 text-xs tracking-widest text-muted-foreground uppercase">
                        Feedback for you
                      </p>
                      <ul className="mt-3 space-y-2">
                        {wrap.moderatorFeedback.map((f, i) => (
                          <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            <span className="text-foreground">{f}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-4 rounded-xl bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
                        {wrap.userVerdict}
                      </p>
                    </div>

                    <div className="glass rounded-2xl p-5">
                      <p className="text-xs tracking-widest text-muted-foreground uppercase">
                        Participant contribution summary
                      </p>
                      <ul className="mt-4 space-y-4">
                        {wrap.contributions.map((c) => (
                          <li key={c.name} className="flex gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-[11px] font-semibold">
                              {initialsOf(c.name)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`text-sm font-semibold ${speakerColor(c.name)}`}
                                >
                                  {c.name}
                                </span>
                                <span className="text-[11px] text-muted-foreground">{c.role}</span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] tracking-wide uppercase ${
                                    IMPACT_STYLES[c.impact] ?? IMPACT_STYLES.low
                                  }`}
                                >
                                  {c.impact} impact
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {counts.get(c.name) ?? 0} turns
                                </span>
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">{c.stance}</p>
                              <p className="mt-1 text-sm text-foreground">{c.contribution}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              <aside className="glass h-fit rounded-2xl p-5 lg:sticky lg:top-24">
                <p className="text-xs tracking-widest text-muted-foreground uppercase">
                  The room
                </p>
                <ul className="mt-4 space-y-3">
                  {GD_CAST.map((p) => {
                    const count = counts.get(p.name) ?? 0;
                    const state = statusOf(p.name);
                    const isModerator = p.name === GD_MODERATOR.name;
                    return (
                      <li
                        key={p.name}
                        className={`flex items-center gap-3 rounded-xl px-2 py-2 transition-colors ${
                          state === "Speaking" ? "bg-primary/10" : ""
                        }`}
                      >
                        <span
                          className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[11px] font-semibold ${
                            isModerator
                              ? "bg-gradient-brand text-primary-foreground"
                              : count > 0
                                ? "bg-primary/20"
                                : "bg-secondary"
                          }`}
                        >
                          {initialsOf(p.name)}
                          {state === "Speaking" && (
                            <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-success ring-2 ring-background" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-xs font-semibold ${speakerColor(p.name)}`}>
                            {p.name}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">{p.role}</p>
                          <p
                            className={`truncate text-[10px] tracking-wide uppercase ${
                              state === "Speaking" ? "text-success" : "text-muted-foreground/70"
                            }`}
                          >
                            {state} · {count} turns
                          </p>
                        </div>
                      </li>
                    );
                  })}
                  <li className="flex items-center gap-3 border-t border-border px-2 pt-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-brand text-[11px] font-semibold text-primary-foreground">
                      YOU
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">You</p>
                      <p className="truncate text-[11px] text-muted-foreground">Participant</p>
                      <p className="truncate text-[10px] tracking-wide text-muted-foreground/70 uppercase">
                        {yourTurns > 0 ? "Active" : "Yet to speak"} · {yourTurns} turns
                      </p>
                    </div>
                  </li>
                </ul>
                <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                  Aim for 3-5 substantial interventions. Reference other speakers by name to score
                  on teamwork and listening.
                </p>
              </aside>
            </div>
          </section>
        )}
      </main>
    </AppShellRaw>
  );
}
