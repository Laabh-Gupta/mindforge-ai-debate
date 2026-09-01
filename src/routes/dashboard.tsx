import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Trophy, Clock, Brain, Play, ArrowRight, Zap, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AppShell } from "@/components/mindforge/AppShell";
import { StatCard } from "@/components/mindforge/StatCard";
import { MODULE_NAV } from "@/lib/app-nav";
import { profileUser, recentDebates } from "@/lib/mindforge-data";
import { useAuthUser } from "@/hooks/use-auth-user";

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
  const { user } = useAuthUser();
  const firstName = user?.name.split(" ")[0] ?? "Guest";

  return (
    <AppShell
      width="wide"
      title={`Welcome back, ${firstName}`}
      subtitle={`You've held your streak for ${profileUser.streak} days. Don't break it today.`}
      actions={
        <span className="glass flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold">
          <Flame className="h-4 w-4 text-warning" /> {profileUser.streak}
        </span>
      }
    >
      <>
        <section className="glass rounded-3xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs tracking-widest text-muted-foreground uppercase">Daily goal</p>
              <p className="mt-1 text-sm">2 of 3 sessions complete</p>
            </div>
            <span className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-sm">
              <Target className="h-4 w-4 text-primary" /> 67%
            </span>
          </div>
          <Progress value={67} className="mt-4 h-2" />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
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
                  <Play className="mr-1 h-4 w-4" /> Continue session
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 flex-1">
                <Link to="/train">Quick start</Link>
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
          <StatCard icon={Trophy} label="Communication Score" value="81" hint="+6 vs last month" />
          <StatCard icon={Flame} label="Current Streak" value="12 days" hint="Best: 19 days" />
          <StatCard icon={Clock} label="Hours Practiced" value="27.5" hint="~35 min/day" />
        </section>

        <section className="glass mt-5 rounded-3xl p-6">
          <h2 className="font-display text-lg font-bold">Weekly progress</h2>
          <div className="mt-5 flex h-28 items-end gap-3">
            {[62, 48, 74, 81, 56, 90, 68].map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-lg bg-gradient-brand" style={{ height: `${v}%` }} />
                <span className="text-[11px] text-muted-foreground">
                  {["M", "T", "W", "T", "F", "S", "S"][i]}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold">Quick start</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MODULE_NAV.slice(0, 4).map((m) => (
              <Link key={m.to} to={m.to} className="glass hover-lift rounded-2xl p-5">
                <m.icon className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-semibold">{m.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{m.hint}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-2">
          <div className="glass rounded-3xl p-6">
            <h2 className="font-display text-lg font-bold">Recommended practice</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Listening is your weakest dimension this week. A group discussion round will stretch
              it the most.
            </p>
            <Button asChild variant="outline" className="mt-5 h-11">
              <Link to="/group-discussion">
                Start a GD <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="glass rounded-3xl p-6">
            <h2 className="font-display text-lg font-bold">Recent feedback</h2>
            <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
              <li>“Strong structure, but your evidence was asserted rather than sourced.”</li>
              <li>“You conceded a point you didn't need to — hold your anchor longer.”</li>
              <li>“Excellent opening frame; the close trailed off.”</li>
            </ul>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold">Recent activity</h2>
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
      </>
    </AppShell>
  );
}