import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Mic, SendHorizontal, Sparkle, Flag, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FloatingNav } from "@/components/mindforge/FloatingNav";
import { suggestedTopics } from "@/lib/mindforge-data";
import {
  generateAiRebuttal,
  generateOpeningChallenge,
  type DebateMessage,
} from "@/services/ai-debate";

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

function DebateRoom() {
  const [topic, setTopic] = useState("");
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  function push(role: DebateMessage["role"], content: string) {
    setMessages((prev) => [
      ...prev,
      { id: `${role}-${prev.length}-${Date.now()}`, role, content, createdAt: Date.now() },
    ]);
  }

  async function startDebate(chosen: string) {
    const t = chosen.trim();
    if (!t) return;
    setTopic(t);
    setStarted(true);
    setThinking(true);
    const opening = await generateOpeningChallenge(t);
    setThinking(false);
    push("ai", opening);
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || thinking) return;
    push("user", text);
    setDraft("");
    setThinking(true);
    const reply = await generateAiRebuttal(text, messages.length);
    setThinking(false);
    push("ai", reply);
  }

  return (
    <div className="min-h-screen pb-10">
      <FloatingNav />

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
                void startDebate(topic);
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
                  onClick={() => void startDebate(t)}
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
                <h1 className="truncate text-base font-semibold">{topic}</h1>
              </div>
              <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                Turn {Math.ceil(messages.length / 2)}
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {messages.map((m) => (
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
                    {m.role === "ai" && (
                      <p className="mb-2 text-xs font-semibold tracking-widest text-primary uppercase">
                        MindForge AI
                      </p>
                    )}
                    {m.content}
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
                  disabled={thinking || !draft.trim()}
                  className="bg-gradient-brand text-primary-foreground"
                >
                  Send <SendHorizontal className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </form>

            {messages.length > 1 && (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  className="h-11 flex-1"
                  onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth" })}
                >
                  Continue Debate
                </Button>
                <Button
                  asChild
                  className="h-11 flex-1 bg-gradient-brand text-primary-foreground"
                >
                  <Link to="/result">
                    <Flag className="mr-1 h-4 w-4" /> Finish Debate
                  </Link>
                </Button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}