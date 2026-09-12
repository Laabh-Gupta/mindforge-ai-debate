import { ConversationText } from "@/components/mindforge/ConversationText";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Lightbulb, RotateCcw, Sliders, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppShell } from "@/components/mindforge/AppShell";
import { ExportMenu } from "@/components/mindforge/ExportMenu";
import { usePractice } from "@/components/mindforge/PracticeProvider";
import {
  PRESET_PROFILES,
  BALANCED_PROFILE,
  CUSTOM_PROFILE_ID,
  applyProfile,
  getProfile,
  loadCustomProfile,
  makeCustomProfile,
  saveCustomProfile,
  sessionCustomProfile,
} from "@/lib/evaluation-profiles";
import { evaluateSession } from "@/lib/session.functions";
import type { SessionEvaluation, WeightedDimensionKey } from "@/lib/evaluation-shared";

export const Route = createFileRoute("/evaluation")({
  validateSearch: (search: Record<string, unknown>): { session?: string | undefined } => ({
    session: typeof search["session"] === "string" ? search["session"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Session review | Argulab" }] }),
  component: EvaluationPage,
});
const inFlight = new Map<string, Promise<SessionEvaluation | null>>();
function EvaluationPage() {
  const { session: requestedId } = Route.useSearch();
  const { sessions, ready, save, owner } = usePractice();
  const run = evaluateSession;
  const session = requestedId
    ? sessions.find((s) => s.id === requestedId)
    : sessions.find((s) => s.status === "completed");
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [custom, setCustom] = useState(() => makeCustomProfile(BALANCED_PROFILE.weights));
  const [profileId, setProfileId] = useState(BALANCED_PROFILE.id);
  const [editing, setEditing] = useState(false);
  const saveRef = useRef(save);
  saveRef.current = save;
  const profile = getProfile(profileId, custom);
  const result = applyProfile(session?.evaluation?.scores, profile);
  useEffect(() => {
    setCustom(loadCustomProfile());
  }, []);
  useEffect(() => {
    setProfileId(session?.profileId ?? BALANCED_PROFILE.id);
    setCustom(sessionCustomProfile(session?.extra));
    setLoading(false);
    setFailure(null);
  }, [session?.id]);
  useEffect(() => {
    if (!ready || !session || session.status !== "completed" || session.evaluation) return;
    let cancelled = false;
    setLoading(true);
    setFailure(null);
    const key = `${owner}:${session.id}`;
    let pending = inFlight.get(key);
    if (!pending) {
      pending = run({
        data: {
          modeId: session.modeId,
          modeName: session.modeName,
          topic: session.topic,
          variant: session.variant,
          turns: session.turns,
          observerAnswers: session.observerAnswers,
        },
      });
      inFlight.set(key, pending);
    }
    void pending
      .then((evaluation) => {
        if (cancelled) return;
        if (!evaluation) {
          setFailure("The review could not be generated. Please try again.");
          return;
        }
        const weighted = applyProfile(
          evaluation.scores,
          getProfile(session.profileId ?? BALANCED_PROFILE.id, sessionCustomProfile(session.extra)),
        );
        saveRef.current({
          ...session,
          evaluation,
          overall: weighted.overall,
          extra: {
            ...session.extra,
            evaluationWeights: getProfile(
              session.profileId ?? BALANCED_PROFILE.id,
              sessionCustomProfile(session.extra),
            ).weights,
          },
          updatedAt: Date.now(),
        });
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setFailure(
            error instanceof Error
              ? error.message
              : "The review could not be generated. Please try again.",
          );
      })
      .finally(() => {
        inFlight.delete(key);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.id, ready, owner, run, attempt]);

  function setWeight(key: WeightedDimensionKey, value: number) {
    const next = makeCustomProfile({ ...profile.weights, [key]: value });
    setCustom(next);
    saveCustomProfile(next);
    setProfileId(CUSTOM_PROFILE_ID);
  }
  function applyWeights() {
    if (!session?.evaluation) return;
    if (!Object.values(profile.weights).some((w) => w > 0)) {
      toast.error("Give at least one dimension a non-zero weight.");
      return;
    }
    save({
      ...session,
      profileId,
      overall: result.overall,
      extra: { ...session.extra, evaluationWeights: profile.weights },
      updatedAt: Date.now(),
    });
    toast.success("Scoring updated. Your session and XP stay the same.");
  }
  if (!ready)
    return (
      <AppShell title="Session review">
        <p role="status">Loading your saved session…</p>
      </AppShell>
    );
  if (!session || session.status !== "completed")
    return (
      <AppShell title="Session review">
        <div className="mf-empty">
          <h2 className="text-lg text-foreground">No completed session here yet</h2>
          <p className="mt-2 text-sm">Complete a practice session to receive your review.</p>
          <Button asChild className="mt-5">
            <Link to="/train">Choose a training mode</Link>
          </Button>
        </div>
      </AppShell>
    );
  const evaluation = session.evaluation;
  return (
    <AppShell
      title="Session review"
      subtitle={session.topic}
      width="wide"
      actions={
        <ExportMenu
          session={{
            ...session,
            ...(evaluation ? { overall: result.overall } : {}),
            profileId,
            extra: { ...session.extra, evaluationWeights: profile.weights },
          }}
        />
      }
    >
      <section className="mf-panel grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
        <div className="sm:pr-8">
          <p className="text-sm text-muted-foreground">{profile.name} score</p>
          <p className="mf-number mt-3 text-6xl font-medium text-primary">
            {evaluation ? result.overall : loading ? "…" : "Not rated"}
          </p>
          {evaluation && <p className="mt-3 text-xs text-muted-foreground">out of 100</p>}
        </div>
        <div>
          <p className="mf-label">{session.modeName}</p>
          <h2 className="mt-3 text-lg font-medium">
            {loading
              ? "Reviewing your conversation"
              : evaluation
                ? "What to take into your next conversation"
                : "Your session is saved"}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            {evaluation?.summary ??
              (loading
                ? "Your review will appear here shortly. You can return to this page later."
                : (failure ??
                  "The review could not be generated. Retry when the AI service is available."))}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            {Math.floor(session.durationSeconds / 60)} minutes of practice · 100 XP earned
          </p>
          {failure && !loading && (
            <Button className="mt-4" variant="outline" onClick={() => setAttempt((n) => n + 1)}>
              <RotateCcw className="size-4" />
              Retry review
            </Button>
          )}
        </div>
      </section>
      {evaluation && (
        <>
          <section className="mt-7 border-y border-border py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-medium">Score what matters to you</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Change the weighting without repeating the conversation.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={profileId} onValueChange={setProfileId}>
                  <SelectTrigger className="w-48" aria-label="Evaluation profile">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...PRESET_PROFILES, custom].map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => setEditing((v) => !v)}>
                  <Sliders className="size-4" />
                  {editing ? "Hide weights" : "Customise weights"}
                </Button>
                <Button onClick={applyWeights}>Re-run scoring</Button>
              </div>
            </div>
            {editing && (
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {result.ranked.map((row) => (
                  <div key={row.key}>
                    <div className="mb-3 flex justify-between text-sm">
                      <label id={`weight-${row.key}`}>{row.label}</label>
                      <span className="text-muted-foreground">{Math.round(row.share * 100)}%</span>
                    </div>
                    <Slider
                      aria-labelledby={`weight-${row.key}`}
                      min={0}
                      max={10}
                      step={1}
                      value={[profile.weights[row.key]]}
                      onValueChange={([v]) => setWeight(row.key, v ?? 0)}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.ranked
              .filter((r) => r.weight > 0)
              .map((row) => (
                <div key={row.key} className="mf-panel p-5">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium">{row.score}</span>
                  </div>
                  <div className="mt-4 h-1 rounded-full bg-secondary">
                    <div
                      className="h-1 rounded-full bg-primary/70"
                      style={{ width: `${row.score}%` }}
                    />
                  </div>
                </div>
              ))}
          </section>
          <p className="mt-4 text-xs text-muted-foreground">
            Scores are coaching estimates from your text. Vocal confidence, pronunciation, and
            delivery are not measured.
          </p>
          <section className="mt-8 grid gap-5 sm:grid-cols-2">
            {[
              { title: "Strengths", icon: CheckCircle2, items: evaluation.strengths },
              { title: "Areas to improve", icon: Lightbulb, items: evaluation.weaknesses },
              { title: "Next practice", icon: RotateCcw, items: evaluation.suggestions },
              {
                title: "Reasoning to revisit",
                icon: AlertTriangle,
                items: evaluation.fallacies.map((f) => `${f.name}: ${f.detail}`),
              },
            ].map((block) => (
              <div key={block.title} className="mf-panel p-6">
                <h2 className="flex items-center gap-2 font-medium">
                  <block.icon className="size-4 text-primary" />
                  {block.title}
                </h2>
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                  {block.items.length ? (
                    block.items.map((item) => <li key={item}>{item}</li>)
                  ) : (
                    <li>None identified in this review.</li>
                  )}
                </ul>
              </div>
            ))}
          </section>
        </>
      )}
      {evaluation?.details && (
        <>
          <section className="mt-8">
            <h2 className="text-lg font-medium">A closer look</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                { label: "Key claims", text: evaluation.details.keyClaims.join(" ") },
                {
                  label: "Supporting evidence",
                  text:
                    evaluation.details.supportingEvidence.join(" ") ||
                    "No supporting evidence identified.",
                },
                { label: "Strongest contribution", text: evaluation.details.strongestContribution },
                {
                  label: "Contribution to strengthen",
                  text: evaluation.details.weakestContribution,
                },
                { label: "Best counterargument", text: evaluation.details.bestCounterargument },
                {
                  label: "Missed opportunities",
                  text: evaluation.details.missedOpportunities.join(" "),
                },
              ].map((item) => (
                <article key={item.label} className="mf-panel p-6">
                  <h3 className="text-sm font-medium">{item.label}</h3>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {item.text || "None identified."}
                  </p>
                </article>
              ))}
            </div>
          </section>
          {evaluation.details.answers.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-medium">Question by question</h2>
              <div className="mt-4 space-y-4">
                {evaluation.details.answers.map((answer, i) => (
                  <article key={i} className="mf-panel p-6">
                    <h3 className="font-medium">{answer.question}</h3>
                    <p className="mt-3 text-sm text-muted-foreground">{answer.assessment}</p>
                    <p className="mt-3 text-sm">{answer.improvement}</p>
                  </article>
                ))}
              </div>
            </section>
          )}
          <section className="mt-8 border-y border-border py-6">
            <p className="mf-label">Next practice topic</p>
            <p className="mt-3">{evaluation.details.recommendedTopic}</p>
          </section>
        </>
      )}
      <section className="mt-10">
        <h2 className="mb-5 text-lg font-medium">Your conversation</h2>
        <div className="mf-transcript space-y-4">
          {session.turns.map((t, i) => (
            <article key={i} className="mf-panel p-5">
              <h3 className="mb-2 text-sm font-medium text-primary">{t.speaker}</h3>
              <div className="text-sm leading-relaxed">
                <ConversationText text={t.content} />
              </div>
            </article>
          ))}
          {session.observerAnswers?.map((a) => (
            <article key={a.question} className="mf-panel p-5">
              <h3 className="text-sm font-medium">{a.question}</h3>
              <p className="mt-3 text-sm">{a.answer || "Unanswered"}</p>
            </article>
          ))}
        </div>
      </section>
      <Button asChild className="mt-8">
        <Link to="/train">Start another session</Link>
      </Button>
    </AppShell>
  );
}
