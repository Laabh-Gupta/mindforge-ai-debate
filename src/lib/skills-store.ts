import { getSupabaseBrowserClient } from "./supabase-browser";
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

const HISTORY_LIMIT = 40;

// ---- localStorage fallback (used whenever no one is signed in) ----

function readLocalHistory(): SkillRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SKILLS_KEY);
    return raw ? (JSON.parse(raw) as SkillRecord[]) : [];
  } catch {
    return [];
  }
}

function saveLocalRecord(record: SkillRecord) {
  if (typeof window === "undefined") return;
  try {
    const next = [record, ...readLocalHistory()].slice(0, HISTORY_LIMIT);
    window.localStorage.setItem(SKILLS_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — history is a convenience, not a requirement
  }
}

// ---- Supabase-backed history (used once a user is signed in) ----

type SkillRow = {
  mode_id: string;
  mode_name: string;
  topic: string;
  created_at: string;
  overall: number;
  scores: SessionEvaluation["scores"];
};

function fromRow(row: SkillRow): SkillRecord {
  return {
    modeId: row.mode_id,
    modeName: row.mode_name,
    topic: row.topic,
    at: new Date(row.created_at).getTime(),
    overall: row.overall,
    scores: row.scores,
  };
}

/**
 * Reads recent session history. Reads from Supabase when signed in, and
 * falls back to the local device history for guests (or if Supabase isn't
 * configured / the request fails) so the app still works offline.
 */
export async function readHistory(): Promise<SkillRecord[]> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return readLocalHistory();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return readLocalHistory();

  const { data, error } = await supabase
    .from("skill_records")
    .select("mode_id, mode_name, topic, created_at, overall, scores")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (error || !data) return readLocalHistory();
  return data.map(fromRow);
}

/**
 * Saves one finished session's scores. Writes to Supabase when signed in,
 * otherwise (or on failure) writes to the local device history so a record
 * is never silently lost.
 */
export async function saveRecord(record: SkillRecord): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    saveLocalRecord(record);
    return;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    saveLocalRecord(record);
    return;
  }

  const { error } = await supabase.from("skill_records").insert({
    user_id: userData.user.id,
    mode_id: record.modeId,
    mode_name: record.modeName,
    topic: record.topic,
    overall: record.overall,
    scores: record.scores,
  });

  if (error) saveLocalRecord(record);
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
