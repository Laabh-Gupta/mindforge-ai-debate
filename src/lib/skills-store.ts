import {
  DIMENSION_LABELS,
  SKILLS_KEY,
  type EvaluationProfile,
  type SessionEvaluation,
} from "./evaluation-shared";
import { applyProfile } from "./evaluation-profiles";

export type SkillRecord = {
  modeId: string;
  modeName: string;
  topic: string;
  at: number;
  overall: number;
  scores: SessionEvaluation["scores"];
};

/** The ten headline meters shown on the dashboard. */
export const DASHBOARD_SKILLS = [
  { key: "communicationIQ", label: "Communication IQ" },
  { key: "criticalThinking", label: DIMENSION_LABELS.criticalThinking },
  { key: "leadership", label: DIMENSION_LABELS.leadership },
  { key: "persuasion", label: DIMENSION_LABELS.persuasion },
  { key: "listening", label: DIMENSION_LABELS.listening },
  { key: "publicSpeaking", label: "Public Speaking" },
  { key: "interviewReadiness", label: "Interview Readiness" },
  { key: "confidence", label: DIMENSION_LABELS.confidence },
  { key: "vocabulary", label: DIMENSION_LABELS.vocabulary },
  { key: "logicalReasoning", label: "Reasoning" },
] as const;

export function readHistory(): SkillRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SKILLS_KEY);
    return raw ? (JSON.parse(raw) as SkillRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveRecord(record: SkillRecord) {
  if (typeof window === "undefined") return;
  try {
    const next = [record, ...readHistory()].slice(0, 40);
    window.localStorage.setItem(SKILLS_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — history is a convenience, not a requirement
  }
}

const avg = (values: number[]) =>
  values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;

/**
 * Aggregate the ten dashboard meters from stored session history.
 * Passing a profile reweights Communication IQ with the same engine the
 * evaluation page uses, so long-term meters match the selected profile.
 */
export function computeSkillProfile(history: SkillRecord[], profile?: EvaluationProfile) {
  const pick = (key: keyof SkillRecord["scores"], modeIds?: string[]) => {
    const pool = modeIds ? history.filter((h) => modeIds.includes(h.modeId)) : history;
    return avg(pool.map((h) => h.scores[key]));
  };

  return {
    communicationIQ: profile
      ? avg(history.map((h) => applyProfile(h.scores, profile).overall))
      : avg([
          pick("communication"),
          pick("clarity"),
          pick("criticalThinking"),
          pick("persuasion"),
        ]),
    criticalThinking: pick("criticalThinking"),
    leadership: pick("leadership"),
    persuasion: pick("persuasion"),
    listening: pick("listening"),
    publicSpeaking: pick("communication", ["public-speaking", "extempore"]),
    interviewReadiness: pick("overallPerformance", ["interview", "case-discussion"]),
    confidence: pick("confidence"),
    vocabulary: pick("vocabulary"),
    logicalReasoning: pick("logicalReasoning"),
  } as Record<(typeof DASHBOARD_SKILLS)[number]["key"], number>;
}