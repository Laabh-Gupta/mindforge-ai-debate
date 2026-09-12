import { useFlushSession } from "@/hooks/use-flush-session";
import { practiceSearch } from "@/lib/practice-types";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/mindforge/AppShell";
import { SpeakerBubble } from "@/components/mindforge/SpeakerTurn";
import { usePractice } from "@/components/mindforge/PracticeProvider";
import { generateObserverDiscussion } from "@/lib/session.functions";
import { observerMode } from "@/lib/training-modes";
import { canComplete, type PracticeSession } from "@/lib/practice-types";
import { useSessionClock } from "@/hooks/use-session-clock";
export const Route = createFileRoute("/observer")({
  validateSearch: practiceSearch,
  head: () => ({ meta: [{ title: "Observer Mode | MindForge" }] }),
  component: ObserverPage,
});
type Discussion = { turns: { speaker: string; content: string }[]; questions: string[] };
function ObserverPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const generate = generateObserverDiscussion;
  const { sessions, save, ready } = usePractice();
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [meta, setMeta] = useState<{ id: string; startedAt: number } | null>(null);
  const [elapsed, setElapsed] = useSessionClock(!!discussion);
  const finished = useRef(false);
  const resumable = sessions.find(
    (s) =>
      s.modeId === "observer" &&
      s.status === "active" &&
      (!search.resume || s.id === search.resume),
  );
  const snapshot = useRef<PracticeSession | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;
  const current: PracticeSession | null =
    meta && discussion
      ? {
          ...meta,
          modeId: "observer",
          modeName: "Observer Mode",
          topic,
          messages: [],
          status: "active",
          updatedAt: Date.now(),
          durationSeconds: elapsed,
          difficulty: "intermediate",
          profileId: "civil-services",
          turns: discussion.turns.map((t) => ({ ...t, role: "ai" })),
          observerAnswers: discussion.questions.map((question, i) => ({
            question,
            answer: answers[i] ?? "",
          })),
        }
      : null;
  snapshot.current = current;
  useEffect(() => {
    if (!current || finished.current) return;
    const timer = setTimeout(() => {
      if (snapshot.current && !finished.current) saveRef.current(snapshot.current);
    }, 400);
    return () => clearTimeout(timer);
  }, [discussion, answers, elapsed]);
  useFlushSession(snapshot, finished, saveRef);
  async function start() {
    if (!topic.trim() || loading || !ready) return;
    setLoading(true);
    try {
      const result = await generate({ data: { topic: topic.trim() } });
      if (!result) throw new Error();
      finished.current = false;
      setMeta({ id: crypto.randomUUID(), startedAt: Date.now() });
      setElapsed(0);
      setDiscussion(result);
      setAnswers(result.questions.map(() => ""));
    } catch {
      toast.error("The discussion could not be generated. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  function resume() {
    if (!resumable) return;
    setMeta({ id: resumable.id, startedAt: resumable.startedAt });
    setTopic(resumable.topic);
    setElapsed(resumable.durationSeconds);
    setDiscussion({
      turns: resumable.turns,
      questions: resumable.observerAnswers?.map((a) => a.question) ?? [],
    });
    setAnswers(resumable.observerAnswers?.map((a) => a.answer) ?? []);
    finished.current = false;
  }
  function submit() {
    if (!current || !canComplete(current)) return;
    finished.current = true;
    save({ ...current, status: "completed", completedAt: Date.now(), updatedAt: Date.now() });
    void navigate({ to: "/evaluation", search: { session: current.id } });
  }
  return (
    <AppShell
      title="Observer Mode"
      subtitle="Listen closely. Notice what moves the conversation forward."
      width="wide"
    >
      {!discussion ? (
        <>
          {resumable && (
            <div className="mf-panel mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
              <p className="text-sm">{resumable.topic}</p>
              <Button onClick={resume}>Resume session</Button>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void start();
            }}
            className="mf-panel p-6"
          >
            <label htmlFor="observer-topic" className="text-sm font-medium">
              Discussion topic
            </label>
            <Input
              disabled={!ready || loading}
              id="observer-topic"
              className="mt-3"
              value={topic}
              maxLength={3000}
              onChange={(e) => setTopic(e.target.value)}
              required
              placeholder="Choose a topic to observe"
            />
            <p className="mt-3 text-sm text-muted-foreground">
              Read a discussion between six AI participants, then analyse its arguments, leadership
              and listening.
            </p>
            <Button className="mt-5" disabled={loading || !topic.trim() || !ready}>
              {loading ? "Preparing the discussion…" : "Generate discussion"}
            </Button>
          </form>
          <div className="mt-5 flex flex-wrap gap-3">
            {observerMode.presets.map((p) => (
              <Button key={p} variant="outline" disabled={loading} onClick={() => setTopic(p)}>
                {p}
              </Button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2 className="mb-6 text-xl font-medium">{topic}</h2>
          <div className="mf-transcript space-y-4">
            {discussion.turns.map((t, i) => (
              <SpeakerBubble key={i} {...t} />
            ))}
          </div>
          <section className="mf-panel mt-8 p-6">
            <h2 className="text-lg font-medium">What did you notice?</h2>
            <div className="mt-6 space-y-5">
              {discussion.questions.map((q, i) => (
                <div key={q}>
                  <label htmlFor={`obs-${i}`} className="text-sm">
                    {q}
                  </label>
                  <Textarea
                    id={`obs-${i}`}
                    className="mt-3"
                    maxLength={12000}
                    value={answers[i] ?? ""}
                    onChange={(e) =>
                      setAnswers((previous) =>
                        previous.map((a, index) => (index === i ? e.target.value : a)),
                      )
                    }
                  />
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Write at least 20 words in total to receive a review.
            </p>
            <Button className="mt-5" disabled={!current || !canComplete(current)} onClick={submit}>
              Submit analysis
            </Button>
          </section>
        </>
      )}
    </AppShell>
  );
}
