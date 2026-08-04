/** Shared debate types. The AI itself lives in /api/chat and debate-score.functions.ts. */

export type DebateRole = "user" | "ai";

export type DebateMessage = {
  id: string;
  role: DebateRole;
  content: string;
  createdAt: number;
};

export type DebateScore = {
  label: string;
  value: number;
};

export const DEBATE_TRANSCRIPT_KEY = "mindforge:last-debate";

export type StoredTranscript = {
  topic: string;
  turns: { role: DebateRole; content: string }[];
};