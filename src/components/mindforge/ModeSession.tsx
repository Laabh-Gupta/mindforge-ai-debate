import { useChat } from "@ai-sdk/react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Brain, Flag, Play, SendHorizontal, Sparkle, Mic, Timer as TimerIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SpeakerBubble, parseSpeakerTurns } from "@/components/mindforge/SpeakerTurn";
import {
  ThinkingCard,
  ThinkingPanel,
  type ThinkingPair,
} from "@/components/mindforge/ThinkingView";
import { SESSION_KEY, THINKING_VIEW_KEY, type StoredSession } from "@/lib/evaluation-shared";
import { defaultProfileIdForMode, loadSelectedProfileId } from "@/lib/evaluation-profiles";
import { OPENING_TRIGGER } from "@/lib/session-prompt";
import { generateExtemporeTopic } from "@/lib/session.functions";
import type { TrainingMode } from "@/lib/training-modes";

function messageText(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Phase = "setup" | "prep" | "live";

/** Modes with a real back-and-forth exchange to explain. */
const THINKING_MODES = new Set([
  "debate",
  "group-discussion",
  "case-discussion",
  "interview",
  "negotiation",
]);

export function ModeSession({ mode }: { mode: TrainingMode }) {
  const navigate = useNavigate();
  const getTopic = useServerFn(generateExtemporeTopic);

  const [input, setInput] = useState("");
  const [variant, setVariant] = useState(mode.variants?.[0] ?? "");
  const [topic, setTopic] = useState("");
  const [phase, setPhase] = useState<Phase>("setup");
  const [preparing, setPreparing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const isPanel = mode.kind === "panel";
  const isExtempore = mode.id === "extempore";
  const supportsThinking = THINKING_MODES.has(mode.id);
  const [thinkingOn, setThinkingOn] = useState(false);

  useEffect(() => {
    if (!supportsThinking) return;
    try {
      setThinkingOn(window.localStorage.getItem(THINKING_VIEW_KEY) === "on");
    } catch {
      // storage unavailable — the toggle just starts off
    }
  }, [supportsThinking]);

  function toggleThinking() {
    setThinkingOn((on) => {
      const next = !on;
      try {
        window.localStorage.setItem(THINKING_VIEW_KEY, next ? "on" : "off");
      } catch {
        // ignore
      }
      return next;
    });
  }

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/session",
        body: () => ({ topic, modeId: mode.id, variant }),
      }),
    [topic, mode.id, variant],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: `${mode.id}:${topic || "idle"}`,
    transport,
    onError: (err) => toast.error(err.message || "The AI could not respond. Please try again."),
  });

  const busy = status === "submitted" || status === "streaming";
  const visible = messages.filter((m) => messageText(m) !== OPENING_TRIGGER);
  const thinking = busy && !(status === "streaming" && visible.at(-1)?.role === "assistant");

  // One pair per completed assistant turn, with the user turn it answered.
  const pairs: ThinkingPair[] = useMemo(() => {
    if (!supportsThinking || !thinkingOn) return [];
    const out: ThinkingPair[] = [];
    visible.forEach((message, index) => {
      if (message.role !== "assistant") return;
      const isLast = index === visible.length - 1;
      if (isLast && busy) return; // still streaming
      const aiTurn = messageText(message);
      if (!aiTurn) return;
      const priorUser = visible
        .slice(0, index)
        .reverse()
        .find((m) => m.role === "user");
      out.push({ id: message.id, userTurn: priorUser ? messageText(priorUser) : "", aiTurn });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportsThinking, thinkingOn, messages, busy]);

  const thinkingContext = {
    modeId: mode.id,
    modeName: mode.name,
    topic,
    ...(variant ? { variant } : {}),
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    if (phase === "live" && !busy) composerRef.current?.focus();
  }, [phase, busy]);

  // Ask for the opening turn as soon as the topic is locked in.
  useEffect(() => {
    if (!topic || phase === "setup") return;
    if (messages.length > 0) return;
    void sendMessage({ text: OPENING_TRIGGER });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, phase]);

  // Countdown for extempore prep and speaking windows.
  useEffect(() => {
    if (!isExtempore || seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [isExtempore, seconds]);

  useEffect(() => {
    if (isExtempore && phase === "prep" && seconds === 0 && topic) {
      setPhase("live");
      setSeconds(mode.speakSeconds ?? 120);
    }
  }, [isExtempore, phase, seconds, topic, mode.speakSeconds]);

  async function start(chosen: string) {
    const value = chosen.trim();
    if (isExtempore) {
      setPreparing(true);
      try {
        const generated = await getTopic({ data: { theme: value || "Surprise me" } });
        if (!generated) {
          toast.error("Could not fetch a topic. Try again.");
          return;
        }
        setTopic(generated);
        setPhase("prep");
        setSeconds(mode.prepSeconds ?? 60);
      } finally {
        setPreparing(false);
      }
      return;
    }
    if (!value) return;
    setTopic(value);
    setPhase("live");
  }

  function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    void sendMessage({ text });
  }

  function finish() {
    const session: StoredSession = {
      modeId: mode.id,
      modeName: mode.name,
      topic,
      ...(variant ? { variant } : {}),
      profileId: loadSelectedProfileId(defaultProfileIdForMode(mode.id)),
      turns: visible.map((m) => ({
        speaker: m.role === "user" ? "You" : mode.name,
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

  if (phase === "setup") {
    return (
      <section className="animate-rise">
        <p className="text-xs tracking-widest text-primary uppercase">{mode.tagline}</p>
        <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{mode.name}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{mode.description}</p>

        {mode.variants && (
          <div className="mt-6">
            <p className="text-xs tracking-widest text-muted-foreground uppercase">
              {mode.variantLabel}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {mode.variants.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVariant(v)}
                  className={`rounded-full px-4 py-2 text-sm transition-colors ${
                    variant === v
                      ? "bg-gradient-brand text-primary-foreground"
                      : "glass text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void start(input);
          }}
          className="glass mt-6 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode.placeholder}
            aria-label={mode.setupLabel}
            className="h-12 flex-1 bg-secondary/40"
          />
          <Button
            type="submit"
            disabled={preparing}
            className="h-12 bg-gradient-brand px-6 text-primary-foreground"
          >
            <Play className="mr-1 h-4 w-4" /> {preparing ? "Preparing..." : mode.ctaLabel}
          </Button>
        </form>

        <h2 className="mt-10 text-sm tracking-widest text-muted-foreground uppercase">
          {isExtempore ? "Pick a theme" : "Suggestions"}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {mode.presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => void start(p === "Surprise me" ? "" : p)}
              className="glass hover-lift rounded-2xl px-5 py-4 text-left text-sm"
            >
              <Sparkle className="mb-2 h-4 w-4 text-primary" />
              {p}
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (phase === "prep") {
    return (
      <section className="animate-rise mx-auto max-w-2xl text-center">
        <p className="text-xs tracking-widest text-primary uppercase">Your surprise topic</p>
        <h1 className="mt-4 font-display text-2xl font-bold sm:text-3xl">{topic}</h1>
        <p className="mt-6 font-display text-6xl font-bold text-gradient">
          {formatClock(seconds)}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Preparation time. Plan a hook, a stance, two points and a close.
        </p>
        <Button
          className="mt-8 h-11 bg-gradient-brand px-8 text-primary-foreground"
          onClick={() => setSeconds(0)}
        >
          I'm ready — start speaking
        </Button>
      </section>
    );
  }

  return (
    <section className="animate-rise">
      <div className="glass flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-widest text-muted-foreground uppercase">
            {mode.name}
            {variant ? ` · ${variant}` : ""}
          </p>
          <h1 className="truncate text-base font-semibold">{topic}</h1>
        </div>
        {supportsThinking && (
          <button
            type="button"
            onClick={toggleThinking}
            aria-pressed={thinkingOn}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-colors ${
              thinkingOn
                ? "bg-gradient-brand text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Brain className="h-3.5 w-3.5" /> Thinking View
          </button>
        )}
        {isExtempore ? (
          <span className="flex shrink-0 items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs">
            <TimerIcon className="h-3.5 w-3.5 text-primary" /> {formatClock(seconds)}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
            Turn {Math.max(1, Math.ceil(visible.length / 2))}
          </span>
        )}
      </div>

      <div
        className={
          thinkingOn ? "mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]" : "mt-5"
        }
      >
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
              {isPanel ? (
                parseSpeakerTurns(messageText(m)).map((turn, i) => (
                  <SpeakerBubble key={i} speaker={turn.speaker} content={turn.content} />
                ))
              ) : (
                <SpeakerBubble speaker={mode.name} content={messageText(m)} />
              )}
              {thinkingOn &&
                pairs.some((p) => p.id === m.id) &&
                (() => {
                  const index = pairs.findIndex((p) => p.id === m.id);
                  const pair = pairs[index]!;
                  return (
                    <div className="lg:hidden">
                      <ThinkingCard pair={pair} context={thinkingContext} index={index} />
                    </div>
                  );
                })()}
            </div>
          ),
        )}

        {thinking && (
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
            {isPanel ? "The room is responding..." : "Thinking..."}
          </div>
        )}
        {error && !busy && (
          <p className="px-1 text-sm text-destructive">
            {error.message || "The AI could not respond. Please try again."}
          </p>
        )}
        <div ref={endRef} />
      </div>
        {thinkingOn && (
          <div className="hidden lg:block">
            <ThinkingPanel pairs={pairs} context={thinkingContext} />
          </div>
        )}
      </div>

      <form onSubmit={send} className="glass sticky bottom-4 mt-6 rounded-2xl p-4">
        <Textarea
          ref={composerRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            mode.kind === "speech"
              ? "Deliver your speech here..."
              : isPanel
                ? "Cut in with your point..."
                : "Make your case..."
          }
          rows={3}
          className="resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
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
            type="submit"
            disabled={busy || !draft.trim()}
            className="bg-gradient-brand text-primary-foreground"
          >
            Send <SendHorizontal className="ml-1 h-4 w-4" />
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
    </section>
  );
}