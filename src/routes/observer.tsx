import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Eye, Play } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AppShellRaw } from "@/components/mindforge/AppShell";
import { SpeakerBubble } from "@/components/mindforge/SpeakerTurn";
import { SESSION_KEY, type StoredSession } from "@/lib/evaluation-shared";
import { generateObserverDiscussion } from "@/lib/session.functions";
import { observerMode } from "@/lib/training-modes";

const title = "Observer Mode — MindForge";
const description =
  "Watch six AI personalities discuss a topic, then prove you can spot leadership, fallacies and constructive contributions.";

export const Route = createFileRoute("/observer")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ObserverPage,
});

type Discussion = { turns: { speaker: string; content: string }[]; questions: string[] };

function ObserverPage() {
  const navigate = useNavigate();
  const generate = useServerFn(generateObserverDiscussion);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);

  async function start(chosen: string) {
    const value = chosen.trim();
    if (!value) return;
    setLoading(true);
    try {
      const result = (await generate({ data: { topic: value } })) as Discussion | null;
      if (!result) {
        toast.error("Could not generate the discussion. Try again.");
        return;
      }
      setTopic(value);
      setDiscussion(result);
      setAnswers(result.questions.map(() => ""));
    } finally {
      setLoading(false);
    }
  }

  function submit() {
    if (!discussion) return;
    const session: StoredSession = {
      modeId: observerMode.id,
      modeName: observerMode.name,
      topic,
      turns: discussion.turns.map((t) => ({
        speaker: t.speaker,
        role: "ai" as const,
        content: t.content,
      })),
      observerAnswers: discussion.questions.map((question, i) => ({
        question,
        answer: answers[i] ?? "",
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
      <main className="mx-auto max-w-4xl px-5 pt-10">
        {!discussion ? (
          <section className="animate-rise">
            <p className="text-xs tracking-widest text-primary uppercase">{observerMode.tagline}</p>
            <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
              {observerMode.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {observerMode.description}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void start(topic);
              }}
              className="glass mt-6 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row"
            >
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Should AI-generated art qualify for national awards?"
                aria-label="Discussion topic"
                className="h-12 flex-1 bg-secondary/40"
              />
              <Button
                type="submit"
                disabled={loading}
                className="h-12 bg-gradient-brand px-6 text-primary-foreground"
              >
                <Play className="mr-1 h-4 w-4" />
                {loading ? "Assembling the room..." : "Watch discussion"}
              </Button>
            </form>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {observerMode.presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => void start(p)}
                  className="glass hover-lift rounded-2xl px-5 py-4 text-left text-sm"
                >
                  <Eye className="mb-2 h-4 w-4 text-primary" />
                  {p}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="animate-rise">
            <div className="glass rounded-2xl px-5 py-4">
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                Discussion under observation
              </p>
              <h1 className="text-base font-semibold">{topic}</h1>
            </div>

            <div className="mt-6 space-y-5">
              {discussion.turns.map((t, i) => (
                <SpeakerBubble key={i} speaker={t.speaker} content={t.content} />
              ))}
            </div>

            <div className="glass mt-8 rounded-2xl p-6">
              <h2 className="text-base font-semibold">Now analyse what you saw</h2>
              <div className="mt-5 space-y-5">
                {discussion.questions.map((q, i) => (
                  <div key={q}>
                    <label className="text-sm font-medium" htmlFor={`obs-${i}`}>
                      {q}
                    </label>
                    <Textarea
                      id={`obs-${i}`}
                      rows={3}
                      value={answers[i] ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) =>
                          prev.map((a, index) => (index === i ? e.target.value : a)),
                        )
                      }
                      className="mt-2 resize-none bg-secondary/40"
                    />
                  </div>
                ))}
              </div>
              <Button
                className="mt-6 h-11 w-full bg-gradient-brand text-primary-foreground"
                onClick={submit}
              >
                Submit analysis
              </Button>
            </div>
          </section>
        )}
      </main>
    </AppShellRaw>
  );
}
