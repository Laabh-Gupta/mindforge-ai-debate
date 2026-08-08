import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Lightbulb, TrendingDown, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AppShellRaw } from "@/components/mindforge/AppShell";
import { ScoreRing } from "@/components/mindforge/ScoreRing";
import { resultInsights, scoreBreakdown } from "@/lib/mindforge-data";
import { analyzeDebate, type DebateAnalysis } from "@/lib/debate-score.functions";
import { DEBATE_TRANSCRIPT_KEY, type StoredTranscript } from "@/services/ai-debate";

const title = "Debate Result — MindForge";
const description =
  "See your logic, evidence, clarity, confidence, bias and communication scores with fallacies found.";

export const Route = createFileRoute("/result")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ResultPage,
});

const sampleSummary =
  "Solid structure, thin evidence. Your reasoning held for nine turns before the counterpoint went unanswered.";

function toBreakdown(analysis: DebateAnalysis | null) {
  if (!analysis) return scoreBreakdown;
  const s = analysis.scores;
  return [
    { label: "Logic", value: s.logic },
    { label: "Evidence", value: s.evidence },
    { label: "Clarity", value: s.clarity },
    { label: "Confidence", value: s.confidence },
    { label: "Bias", value: s.bias },
    { label: "Communication", value: s.communication },
  ];
}

function InsightList({
  title: heading,
  icon: Icon,
  items,
  tone,
}: {
  title: string;
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

function ResultPage() {
  const runAnalysis = useServerFn(analyzeDebate);
  const [analysis, setAnalysis] = useState<DebateAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let stored: StoredTranscript | null = null;
    try {
      const raw = sessionStorage.getItem(DEBATE_TRANSCRIPT_KEY);
      stored = raw ? (JSON.parse(raw) as StoredTranscript) : null;
    } catch {
      stored = null;
    }
    if (!stored || stored.turns.length === 0) return;

    setLoading(true);
    void runAnalysis({ data: { topic: stored.topic, turns: stored.turns } })
      .then((result) => {
        if (!cancelled) setAnalysis(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [runAnalysis]);

  const breakdown = toBreakdown(analysis);
  const overall = Math.round(breakdown.reduce((sum, s) => sum + s.value, 0) / breakdown.length);
  const insights = analysis ?? resultInsights;

  return (
    <AppShellRaw>

      <main className="mx-auto max-w-6xl px-5 pt-10">
        <section className="glass animate-rise rounded-3xl p-6 text-center sm:p-10">
          <p className="text-xs tracking-widest text-muted-foreground uppercase">Overall score</p>
          <p className="mt-2 font-display text-6xl font-bold text-gradient">
            {loading ? "…" : overall}
          </p>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
            {loading
              ? "Reviewing your transcript..."
              : (analysis?.summary ?? sampleSummary)}
          </p>
        </section>

        <section className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
          {breakdown.map((s) => (
            <div key={s.label} className="glass rounded-2xl p-4">
              <ScoreRing label={s.label} value={s.value} size={110} />
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <InsightList
            title="Strengths"
            icon={CheckCircle2}
            items={insights.strengths}
            tone="text-success"
          />
          <InsightList
            title="Weaknesses"
            icon={TrendingDown}
            items={insights.weaknesses}
            tone="text-warning"
          />

          <div className="glass hover-lift rounded-2xl p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h3 className="text-base font-semibold">Logical Fallacies Found</h3>
            </div>
            <ul className="mt-4 space-y-3">
              {insights.fallacies.length === 0 && (
                <li className="text-sm text-muted-foreground">
                  No clear logical fallacies detected in this debate.
                </li>
              )}
              {insights.fallacies.map((f) => (
                <li key={f.name} className="rounded-xl bg-secondary/60 px-4 py-3">
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{f.detail}</p>
                </li>
              ))}
            </ul>
          </div>

          <InsightList
            title="Suggestions for Improvement"
            icon={Lightbulb}
            items={insights.suggestions}
            tone="text-primary"
          />
        </section>

        <div className="mt-10 flex justify-center">
          <Button asChild size="lg" className="h-12 bg-gradient-brand px-8 text-primary-foreground">
            <Link to="/debate">
              Next Challenge <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>
    </AppShellRaw>
  );
}