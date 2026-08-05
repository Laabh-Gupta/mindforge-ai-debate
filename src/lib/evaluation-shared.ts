export const EVALUATION_DIMENSIONS = [
  "criticalThinking",
  "communication",
  "leadership",
  "listening",
  "initiative",
  "teamwork",
  "confidence",
  "logicalReasoning",
  "relevance",
  "vocabulary",
  "clarity",
  "persuasion",
  "useOfExamples",
  "evidenceQuality",
  "overallPerformance",
] as const;

export type DimensionKey = (typeof EVALUATION_DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  criticalThinking: "Critical Thinking",
  communication: "Communication",
  leadership: "Leadership",
  listening: "Listening",
  initiative: "Initiative",
  teamwork: "Teamwork",
  confidence: "Confidence",
  logicalReasoning: "Logical Reasoning",
  relevance: "Relevance",
  vocabulary: "Vocabulary",
  clarity: "Clarity",
  persuasion: "Persuasion",
  useOfExamples: "Use of Examples",
  evidenceQuality: "Evidence Quality",
  overallPerformance: "Overall Performance",
};

export type SessionScores = Record<DimensionKey, number>;

export type SessionEvaluation = {
  summary: string;
  scores: SessionScores;
  strengths: string[];
  weaknesses: string[];
  fallacies: { name: string; detail: string }[];
  suggestions: string[];
};

export type StoredSession = {
  modeId: string;
  modeName: string;
  topic: string;
  variant?: string;
  turns: { speaker: string; role: "user" | "ai"; content: string }[];
  /** Observer mode carries the user's written analysis answers instead of turns. */
  observerAnswers?: { question: string; answer: string }[];
};

export const SESSION_KEY = "mindforge:last-session";
export const SKILLS_KEY = "mindforge:skills";