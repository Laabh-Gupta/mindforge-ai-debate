import type { UIMessage } from "ai";
import type { SessionEvaluation, StoredSession } from "./evaluation-shared";

export type Difficulty = "adaptive" | "beginner" | "intermediate" | "advanced";
export type PracticeSession = StoredSession & {
  id: string;
  startedAt: number;
  updatedAt: number;
  completedAt?: number;
  durationSeconds: number;
  status: "active" | "completed";
  difficulty: Difficulty;
  messages: UIMessage[];
  draft?: string;
  phase?: "prep" | "live";
  remainingSeconds?: number;
  userRole?: string;
  evidenceType?: string;
  evaluation?: SessionEvaluation;
  overall?: number;
  extra?: Record<string, unknown>;
};

export const PRACTICE_EVENT = "mindforge:practice-changed";
export const modePath = (id: string) => (id === "real-world-simulation" ? "/simulation" : `/${id}`);
export const wordCount = (text: string) => text.trim().split(/\s+/u).filter(Boolean).length;
export function contributionWords(session: StoredSession) {
  return wordCount(
    session.observerAnswers
      ? session.observerAnswers.map((a) => a.answer).join(" ")
      : session.turns
          .filter((t) => t.role === "user")
          .map((t) => t.content)
          .join(" "),
  );
}
export const canComplete = (session: StoredSession) => contributionWords(session) >= 20;

export function practiceSearch(search: Record<string, unknown>): {
  resume?: string | undefined;
  topic?: string | undefined;
} {
  return {
    resume:
      typeof search["resume"] === "string" && /^[0-9a-f-]{36}$/.test(search["resume"])
        ? search["resume"]
        : undefined,
    topic: typeof search["topic"] === "string" ? search["topic"].slice(0, 3000) : undefined,
  };
}
