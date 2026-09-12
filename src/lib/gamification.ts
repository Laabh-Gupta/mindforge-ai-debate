import type { PracticeSession } from "./practice-types";
import { EVALUATION_DIMENSIONS, DIMENSION_LABELS } from "./evaluation-shared";

/** Calendar ordinals avoid 23/25-hour daylight-saving days breaking a streak. */
export function calendarDay(at: number) {
  const d = new Date(at);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
}
export const average = (values: number[]) =>
  values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;

export function computeProgress(sessions: PracticeSession[], now = Date.now(), dailyGoal = 3) {
  const completed = sessions
    .filter((s) => s.status === "completed" && s.completedAt && s.completedAt <= now)
    .sort((a, b) => b.completedAt! - a.completedAt!);
  const evaluated = completed.filter((s) => s.evaluation);
  const today = calendarDay(now);
  const days = [...new Set(completed.map((s) => calendarDay(s.completedAt!)))].sort(
    (a, b) => a - b,
  );
  let bestStreak = 0;
  let run = 0;
  days.forEach((day, i) => {
    run = i && day === days[i - 1]! + 1 ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
  });
  let streak = 0;
  let cursor = days.includes(today) ? today : today - 1;
  const daySet = new Set(days);
  while (daySet.has(cursor--)) streak++;
  const todaySessions = completed.filter((s) => calendarDay(s.completedAt!) === today).length;
  // Completion XP is fixed so changing weights or retrying a review never farms XP.
  const xp = completed.length * 100;
  const level = Math.floor(xp / 500) + 1;
  const skills = Object.fromEntries(
    EVALUATION_DIMENSIONS.map((key) => [
      key,
      average(evaluated.map((s) => s.evaluation!.scores[key])),
    ]),
  );
  const ranked = EVALUATION_DIMENSIONS.filter((key) => key !== "overallPerformance").sort(
    (a, b) => skills[b]! - skills[a]!,
  );
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = today - 6 + i;
    const date = new Date(now);
    date.setDate(date.getDate() - 6 + i);
    const pool = completed.filter((s) => calendarDay(s.completedAt!) === day);
    return {
      day,
      label: date.toLocaleDateString("en", { weekday: "short" }),
      count: pool.length,
      seconds: pool.reduce((sum, s) => sum + s.durationSeconds, 0),
    };
  });
  const weakest = evaluated.length ? ranked.at(-1)! : null;
  return {
    completed,
    evaluated,
    total: completed.length,
    debates: completed.filter((s) => s.modeId === "debate").length,
    xp,
    level,
    rank:
      level < 3
        ? "Foundation"
        : level < 6
          ? "Practitioner"
          : level < 10
            ? "Communicator"
            : "Strategist",
    levelProgress: (xp % 500) / 5,
    xpToNext: 500 - (xp % 500),
    streak,
    bestStreak,
    todaySessions,
    dailyGoal,
    dailyPercent: Math.min(100, Math.round((todaySessions / Math.max(1, dailyGoal)) * 100)),
    seconds: completed.reduce((sum, s) => sum + s.durationSeconds, 0),
    communication: evaluated.length
      ? average(evaluated.map((s) => s.evaluation!.scores.communication))
      : null,
    skills,
    week,
    weakest,
    strongest: evaluated.length ? ranked[0]! : null,
    recommendedMode:
      weakest && ["leadership", "listening", "teamwork"].includes(weakest)
        ? "group-discussion"
        : weakest && ["confidence", "clarity", "vocabulary"].includes(weakest)
          ? "public-speaking"
          : "debate",
    focusLabel: weakest ? DIMENSION_LABELS[weakest] : "Build your baseline",
  };
}

export function getAchievements(sessions: PracticeSession[], now = Date.now()) {
  const p = computeProgress(sessions, now);
  const count = (mode: string) => p.completed.filter((s) => s.modeId === mode).length;
  return [
    {
      id: "first",
      title: "First step",
      detail: "Complete your first practice session",
      target: 1,
      value: p.total,
    },
    {
      id: "debate",
      title: "Make your case",
      detail: "Complete your first debate",
      target: 1,
      value: count("debate"),
    },
    {
      id: "week",
      title: "Show up",
      detail: "Practice on seven consecutive days",
      target: 7,
      value: p.bestStreak,
    },
    {
      id: "interviews",
      title: "Interview ready",
      detail: "Complete ten interviews",
      target: 10,
      value: count("interview"),
    },
    {
      id: "explorer",
      title: "Change the room",
      detail: "Complete five different training modes",
      target: 5,
      value: new Set(p.completed.map((s) => s.modeId)).size,
    },
    {
      id: "thinker",
      title: "Critical thinker",
      detail: "Earn 80+ in critical thinking in three reviews",
      target: 3,
      value: p.evaluated.filter((s) => s.evaluation!.scores.criticalThinking >= 80).length,
    },
    {
      id: "evidence",
      title: "Back it up",
      detail: "Earn 80+ in evidence quality in three reviews",
      target: 3,
      value: p.evaluated.filter((s) => s.evaluation!.scores.evidenceQuality >= 80).length,
    },
    {
      id: "leader",
      title: "Bring the room together",
      detail: "Earn 80+ in leadership in a group discussion",
      target: 1,
      value: p.evaluated.filter(
        (s) => s.modeId === "group-discussion" && s.evaluation!.scores.leadership >= 80,
      ).length,
    },
    {
      id: "fifty",
      title: "Practice becomes habit",
      detail: "Complete fifty sessions",
      target: 50,
      value: p.total,
    },
  ].map((a) => ({
    ...a,
    unlocked: a.value >= a.target,
    percent: Math.min(100, Math.round((a.value / a.target) * 100)),
  }));
}

export function adaptiveDifficulty(sessions: PracticeSession[], modeId: string) {
  const recent = sessions
    .filter((s) => s.modeId === modeId && s.status === "completed" && s.evaluation)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
    .slice(0, 5);
  if (recent.length < 3) return "beginner" as const;
  const score = average(recent.map((s) => s.evaluation!.scores.overallPerformance));
  return score >= 78
    ? ("advanced" as const)
    : score >= 55
      ? ("intermediate" as const)
      : ("beginner" as const);
}
