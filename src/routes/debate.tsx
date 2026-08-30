import { useChat } from "@ai-sdk/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Mic, SendHorizontal, Sparkle, Flag, Play } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AppShellRaw } from "@/components/mindforge/AppShell";
import { suggestedTopics } from "@/lib/mindforge-data";
import { OPENING_TRIGGER } from "@/lib/debate-prompt";
import { DEBATE_TRANSCRIPT_KEY, type StoredTranscript } from "@/services/ai-debate";

const title = "Debate Room — MindForge";
const description =
  "Pick a motion, state your opinion, and let the AI stress-test your reasoning turn by turn.";

export const Route = createFileRoute("/debate")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: DebateRoom,
});

function messageText(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

function DebateRoom() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [activeTopic, setActiveTopic] = useState("");
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ topic: activeTopic }),
      }),
    [activeTopic],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: activeTopic || "idle",
    transport,
    onError: (err) => {
      toast.error(err.message || "The AI could not respond. Please try again.");
    },
  });

  const started = activeTopic.length > 0;
  const busy = status === "submitted" || status === "streaming";

  const visible = messages.filter((m) => messageText(m) !== OPENING_TRIGGER);
  const lastIsStreamingAssistant =
    status === "streaming" && visible.at(-1)?.role === "assistant";
  const thinking = busy && !lastIsStreamingAssistant;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  function startDebate(chosen: string) {
    const t = chosen.trim();
    if (!t) return;
    setTopic(t);
    setActiveTopic(t);
  }

  // Ask the model for its opening challenge as soon as a motion is chosen.
  useEffect(() => {
    if (!activeTopic) return;
    if (messages.length > 0) return;
    void sendMessage({ text: OPENING_TRIGGER });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTopic]);

  function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    void sendMessage({ text });
  }

  function finishDebate() {
    const transcript: StoredTranscript = {
      topic: activeTopic,
      turns: visible.map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("ai" as const),
        content: messageText(m),
      })),
    };
    try {
      sessionStorage.setItem(DEBATE_TRANSCRIPT_KEY, JSON.stringify(transcript));
    } catch {
      // storage unavailable — the result page falls back to a sample analysis
    }
    void navigate({ to: "/result" });
  }

  return (
    <AppShellRaw>

      <main className="mx-auto max-w-4xl px-5 pt-8">
        {!started ? (
          <section className="animate-rise">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Choose your motion</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Bring your own topic or pick one below. The AI will take the opposing side.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                startDebate(topic);
              }}
              className="glass mt-6 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row"
            >
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Should India cap UPSC attempts at two?"
                className="h-12 flex-1 bg-secondary/40"
              />
              <Button
                type="submit"
                className="h-12 bg-gradient-brand px-6 text-primary-foreground"
              >
                <Play className="mr-1 h-4 w-4" /> Start debate
              </Button>
            </form>

            <h2 className="mt-10 text-sm tracking-widest text-muted-foreground uppercase">
              Suggested topics
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {suggestedTopics.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => startDebate(t)}
                  className="glass hover-lift rounded-2xl px-5 py-4 text-left text-sm"
                >
                  <Sparkle className="mb-2 h-4 w-4 text-primary" />
                  {t}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="animate-rise">
            <div className="glass grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs tracking-widest text-muted-foreground uppercase">Motion</p>
                <h1 className="truncate text-base font-semibold">{activeTopic}</h1>
              </div>
              <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                Turn {Math.max(1, Math.ceil(visible.length / 2))}
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {visible.map((m) => (
                <div
                  key={m.id}
                  className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[85%] rounded-2xl rounded-br-md bg-primary px-5 py-3 text-sm leading-relaxed whitespace-pre-line text-primary-foreground"
                        : "max-w-[90%] rounded-2xl rounded-bl-md px-1 text-sm leading-relaxed whitespace-pre-line text-foreground"
                    }
                  >
                    {m.role === "assistant" && (
                      <p className="mb-2 text-xs font-semibold tracking-widest text-primary uppercase">
                        MindForge AI
                      </p>
                    )}
                    {messageText(m)}
                  </div>
                </div>
              ))}

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
                  Building a counter-argument...
                </div>
              )}
              {error && !busy && (
                <p className="px-1 text-sm text-destructive">
                  {error.message || "The AI could not respond. Please try again."}
                </p>
              )}
              <div ref={endRef} />
            </div>

            <form onSubmit={send} className="glass sticky bottom-4 mt-6 rounded-2xl p-4">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="State your position, then defend it..."
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
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  className="h-11 flex-1"
                  onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth" })}
                >
                  Continue Debate
                </Button>
                <Button
                  className="h-11 flex-1 bg-gradient-brand text-primary-foreground"
                  onClick={finishDebate}
                  disabled={busy}
                >
                  <Flag className="mr-1 h-4 w-4" /> Finish Debate
                </Button>
              </div>
            )}
          </section>
        )}
      </main>
    </AppShellRaw>
  );
}