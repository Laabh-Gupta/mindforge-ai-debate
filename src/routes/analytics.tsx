import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/mindforge/AppShell";
import { WeeklyPractice } from "@/components/mindforge/ProgressViews";
import { usePractice } from "@/components/mindforge/PracticeProvider";
import { computeProgress, calendarDay } from "@/lib/gamification";
import { DIMENSION_LABELS, EVALUATION_DIMENSIONS } from "@/lib/evaluation-shared";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { printReport } from "@/lib/session-export";
export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics | MindForge" }] }),
  component: AnalyticsPage,
});
function AnalyticsPage() {
  const { sessions } = usePractice();
  const [period, setPeriod] = useState("30");
  const cutoff = calendarDay(Date.now()) - Number(period) + 1;
  const pool = sessions.filter((s) => s.completedAt && calendarDay(s.completedAt) >= cutoff);
  const p = computeProgress(pool);
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const end = calendarDay(Date.now()) - i * 7;
    const subset = sessions.filter(
      (s) =>
        s.completedAt && calendarDay(s.completedAt) <= end && calendarDay(s.completedAt) > end - 7,
    );
    return {
      label: i === 0 ? "This week" : `${i} week${i > 1 ? "s" : ""} ago`,
      ...computeProgress(subset),
    };
  }).reverse();
  const report = [
    "MINDFORGE",
    "Weekly Communication Report",
    "",
    `Week ending ${new Date().toLocaleDateString()}`,
    `Sessions: ${weeks[3]!.total}`,
    `Practice time: ${Math.floor(weeks[3]!.seconds / 60)} minutes`,
    "",
    "SKILLS",
    ...EVALUATION_DIMENSIONS.map(
      (k) =>
        `${DIMENSION_LABELS[k]}: ${weeks[3]!.evaluated.length ? weeks[3]!.skills[k] : "Not rated"}`,
    ),
    "",
    "NEXT FOCUS",
    weeks[3]!.focusLabel,
    ...weeks[3]!.evaluated.slice(0, 3).flatMap((s) => s.evaluation?.suggestions ?? []),
  ].join("\n");
  return (
    <AppShell
      title="Analytics"
      subtitle="A record of the work you put in, and where to go next."
      width="wide"
      actions={
        <Button
          variant="outline"
          disabled={!weeks[3]!.total}
          onClick={() => printReport(report, "Weekly report")}
        >
          Weekly report
        </Button>
      }
    >
      <div className="mb-6">
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList>
            <TabsTrigger value="7">Last 7 days</TabsTrigger>
            <TabsTrigger value="30">Last 30 days</TabsTrigger>
            <TabsTrigger value="36500">All time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <WeeklyPractice />
        <section className="mf-panel p-6">
          <h2 className="font-medium">Practice summary</h2>
          <dl className="mt-6 grid grid-cols-2 gap-6">
            {[
              ["Sessions", p.total],
              ["Practice time", `${Math.floor(p.seconds / 60)} min`],
              ["Strongest skill", p.strongest ? DIMENSION_LABELS[p.strongest] : "Not rated"],
              ["Focus area", p.weakest ? DIMENSION_LABELS[p.weakest] : "Build your baseline"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="mt-2 text-lg font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-medium">Skill profile</h2>
        {p.evaluated.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EVALUATION_DIMENSIONS.filter((k) => k !== "overallPerformance").map((key) => (
              <div key={key} className="mf-panel p-5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{DIMENSION_LABELS[key]}</span>
                  <span>{p.skills[key]}</span>
                </div>
                <div className="mt-4 h-1 bg-secondary">
                  <div className="h-1 bg-primary/70" style={{ width: `${p.skills[key]}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mf-empty text-sm">
            Complete a session and receive a review to establish your skill profile.
          </p>
        )}
      </section>
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-medium">Readiness by activity</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Public speaking", modes: ["public-speaking", "extempore"] },
            { label: "Interview readiness", modes: ["interview"] },
            { label: "Group discussion", modes: ["group-discussion"] },
            { label: "Negotiation", modes: ["negotiation"] },
          ].map((activity) => {
            const rated = p.evaluated.filter((s) => activity.modes.includes(s.modeId));
            return (
              <div className="mf-panel p-5" key={activity.label}>
                <p className="text-sm text-muted-foreground">{activity.label}</p>
                <p className="mf-number mt-3 text-2xl">
                  {rated.length
                    ? Math.round(
                        rated.reduce((sum, s) => sum + s.evaluation!.scores.overallPerformance, 0) /
                          rated.length,
                      )
                    : "Not rated"}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {rated.length} reviewed sessions
                </p>
              </div>
            );
          })}
        </div>
      </section>
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-medium">Four-week trend</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {weeks.map((week) => (
            <div key={week.label} className="mf-panel p-5">
              <p className="text-sm text-muted-foreground">{week.label}</p>
              <p className="mf-number mt-4 text-3xl">{week.communication ?? "Not rated"}</p>
              <p className="mt-3 text-xs text-muted-foreground">{week.total} sessions</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Average communication score from evaluated sessions in each seven-day period.
        </p>
      </section>
    </AppShell>
  );
}
