import { useChat } from "@ai-sdk/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Flag, Hand, Mic, SendHorizontal, Sparkle, Timer as TimerIcon, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { FloatingNav } from "@/components/mindforge/FloatingNav";
import { SpeakerBubble, parseSpeakerTurns, speakerColor } from "@/components/mindforge/SpeakerTurn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SESSION_KEY, type StoredSession } from "@/lib/evaluation-shared";
import { defaultProfileIdForMode, loadSelectedProfileId } from "@/lib/evaluation-profiles";
import { OPENING_TRIGGER, PANEL_PERSONAS } from "@/lib/session-prompt";

const TITLE = "Group Discussion Simulator — MindForge";
const DESCRIPTION =
  "Join a live MBA-style group discussion room with an AI moderator and five opinionated participants. Cut in, hold the floor, and get evaluated.";

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

function GroupDiscussionPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"setup" | "live">("setup");
  const [topicInput, setTopicInput] = useState("");
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState<string>(FORMATS[0].id);
  const [draft, setDraft] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
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

  const yourTurns = visible.filter((m) => m.role === "user").length;
  const yourWords = visible
    .filter((m) => m.role === "user")
    .reduce((sum, m) => sum + messageText(m).split(/\s+/).filter(Boolean).length, 0);

  // Who has actually spoken so far, in order of first appearance.
  const spoken = useMemo(() => {
    const seen = new Map<string, number>();
    visible
      .filter((m) => m.role === "assistant")
      .forEach((m) =>
        parseSpeakerTurns(messageText(m)).forEach((t) => {
          if (!t.speaker) return;
          const name = t.speaker.replace(/\s*\(.*\)/, "").trim();
          seen.set(name, (seen.get(name) ?? 0) + 1);
        }),
      );
    return seen;
  }, [messages]);

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
      text: "(I stay silent and listen — let the other participants continue the discussion.)",
    });
  }

  function finish() {
    const session: StoredSession = {
      modeId: "group-discussion",
      modeName: "Group Discussion Simulator",
      topic,
      variant: format,
      profileId: loadSelectedProfileId(defaultProfileIdForMode("group-discussion")),
      turns: visible.map((m) => ({
        speaker: m.role === "user" ? "You" : "GD Room",
        role: m.role === "user" ? ("user" as const) : ("ai" as const),
        content: messageText(m),
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
    <div className="min-h-screen pb-12">
      <FloatingNav />
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
                <ul className="mt-4 space-y-4">
                  {PANEL_PERSONAS.map((p) => (
                    <li key={p.name} className="flex gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-xs font-semibold">
                        {initialsOf(p.name)}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${speakerColor(p.name)}`}>{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.role}</p>
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

            <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <div>
                <div className="space-y-5">
                  {visible.map((m) =>
                    m.role === "user" ? (
                      <div key={m.id} className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-5 py-3 text-sm leading-relaxed whitespace-pre-line text-primary-foreground">
                          {messageText(m)}
                        </div>
                      </div>
                    ) : (
                      <div key={m.id} className="space-y-4">
                        {parseSpeakerTurns(messageText(m)).map((turn, i) => (
                          <SpeakerBubble key={i} speaker={turn.speaker} content={turn.content} />
                        ))}
                      </div>
                    ),
                  )}

                  {roomThinking && (
                    <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
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
                  {error && !busy && (
                    <p className="px-1 text-sm text-destructive">
                      {error.message || "The room could not respond. Please try again."}
                    </p>
                  )}
                  <div ref={endRef} />
                </div>

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

                {visible.length > 1 && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      className="h-11 bg-gradient-brand px-6 text-primary-foreground"
                      onClick={finish}
                      disabled={busy}
                    >
                      <Flag className="mr-1 h-4 w-4" /> Finish &amp; get evaluation
                    </Button>
                  </div>
                )}
              </div>

              <aside className="glass h-fit rounded-2xl p-5 lg:sticky lg:top-24">
                <p className="text-xs tracking-widest text-muted-foreground uppercase">
                  Participants
                </p>
                <ul className="mt-4 space-y-3">
                  {PANEL_PERSONAS.map((p) => {
                    const count = spoken.get(p.name) ?? 0;
                    return (
                      <li key={p.name} className="flex items-center gap-3">
                        <span
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[11px] font-semibold ${
                            count > 0 ? "bg-primary/20" : "bg-secondary"
                          }`}
                        >
                          {initialsOf(p.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-xs font-semibold ${speakerColor(p.name)}`}>
                            {p.name}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">{p.role}</p>
                        </div>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{count}</span>
                      </li>
                    );
                  })}
                  <li className="flex items-center gap-3 border-t border-border pt-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-brand text-[11px] font-semibold text-primary-foreground">
                      YOU
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">You</p>
                      <p className="truncate text-[11px] text-muted-foreground">Participant</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{yourTurns}</span>
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
    </div>
  );
}