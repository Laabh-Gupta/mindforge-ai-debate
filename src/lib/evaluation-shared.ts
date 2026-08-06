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
  /** Evaluation profile the session was finished with. */
  profileId?: string;
};

/** Dimensions that carry weight in a profile. The holistic score is derived, not weighted. */
export const WEIGHTED_DIMENSIONS = EVALUATION_DIMENSIONS.filter(
  (key) => key !== "overallPerformance",
) as Exclude<DimensionKey, "overallPerformance">[];

export type WeightedDimensionKey = (typeof WEIGHTED_DIMENSIONS)[number];

/** A named set of weights over the 15 dimensions. Weights are relative, 0-10. */
export type EvaluationProfile = {
  id: string;
  name: string;
  description: string;
  weights: Record<WeightedDimensionKey, number>;
};

/** One educational breakdown of a single AI turn, shown in the Thinking View. */
export type ThinkingSteps = {
  heard: string;
  move: string;
  moveWhy: string;
  principle: string;
  nextMove: string;
};

export const SESSION_KEY = "mindforge:last-session";
export const SKILLS_KEY = "mindforge:skills";
export const PROFILE_KEY = "mindforge:evaluation-profile";
export const CUSTOM_PROFILE_KEY = "mindforge:custom-profile";
export const THINKING_VIEW_KEY = "mindforge:thinking-view";