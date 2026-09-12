import { describe, expect, test } from "bun:test";
import {
  computeProgress,
  calendarDay,
  adaptiveDifficulty,
  getAchievements,
} from "../../src/lib/gamification";
import { canComplete, type PracticeSession } from "../../src/lib/practice-types";
import {
  applyProfile,
  BALANCED_PROFILE,
  makeCustomProfile,
} from "../../src/lib/evaluation-profiles";
import { EVALUATION_DIMENSIONS, type SessionScores } from "../../src/lib/evaluation-shared";
import { ChatInput } from "../../src/lib/ai-request";
import { mergeSessions, PracticeSchema, migrateLegacyRecords } from "../../src/lib/practice-store";
import { incrementLocal } from "../../src/lib/request-security.server";
const now = new Date(2026, 8, 11, 12).getTime();
const scores = Object.fromEntries(EVALUATION_DIMENSIONS.map((k) => [k, 70])) as SessionScores;
function session(daysAgo = 0): PracticeSession {
  const at = new Date(2026, 8, 11 - daysAgo, 10).getTime();
  return {
    id: crypto.randomUUID(),
    modeId: "debate",
    modeName: "Debate",
    topic: "Public transport",
    startedAt: at - 600000,
    updatedAt: at,
    completedAt: at,
    durationSeconds: 600,
    status: "completed",
    difficulty: "beginner",
    messages: [],
    turns: [
      {
        speaker: "You",
        role: "user",
        content:
          "Public transport helps cities because it reduces traffic and gives people who cannot drive a practical way to access education and work.",
      },
    ],
    evaluation: {
      summary: "A clear position.",
      scores,
      strengths: [],
      weaknesses: [],
      suggestions: [],
      fallacies: [],
    },
  };
}
describe("real progress", () => {
  test("a new user has no progress or fabricated score", () => {
    const p = computeProgress([], now);
    expect([p.total, p.xp, p.streak, p.seconds, p.dailyPercent]).toEqual([0, 0, 0, 0, 0]);
    expect(p.level).toBe(1);
    expect(p.communication).toBeNull();
  });
  test("completion is counted once and daily goal caps at 100", () => {
    const p = computeProgress([session(), session(), session(), session()], now);
    expect(p.xp).toBe(400);
    expect(p.dailyPercent).toBe(100);
    expect(p.seconds).toBe(2400);
    expect(p.streak).toBe(1);
  });
  test("streak includes yesterday, excludes a gap and tracks the best run", () => {
    expect(computeProgress([session(1), session(2), session(3)], now).streak).toBe(3);
    const p = computeProgress([session(0), session(2), session(3), session(4)], now);
    expect(p.streak).toBe(1);
    expect(p.bestStreak).toBe(3);
    expect(computeProgress([session(2)], now).streak).toBe(0);
  });
  test("calendar math crosses month/year boundaries", () => {
    expect(
      calendarDay(new Date(2027, 0, 1, 1).getTime()) -
        calendarDay(new Date(2026, 11, 31, 23).getTime()),
    ).toBe(1);
  });
  test("drafts and future completions cannot award XP", () => {
    expect(computeProgress([{ ...session(), status: "active" }, session(-1)], now).xp).toBe(0);
  });
  test("five completed sessions advance one level", () => {
    expect(
      computeProgress(
        Array.from({ length: 5 }, () => session()),
        now,
      ).level,
    ).toBe(2);
  });
  test("rescoring does not change completion XP", () => {
    expect(computeProgress([session()], now).xp).toBe(
      computeProgress([{ ...session(), overall: 99 }], now).xp,
    );
  });
  test("adaptive difficulty needs enough actual reviews", () => {
    expect(adaptiveDifficulty([session()], "debate")).toBe("beginner");
    expect(adaptiveDifficulty([session(), session(), session()], "debate")).toBe("intermediate");
    expect(adaptiveDifficulty([session(), session(), session()], "interview")).toBe("beginner");
  });
  test("badges start locked and unlock from real counts", () => {
    expect(getAchievements([], now).every((b) => !b.unlocked)).toBe(true);
    expect(getAchievements([session()], now).find((b) => b.id === "first")?.unlocked).toBe(true);
  });
});
describe("session integrity", () => {
  test("completion requires actual user contributions, not AI text", () => {
    const s = session();
    expect(canComplete(s)).toBe(true);
    expect(canComplete({ ...s, turns: s.turns.map((t) => ({ ...t, role: "ai" })) })).toBe(false);
    expect(
      canComplete({ ...s, observerAnswers: [{ question: "Why?", answer: "Too short" }] }),
    ).toBe(false);
  });
  test("autosave merge keeps one record and never resurrects a completed session", () => {
    const original = session();
    const draft = { ...original, status: "active" as const, updatedAt: original.updatedAt + 100 };
    expect(mergeSessions([draft], [original])).toHaveLength(1);
    expect(mergeSessions([draft], [original])[0]!.status).toBe("completed");
  });
  test("corrupt cached data cannot enter the application", () => {
    expect(PracticeSchema.safeParse(session()).success).toBe(true);
    expect(PracticeSchema.safeParse({ ...session(), durationSeconds: -1 }).success).toBe(false);
    expect(PracticeSchema.safeParse({ ...session(), id: "not-an-id" }).success).toBe(false);
  });
  test("weighting reuses raw scores and handles zero weights", () => {
    const p = makeCustomProfile({ ...BALANCED_PROFILE.weights });
    Object.keys(p.weights).forEach((k) => {
      p.weights[k as keyof typeof p.weights] = 0;
    });
    p.weights.clarity = 10;
    expect(applyProfile({ ...scores, clarity: 93 }, p).overall).toBe(93);
    p.weights.clarity = 0;
    expect(applyProfile(scores, p).overall).toBe(70);
  });
});
describe("public AI boundary", () => {
  const valid = {
    topic: "Public transport",
    messages: [{ id: "one", role: "user", parts: [{ type: "text", text: "Hello" }] }],
  };
  test("accepts a bounded text conversation", () =>
    expect(ChatInput.safeParse(valid).success).toBe(true));
  test("rejects spoofed system messages, unsupported modes and tools", () => {
    expect(
      ChatInput.safeParse({ ...valid, messages: [{ ...valid.messages[0], role: "system" }] })
        .success,
    ).toBe(false);
    expect(ChatInput.safeParse({ ...valid, modeId: "unknown" }).success).toBe(false);
    expect(
      ChatInput.safeParse({
        ...valid,
        messages: [{ ...valid.messages[0], parts: [{ type: "tool-call" }] }],
      }).success,
    ).toBe(false);
  });
  test("rejects excessive input", () =>
    expect(ChatInput.safeParse({ ...valid, topic: "a".repeat(3001) }).success).toBe(false));
  test("rate windows deny over quota and reset after the window", () => {
    const key = crypto.randomUUID();
    expect(incrementLocal(key, 2, now)).toBe(true);
    expect(incrementLocal(key, 2, now)).toBe(true);
    expect(incrementLocal(key, 2, now)).toBe(false);
    expect(incrementLocal(key, 2, now + 3600001)).toBe(true);
  });
});

test("SDK step markers are stripped while assistant text survives", () => {
  const parsed = ChatInput.parse({
    topic: "Practice",
    messages: [
      {
        id: "a",
        role: "assistant",
        parts: [{ type: "step-start" }, { type: "text", text: "What is your position?" }],
      },
    ],
  });
  expect(parsed.messages[0]?.parts).toEqual([{ type: "text", text: "What is your position?" }]);
});
test("legacy migration imports only valid records and preserves unknown duration", () => {
  const rows = migrateLegacyRecords([
    {
      modeId: "debate",
      modeName: "Debate",
      topic: "Public transport",
      at: now,
      overall: 70,
      scores,
    },
    { broken: true },
  ]);
  expect(rows).toHaveLength(1);
  expect(rows[0]?.durationSeconds).toBe(0);
  expect(rows[0]?.turns).toEqual([]);
  expect(rows[0]?.evaluation?.scores).toEqual(scores);
});
