import { createFileRoute } from "@tanstack/react-router";
import { Flame, Trophy, Zap, Target } from "lucide-react";

import { AppShell } from "@/components/mindforge/AppShell";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/mindforge/StatCard";

const title = "Achievements — MindForge";
const description =
  "Badges, XP, levels, daily streaks and milestones you've unlocked while training on MindForge.";

export const Route = createFileRoute("/achievements")({
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
  component: AchievementsPage,
});

const BADGES = [
  { name: "First Rebuttal", detail: "Survived your first counterargument", earned: true },
  { name: "Fallacy Hunter", detail: "Spotted 10 fallacies in Observer Mode", earned: true },
  { name: "Panel Presence", detail: "Led a group discussion round", earned: true },
  { name: "Cool Head", detail: "Closed a tough negotiation", earned: false },
  { name: "Stage Ready", detail: "Scored 85+ in Public Speaking", earned: false },
  { name: "Case Cracker", detail: "Defended 5 case recommendations", earned: false },
];

function AchievementsPage() {
  return (
    <AppShell title="Achievements" subtitle="Badges, levels and milestones." width="wide">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Zap} label="XP" value="4,820" hint="Analyst III" />
        <StatCard icon={Flame} label="Streak" value="12 days" hint="Personal best: 19" />
        <StatCard icon={Trophy} label="Badges" value="3 / 6" hint="Half way there" />
        <StatCard icon={Target} label="Milestones" value="7" hint="Across all modules" />
      </div>

      <section className="glass mt-6 rounded-3xl p-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Level 12 → Level 13</span>
          <span className="font-medium">4,820 / 6,000 XP</span>
        </div>
        <Progress value={80} className="mt-3 h-2" />
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BADGES.map((b) => (
          <article
            key={b.name}
            className={`glass rounded-3xl p-6 ${b.earned ? "" : "opacity-50"}`}
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-brand">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </span>
            <h2 className="mt-4 text-base font-semibold">{b.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{b.detail}</p>
            <p className="mt-3 text-xs text-primary uppercase">
              {b.earned ? "Unlocked" : "Locked"}
            </p>
          </article>
        ))}
      </section>
    </AppShell>
  );
}