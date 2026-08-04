import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Trophy, Clock, Brain, Play, Plus, ArrowRight, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FloatingNav } from "@/components/mindforge/FloatingNav";
import { StatCard } from "@/components/mindforge/StatCard";
import { profileUser, recentDebates } from "@/lib/mindforge-data";

const title = "Dashboard — MindForge";
const description =
  "Track your streak, XP, logic scores and recent debates, then jump into today's challenge.";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const xpPct = Math.round((profileUser.xp / profileUser.nextRankXp) * 100);

  return (
    <div className="min-h-screen pb-20">
      <FloatingNav />

      <main className="mx-auto max-w-6xl px-5 pt-10">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold sm:text-3xl">
              Welcome back, {profileUser.name.split(" ")[0]}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              You've held your streak for {profileUser.streak} days. Don't break it today.
            </p>
          </div>
          <div className="glass flex shrink-0 items-center gap-2 rounded-full px-4 py-2">
            <Flame className="h-4 w-4 text-warning" />
            <span className="text-sm font-semibold">{profileUser.streak}</span>
          </div>
        </header>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <div className="glass rounded-3xl p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs tracking-widest text-muted-foreground uppercase">
                  Current level
                </p>
                <p className="mt-1 font-display text-3xl font-bold">
                  Level {profileUser.level} · {profileUser.rank}
                </p>
              </div>
              <span className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-sm">
                <Zap className="h-4 w-4 text-primary" /> {profileUser.xp.toLocaleString()} XP
              </span>
            </div>
            <Progress value={xpPct} className="mt-6 h-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              {profileUser.nextRankXp - profileUser.xp} XP to the next rank
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-11 flex-1 bg-gradient-brand text-primary-foreground">
                <Link to="/debate">
                  <Play className="mr-1 h-4 w-4" /> Continue Debate
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 flex-1">
                <Link to="/debate">
                  <Plus className="mr-1 h-4 w-4" /> Start New Debate
                </Link>
              </Button>
            </div>
          </div>

          <div className="glass hover-lift rounded-3xl p-6 sm:p-8">
            <p className="text-xs tracking-widest text-muted-foreground uppercase">
              Today's challenge
            </p>
            <h2 className="mt-3 text-lg font-semibold">
              "Should AI-generated content be labelled by law?"
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Hard difficulty · 10 minutes · +250 XP. You'll argue against a policy-heavy opponent.
            </p>
            <Button asChild variant="outline" className="mt-6 h-11 w-full">
              <Link to="/debate">
                Take the challenge <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Brain} label="Total Debates" value="62" hint="+4 this week" />
          <StatCard icon={Trophy} label="Avg Logic Score" value="81" hint="+6 vs last month" />
          <StatCard icon={Flame} label="Current Streak" value="12 days" hint="Best: 19 days" />
          <StatCard icon={Clock} label="Hours Practiced" value="27.5" hint="~35 min/day" />
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold">Recent debates</h2>
          <div className="mt-4 grid gap-3">
            {recentDebates.map((d) => (
              <Link
                key={d.topic}
                to="/result"
                className="glass hover-lift grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.topic}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {d.date} · {d.turns} turns
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-secondary px-3 py-1 font-display text-sm font-bold">
                  {d.score}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}