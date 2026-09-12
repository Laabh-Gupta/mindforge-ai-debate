import { createFileRoute } from "@tanstack/react-router";
import { Trophy, LockKeyhole, Check } from "lucide-react";
import { AppShell } from "@/components/mindforge/AppShell";
import { usePractice, useProgress } from "@/components/mindforge/PracticeProvider";
import { getAchievements } from "@/lib/gamification";
export const Route = createFileRoute("/achievements")({
  head: () => ({ meta: [{ title: "Achievements | MindForge" }] }),
  component: AchievementsPage,
});
function AchievementsPage() {
  const { sessions } = usePractice();
  const p = useProgress();
  const badges = getAchievements(sessions);
  return (
    <AppShell
      title="Achievements"
      subtitle="Small milestones. Earned through practice."
      width="wide"
    >
      <div className="mf-panel flex flex-wrap items-center justify-between gap-6 p-7">
        <div>
          <p className="text-sm text-muted-foreground">{p.rank}</p>
          <h2 className="mt-2 text-3xl font-medium">Level {p.level}</h2>
          <p className="mt-3 text-sm text-muted-foreground">{p.xpToNext} XP to the next level</p>
        </div>
        <div className="text-right">
          <p className="mf-number text-4xl">{p.xp.toLocaleString()} XP</p>
          <p className="mt-3 text-sm text-muted-foreground">
            {badges.filter((b) => b.unlocked).length} of {badges.length} milestones unlocked
          </p>
        </div>
      </div>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((b) => (
          <article key={b.id} className="mf-panel p-6">
            <div className="flex items-center justify-between">
              {b.unlocked ? (
                <Trophy className="size-6 text-primary" strokeWidth={1.5} />
              ) : (
                <LockKeyhole className="size-6 text-muted-foreground" strokeWidth={1.5} />
              )}
              <span className="text-xs text-muted-foreground">
                {b.unlocked ? (
                  <span className="flex items-center gap-1 text-primary">
                    <Check className="size-3" />
                    Unlocked
                  </span>
                ) : (
                  `${Math.min(b.value, b.target)} / ${b.target}`
                )}
              </span>
            </div>
            <h2 className="mt-5 text-lg font-medium">{b.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{b.detail}</p>
            <div className="mt-5 h-1 bg-secondary">
              <div className="h-1 bg-primary/70" style={{ width: `${b.percent}%` }} />
            </div>
          </article>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Each completed session earns 100 XP. Every 500 XP advances you one level. Re-scoring a
        session never awards extra XP.
      </p>
    </AppShell>
  );
}
