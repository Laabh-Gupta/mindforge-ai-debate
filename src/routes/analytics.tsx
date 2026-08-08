import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/mindforge/AppShell";
import { Progress } from "@/components/ui/progress";

const title = "Analytics — MindForge";
const description =
  "Weekly and monthly progress, improvement curves, skill radar and practice frequency across every training module.";

export const Route = createFileRoute("/analytics")({
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
  component: AnalyticsPage,
});

const WEEK = [
  { day: "Mon", value: 62 },
  { day: "Tue", value: 48 },
  { day: "Wed", value: 74 },
  { day: "Thu", value: 81 },
  { day: "Fri", value: 56 },
  { day: "Sat", value: 90 },
  { day: "Sun", value: 68 },
];

const SKILLS = [
  { label: "Critical Thinking", value: 82 },
  { label: "Communication", value: 76 },
  { label: "Leadership", value: 64 },
  { label: "Persuasion", value: 71 },
  { label: "Listening", value: 58 },
  { label: "Evidence Quality", value: 69 },
];

function AnalyticsPage() {
  return (
    <AppShell
      title="Analytics"
      subtitle="How your reasoning and delivery are trending over time."
      width="wide"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass rounded-3xl p-6">
          <h2 className="font-display text-lg font-bold">Weekly practice</h2>
          <div className="mt-6 flex h-40 items-end gap-3">
            {WEEK.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-lg bg-gradient-brand"
                  style={{ height: `${d.value}%` }}
                />
                <span className="text-[11px] text-muted-foreground">{d.day}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="glass rounded-3xl p-6">
          <h2 className="font-display text-lg font-bold">Skill radar</h2>
          <ul className="mt-5 space-y-4">
            {SKILLS.map((s) => (
              <li key={s.label}>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-medium">{s.value}</span>
                </div>
                <Progress value={s.value} className="mt-2 h-2" />
              </li>
            ))}
          </ul>
        </section>

        <section className="glass rounded-3xl p-6">
          <h2 className="font-display text-lg font-bold">Monthly improvement</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Overall score is up 14 points across the last four weeks.
          </p>
          <div className="mt-6 grid grid-cols-4 gap-3">
            {[58, 63, 69, 72].map((v, i) => (
              <div key={v} className="rounded-2xl bg-secondary/40 p-4 text-center">
                <p className="font-display text-2xl font-bold">{v}</p>
                <p className="text-[11px] text-muted-foreground">Week {i + 1}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="glass rounded-3xl p-6">
          <h2 className="font-display text-lg font-bold">Highlights</h2>
          <div className="mt-5 space-y-4 text-sm">
            <p>
              <span className="text-muted-foreground">Strongest skill:</span>{" "}
              <span className="font-medium">Critical Thinking</span>
            </p>
            <p>
              <span className="text-muted-foreground">Weakest skill:</span>{" "}
              <span className="font-medium">Listening</span>
            </p>
            <p>
              <span className="text-muted-foreground">Practice frequency:</span>{" "}
              <span className="font-medium">5 sessions / week</span>
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}