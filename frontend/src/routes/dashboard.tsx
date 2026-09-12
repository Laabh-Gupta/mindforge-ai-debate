import { dailyChallenge } from "@/lib/daily-challenge";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Play, Flame, Target, BookOpen } from "lucide-react";
import { AppShell } from "@/components/mindforge/AppShell";
import { Button } from "@/components/ui/button";
import { usePractice, useProgress } from "@/components/mindforge/PracticeProvider";
import { useAuthUser } from "@/hooks/use-auth-user";
import { MODULE_NAV } from "@/lib/app-nav";
import { modePath } from "@/lib/practice-types";
import { SessionHistory, WeeklyPractice } from "@/components/mindforge/ProgressViews";
import { getMode } from "@/lib/training-modes";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard | Argulab" }] }),
  component: Dashboard,
});
function Dashboard() {
  const { user } = useAuthUser();
  const { sessions, preferences, ready } = usePractice();
  const p = useProgress();
  const active = sessions.find((s) => s.status === "active");
  const name = (user?.name ?? preferences.guestName).split(" ")[0];
  const feedback = p.evaluated[0]?.evaluation;
  const challenge = dailyChallenge();
  const recommended = getMode(p.recommendedMode)!;
  return (
    <AppShell
      width="wide"
      title={name === "Guest" ? "Your practice starts here." : `Ready when you are, ${name}.`}
      subtitle="A little practice. A clearer point of view."
      actions={
        <Button asChild>
          <Link to="/train">
            Start a session <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-y-7 border-y border-border py-6 lg:grid-cols-4">
        {[
          { label: "Sessions completed", value: p.total, hint: `${p.debates} debates` },
          {
            label: "Communication",
            value: p.communication ?? "Not rated",
            hint: p.evaluated.length
              ? "Average across your reviews"
              : "Complete a session to get a score",
          },
          {
            label: "Practice time",
            value: `${(p.seconds / 3600).toFixed(1)} h`,
            hint: `${Math.floor(p.seconds / 60)} minutes of practice`,
          },
          {
            label: "Current streak",
            value: `${p.streak} days`,
            hint: `Personal best: ${p.bestStreak} days`,
          },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`min-w-0 ${i ? "lg:border-l lg:border-border lg:pl-7" : ""}`}
          >
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mf-number mt-3 text-3xl font-medium sm:text-4xl">
              {ready ? stat.value : "…"}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">{stat.hint}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(260px,1fr)]">
        <section className="mf-panel relative overflow-hidden p-6 sm:p-8">
          <div className="flex items-center gap-2 text-sm text-primary">
            <BookOpen className="size-4" />
            {active ? "Pick up where you left off" : "Make room for practice"}
          </div>
          <h2 className="mt-5 max-w-lg text-2xl font-medium sm:text-3xl">
            {active ? active.topic : "The next conversation is worth preparing for."}
          </h2>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            {active
              ? `${active.modeName}. Your conversation and settings are saved.`
              : "Choose a room, work through a real exchange, and leave with something specific to improve."}
          </p>
          <Button asChild className="mt-7">
            <Link
              to={active ? modePath(active.modeId) : "/interview"}
              search={active ? { resume: active.id } : {}}
            >
              <Play className="size-4" />
              {active ? "Resume last session" : "Practice an interview"}
            </Link>
          </Button>
          <p className="mt-5 text-xs text-muted-foreground">
            {user ? "Practice saved to your account" : "Guest practice is saved in this browser"}
          </p>
        </section>
        <section className="mf-panel flex flex-col p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Your daily goal</h2>
            <Target className="size-4 text-muted-foreground" />
          </div>
          <p className="mf-number mt-7 text-5xl font-medium">
            {p.todaySessions}
            <span className="ml-2 text-xl text-muted-foreground">/ {p.dailyGoal}</span>
          </p>
          <p className="mt-3 text-sm text-muted-foreground">Sessions completed today</p>
          <div
            className="mt-5 flex gap-1.5"
            role="progressbar"
            aria-label="Daily goal"
            aria-valuenow={p.dailyPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {Array.from({ length: p.dailyGoal }, (_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-sm ${i < p.todaySessions ? "bg-primary" : "bg-secondary"}`}
              />
            ))}
          </div>
          <div className="mt-auto flex items-center gap-2 pt-7 text-sm text-muted-foreground">
            <Flame className="size-4" />
            {p.streak
              ? `${p.streak}-day streak. Keep showing up.`
              : "Your first session starts your streak."}
          </div>
        </section>
      </div>
      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-medium">Find your room</h2>
          <Link to="/train" className="text-sm text-muted-foreground hover:text-foreground">
            All training modes <ArrowRight className="ml-1 inline size-4" />
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {MODULE_NAV.slice(0, 4).map((m) => (
            <Link
              key={m.to}
              to={m.to}
              className="group mf-panel p-5 transition-colors hover:border-primary/50"
            >
              <div className="flex justify-between">
                <m.icon className="size-5 text-muted-foreground" strokeWidth={1.5} />
                <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary" />
              </div>
              <h3 className="mt-5 text-sm font-medium">{m.label}</h3>
              <p className="mt-2 text-xs text-muted-foreground">{m.hint}</p>
            </Link>
          ))}
        </div>
      </section>
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(260px,1fr)]">
        <WeeklyPractice />
        <section className="mf-panel p-6">
          <p className="mf-label">Next focus</p>
          <h2 className="mt-3 text-xl font-medium">{p.focusLabel}</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            {feedback?.suggestions[0] ??
              "Start with one session. Your review will help you choose what to work on next."}
          </p>
          <Link
            to={modePath(recommended.id)}
            className="mt-6 inline-flex items-center gap-2 text-sm text-primary"
          >
            {recommended.name}
            <ArrowRight className="size-4" />
          </Link>
        </section>
      </div>
      <section className="mt-8 flex flex-wrap items-center justify-between gap-5 border-y border-border py-6">
        <div className="max-w-2xl">
          <p className="mf-label">Today’s challenge</p>
          <h2 className="mt-2 font-medium">{challenge.topic}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{challenge.task}</p>
        </div>
        <Button asChild variant="outline">
          <Link to={modePath(challenge.mode)} search={{ topic: challenge.topic }}>
            Try this challenge
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      </section>
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Recent practice</h2>
          <Link to="/profile" className="text-sm text-muted-foreground">
            View history
          </Link>
        </div>
        <SessionHistory limit={5} />
      </section>
    </AppShell>
  );
}
