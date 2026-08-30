import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  RotateCcw,
  Sliders,
  TrendingDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { AppShellRaw } from "@/components/mindforge/AppShell";
import {
  DIMENSION_LABELS,
  SESSION_KEY,
  type EvaluationProfile,
  type SessionEvaluation,
  type StoredSession,
  type WeightedDimensionKey,
} from "@/lib/evaluation-shared";
import {
  BALANCED_PROFILE,
  CUSTOM_PROFILE_ID,
  PRESET_PROFILES,
  applyProfile,
  defaultProfileIdForMode,
  getProfile,
  loadCustomProfile,
  loadSelectedProfileId,
  makeCustomProfile,
  saveCustomProfile,
  saveSelectedProfileId,
} from "@/lib/evaluation-profiles";
import { evaluateSession } from "@/lib/session.functions";
import { saveRecord } from "@/lib/skills-store";

const title = "Session Evaluation — MindForge";
const description =
  "A fifteen-dimension evaluation of your session: critical thinking, communication, leadership, persuasion, evidence and more.";

export const Route = createFileRoute("/evaluation")({
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
  component: EvaluationPage,
});

function InsightList({
  heading,
  icon: Icon,
  items,
  tone,
}: {
  heading: string;
  icon: typeof CheckCircle2;
  items: string[];
  tone: string;
}) {
  return (
    <div className="glass hover-lift rounded-2xl p-6">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${tone}`} />
        <h3 className="text-base font-semibold">{heading}</h3>
      </div>
      <ul className="mt-4 space-y-3">
        {items.length === 0 && (
          <li className="text-sm text-muted-foreground">Nothing notable this session.</li>
        )}
        {items.map((i) => (
          <li key={i} className="flex gap-2 text-sm text-muted-foreground">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EvaluationPage() {
  const run = useServerFn(evaluateSession);
  const [session, setSession] = useState<StoredSession | null>(null);
  const [evaluation, setEvaluation] = useState<SessionEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string>(BALANCED_PROFILE.id);
  const [custom, setCustom] = useState<EvaluationProfile>(() =>
    makeCustomProfile(BALANCED_PROFILE.weights),
  );
  const [editingWeights, setEditingWeights] = useState(false);

  const profile = getProfile(profileId, custom);
  const result = useMemo(
    () => applyProfile(evaluation?.scores, profile),
    [evaluation, profile],
  );

  function selectProfile(id: string) {
    setProfileId(id);
    saveSelectedProfileId(id);
    if (id === CUSTOM_PROFILE_ID) setEditingWeights(true);
  }

  function setWeight(key: WeightedDimensionKey, value: number) {
    const next = makeCustomProfile({ ...custom.weights, [key]: value });
    setCustom(next);
    saveCustomProfile(next);
    if (profileId !== CUSTOM_PROFILE_ID) {
      setProfileId(CUSTOM_PROFILE_ID);
      saveSelectedProfileId(CUSTOM_PROFILE_ID);
    }
  }

  useEffect(() => {
    let cancelled = false;
    let stored: StoredSession | null = null;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      stored = raw ? (JSON.parse(raw) as StoredSession) : null;
    } catch {
      stored = null;
    }
    setSession(stored);
    setCustom(loadCustomProfile());
    setProfileId(
      stored?.profileId ?? loadSelectedProfileId(defaultProfileIdForMode(stored?.modeId)),
    );
    if (!stored) {
      setLoading(false);
      return;
    }

    void run({
      data: {
        modeId: stored.modeId,
        modeName: stored.modeName,
        topic: stored.topic,
        ...(stored.variant ? { variant: stored.variant } : {}),
        turns: stored.turns,
        ...(stored.observerAnswers ? { observerAnswers: stored.observerAnswers } : {}),
      },
    })
      .then((result) => {
        if (cancelled || !result) return;
        setEvaluation(result);
        void saveRecord({
          modeId: stored!.modeId,
          modeName: stored!.modeName,
          topic: stored!.topic,
          at: Date.now(),
          overall: result.scores.overallPerformance,
          scores: result.scores,
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [run]);

  if (!loading && !session) {
    return (
      <AppShellRaw>
        <main className="mx-auto max-w-2xl px-5 pt-20 text-center">
          <h1 className="font-display text-2xl font-bold">No session to evaluate yet</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Finish a training session and your evaluation will appear here.
          </p>
          <Button asChild className="mt-6 h-11 bg-gradient-brand px-6 text-primary-foreground">
            <Link to="/train">Go to the Training Hub</Link>
          </Button>
        </main>
    </AppShellRaw>
    );
  }

  return (
    <AppShellRaw>
      <main className="mx-auto max-w-6xl px-5 pt-10">
        <section className="glass animate-rise rounded-3xl p-6 text-center sm:p-10">
          <p className="text-xs tracking-widest text-muted-foreground uppercase">
            {session?.modeName ?? "Session"} · {profile.name} score
          </p>
          <p className="mt-2 font-display text-6xl font-bold text-gradient">
            {loading ? "…" : evaluation ? result.overall : "—"}
          </p>
          {!loading && evaluation && (
            <p className="mt-1 text-xs text-muted-foreground">
              Holistic read: {evaluation.scores.overallPerformance} · reweighted instantly, no
              re-run
            </p>
          )}
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            {loading
              ? "Reviewing your transcript..."
              : (evaluation?.summary ??
                "The evaluation could not be generated for this session. Please try again.")}
          </p>
          {!loading && evaluation && result.strongest && result.weakest && (
            <p className="mx-auto mt-4 max-w-xl text-sm">
              Under this profile your biggest lift is{" "}
              <span className="font-medium text-success">
                {DIMENSION_LABELS[result.strongest]}
              </span>{" "}
              and your biggest drag is{" "}
              <span className="font-medium text-warning">{DIMENSION_LABELS[result.weakest]}</span>.
            </p>
          )}
        </section>

        <section className="glass mt-6 rounded-3xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Evaluation profile</h2>
              <p className="mt-1 text-sm text-muted-foreground">{profile.description}</p>
            </div>
            <Button variant="outline" onClick={() => setEditingWeights((v) => !v)}>
              <Sliders className="mr-1 h-4 w-4" />
              {editingWeights ? "Hide weights" : "Customise weights"}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[...PRESET_PROFILES, custom].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectProfile(p.id)}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  profileId === p.id
                    ? "bg-gradient-brand text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {editingWeights && (
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {result.ranked.map((row) => (
                <div key={row.key}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span>{row.label}</span>
                    <span className="text-muted-foreground">
                      weight {custom.id === profile.id ? custom.weights[row.key] : row.weight}
                    </span>
                  </div>
                  <Slider
                    className="mt-2"
                    min={0}
                    max={10}
                    step={1}
                    value={[profile.weights[row.key]]}
                    onValueChange={([value]) => setWeight(row.key, value ?? 0)}
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    const reset = makeCustomProfile(BALANCED_PROFILE.weights);
                    setCustom(reset);
                    saveCustomProfile(reset);
                    selectProfile(CUSTOM_PROFILE_ID);
                  }}
                >
                  <RotateCcw className="mr-1 h-4 w-4" /> Reset custom weights
                </Button>
              </div>
            </div>
          )}

          {evaluation && (
            <div className="mt-6">
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                Same session, other profiles
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {PRESET_PROFILES.filter((p) => p.id !== profileId)
                  .slice(0, 3)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectProfile(p.id)}
                      className="rounded-2xl bg-secondary/60 px-4 py-3 text-left"
                    >
                      <span className="text-sm text-muted-foreground">{p.name}</span>
                      <p className="font-display text-2xl font-bold">
                        {applyProfile(evaluation.scores, p).overall}
                      </p>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.ranked.map((row) => (
            <div key={row.key} className="glass rounded-2xl p-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <span className="font-display text-xl font-bold">
                  {loading ? "…" : row.score}
                </span>
              </div>
              <Progress value={row.score} className="mt-3 h-2" />
              <p className="mt-2 text-xs text-muted-foreground">
                {row.weight === 0
                  ? "Not counted in this profile"
                  : `${Math.round(row.share * 100)}% of this profile's score`}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <InsightList
            heading="Strengths"
            icon={CheckCircle2}
            items={evaluation?.strengths ?? []}
            tone="text-success"
          />
          <InsightList
            heading="Weaknesses"
            icon={TrendingDown}
            items={evaluation?.weaknesses ?? []}
            tone="text-warning"
          />
          <div className="glass hover-lift rounded-2xl p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h3 className="text-base font-semibold">Logical fallacies found</h3>
            </div>
            <ul className="mt-4 space-y-3">
              {(evaluation?.fallacies.length ?? 0) === 0 && (
                <li className="text-sm text-muted-foreground">
                  No clear logical fallacies detected in your reasoning.
                </li>
              )}
              {evaluation?.fallacies.map((f) => (
                <li key={f.name} className="rounded-xl bg-secondary/60 px-4 py-3">
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{f.detail}</p>
                </li>
              ))}
            </ul>
          </div>
          <InsightList
            heading="Suggestions for improvement"
            icon={Lightbulb}
            items={evaluation?.suggestions ?? []}
            tone="text-primary"
          />
        </section>

        <div className="mt-10 flex justify-center">
          <Button asChild size="lg" className="h-12 bg-gradient-brand px-8 text-primary-foreground">
            <Link to="/train">
              Next session <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>
    </AppShellRaw>
  );
}
