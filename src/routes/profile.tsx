import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, Settings, Zap, Flame } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FloatingNav } from "@/components/mindforge/FloatingNav";
import { achievements, badges, profileUser, recentDebates } from "@/lib/mindforge-data";

const title = "Your Profile — MindForge";
const description =
  "Your rank, XP, badges, achievements and full debate history in one place.";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const xpPct = Math.round((profileUser.xp / profileUser.nextRankXp) * 100);

  return (
    <div className="min-h-screen pb-20">
      <FloatingNav />

      <main className="mx-auto max-w-6xl px-5 pt-10">
        <section className="glass rounded-3xl p-6 sm:p-8">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-brand font-display text-xl font-bold text-primary-foreground">
                AM
              </span>
              <div className="min-w-0">
                <h1 className="truncate font-display text-2xl font-bold">{profileUser.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {profileUser.handle} · {profileUser.rank}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="shrink-0">
              <Settings className="mr-1 h-4 w-4" /> Settings
            </Button>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-secondary/50 px-5 py-4">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-primary" /> XP
              </p>
              <p className="mt-1 font-display text-2xl font-bold">
                {profileUser.xp.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl bg-secondary/50 px-5 py-4">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Flame className="h-3.5 w-3.5 text-warning" /> Streak
              </p>
              <p className="mt-1 font-display text-2xl font-bold">{profileUser.streak} days</p>
            </div>
            <div className="rounded-2xl bg-secondary/50 px-5 py-4">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Award className="h-3.5 w-3.5 text-accent" /> Rank progress
              </p>
              <Progress value={xpPct} className="mt-3 h-2" />
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl font-bold">Badges</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {badges.map((b) => (
              <div key={b.name} className="glass hover-lift flex items-center gap-4 rounded-2xl p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-brand">
                  <Award className="h-5 w-5 text-primary-foreground" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{b.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{b.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-xl font-bold">Achievements</h2>
            <div className="mt-4 space-y-3">
              {achievements.map((a) => (
                <div key={a.name} className="glass rounded-2xl p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{a.name}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{a.date}</span>
                  </div>
                  <Progress value={a.progress} className="mt-3 h-2" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold">Debate history</h2>
            <div className="mt-4 space-y-3">
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
          </div>
        </section>
      </main>
    </div>
  );
}