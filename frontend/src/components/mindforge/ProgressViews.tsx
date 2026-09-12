import { Link } from "@tanstack/react-router";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { usePractice, useProgress } from "./PracticeProvider";
import { modePath } from "@/lib/practice-types";
export function WeeklyPractice() {
  const p = useProgress();
  const max = Math.max(3, ...p.week.map((d) => d.count));
  return (
    <section className="mf-panel p-6">
      <div className="flex justify-between">
        <h2 className="font-medium">This week</h2>
        <span className="text-sm text-muted-foreground">
          {p.week.reduce((a, d) => a + d.count, 0)} sessions
        </span>
      </div>
      <div
        className="mt-6 grid grid-cols-7 gap-3"
        aria-label="Sessions completed over the last seven days"
      >
        {p.week.map((d) => (
          <div key={d.day} className="text-center">
            <div className="flex h-24 flex-col justify-end">
              <span className="mb-2 text-xs text-muted-foreground">{d.count}</span>
              <div
                className={`min-h-px rounded-t-sm ${d.count ? "bg-primary/70" : "bg-border"}`}
                style={{ height: `${(d.count / max) * 68}px` }}
              />
            </div>
            <span className="mt-3 block text-xs text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
export function SessionHistory({ limit, mode = "all" }: { limit?: number; mode?: string }) {
  const { sessions, ready } = usePractice();
  const filtered = sessions.filter((s) => mode === "all" || mode === s.modeId).slice(0, limit);
  if (!ready)
    return (
      <p className="mf-empty" role="status">
        Loading your practice…
      </p>
    );
  if (!filtered.length)
    return (
      <div className="mf-empty flex items-start gap-4">
        <BookOpen className="mt-1 size-5 shrink-0" />
        <div>
          <p className="font-medium text-foreground">No sessions yet</p>
          <p className="mt-1 text-sm">
            Your conversations and reviews will appear here after you begin.
          </p>
          <Link to="/train" className="mt-4 inline-block text-sm text-primary">
            Choose a training mode
          </Link>
        </div>
      </div>
    );
  return (
    <div className="divide-y divide-border border-y border-border">
      {filtered.map((s) => (
        <Link
          key={s.id}
          to={s.status === "completed" ? "/evaluation" : modePath(s.modeId)}
          search={s.status === "completed" ? { session: s.id } : { resume: s.id }}
          className="flex items-center gap-4 py-5 hover:bg-secondary/30"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{s.topic}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {s.modeName} ·{" "}
              {new Date(s.completedAt ?? s.updatedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="text-right">
            <span className="text-sm">
              {s.status === "active"
                ? "Resume"
                : s.evaluation
                  ? `${s.overall ?? s.evaluation.scores.overallPerformance}/100`
                  : "Review pending"}
            </span>
            <p className="text-xs text-muted-foreground">
              {Math.floor(s.durationSeconds / 60)} min
            </p>
          </div>
          <ArrowUpRight className="size-4 text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}
