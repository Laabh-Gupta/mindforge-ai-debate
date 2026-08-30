import {
  CUSTOM_PROFILE_KEY,
  DIMENSION_LABELS,
  PROFILE_KEY,
  WEIGHTED_DIMENSIONS,
  type EvaluationProfile,
  type SessionScores,
  type WeightedDimensionKey,
} from "./evaluation-shared";

type Emphasis = Partial<Record<WeightedDimensionKey, number>>;

/** Build a full weight map: everything sits at `base`, listed dimensions are raised. */
function weights(emphasis: Emphasis, base = 3): Record<WeightedDimensionKey, number> {
  const map = {} as Record<WeightedDimensionKey, number>;
  for (const key of WEIGHTED_DIMENSIONS) map[key] = emphasis[key] ?? base;
  return map;
}

export const BALANCED_PROFILE: EvaluationProfile = {
  id: "balanced",
  name: "Balanced",
  description: "Every dimension counts equally. A neutral read of overall performance.",
  weights: weights({}, 5),
};

/** Cross-cutting presets, usable in any mode. */
export const PRESET_PROFILES: EvaluationProfile[] = [
  BALANCED_PROFILE,
  {
    id: "debate",
    name: "Debate",
    description: "Rewards airtight reasoning, real evidence and persuasive force.",
    weights: weights({
      logicalReasoning: 10,
      evidenceQuality: 9,
      persuasion: 8,
      criticalThinking: 8,
      useOfExamples: 7,
      clarity: 6,
      relevance: 6,
    }),
  },
  {
    id: "group-discussion",
    name: "Group Discussion",
    description: "Rewards leading the room, listening well and building on others.",
    weights: weights({
      leadership: 10,
      teamwork: 9,
      listening: 9,
      initiative: 8,
      communication: 7,
      relevance: 7,
      clarity: 6,
    }),
  },
  {
    id: "interview",
    name: "Interview",
    description: "Rewards relevance, composure and clear, structured answers.",
    weights: weights({
      relevance: 10,
      confidence: 9,
      communication: 9,
      clarity: 8,
      criticalThinking: 7,
      useOfExamples: 7,
      vocabulary: 6,
    }),
  },
  {
    id: "case-discussion",
    name: "Case Discussion",
    description: "Rewards structured analysis, evidence and a defensible recommendation.",
    weights: weights({
      criticalThinking: 10,
      logicalReasoning: 9,
      evidenceQuality: 9,
      relevance: 8,
      teamwork: 7,
      clarity: 7,
      leadership: 6,
    }),
  },
  {
    id: "negotiation",
    name: "Negotiation",
    description: "Rewards anchoring, initiative and reading the other side.",
    weights: weights({
      persuasion: 10,
      initiative: 9,
      criticalThinking: 8,
      listening: 8,
      confidence: 8,
      communication: 7,
      clarity: 6,
    }),
  },
  {
    id: "public-speaking",
    name: "Public Speaking",
    description: "Rewards delivery: clarity, vocabulary, engagement and vivid examples.",
    weights: weights({
      clarity: 10,
      communication: 9,
      persuasion: 9,
      vocabulary: 8,
      confidence: 8,
      useOfExamples: 7,
    }),
  },
  {
    id: "placement",
    name: "Placement / MBA",
    description: "Weighted the way placement and B-school panels actually judge candidates.",
    weights: weights({
      communication: 9,
      confidence: 9,
      leadership: 8,
      criticalThinking: 8,
      teamwork: 8,
      relevance: 7,
      clarity: 7,
    }),
  },
  {
    id: "civil-services",
    name: "UPSC & Civil Services",
    description: "Weighted for balance, relevance and reasoned judgement under scrutiny.",
    weights: weights({
      criticalThinking: 10,
      relevance: 9,
      logicalReasoning: 9,
      clarity: 8,
      evidenceQuality: 8,
      confidence: 7,
      listening: 6,
    }),
  },
  {
    id: "leadership",
    name: "Leadership",
    description: "Weighted for presence: initiative, leading others and carrying the room.",
    weights: weights({
      leadership: 10,
      initiative: 9,
      persuasion: 8,
      confidence: 8,
      teamwork: 8,
      listening: 7,
    }),
  },
];

export const CUSTOM_PROFILE_ID = "custom";

/** Default profile for a mode, falling back to Balanced. */
export function defaultProfileIdForMode(modeId: string | undefined) {
  if (!modeId) return BALANCED_PROFILE.id;
  if (modeId === "extempore") return "public-speaking";
  if (modeId === "observer") return "civil-services";
  return PRESET_PROFILES.some((p) => p.id === modeId) ? modeId : BALANCED_PROFILE.id;
}

export function makeCustomProfile(
  base: Record<WeightedDimensionKey, number>,
): EvaluationProfile {
  return {
    id: CUSTOM_PROFILE_ID,
    name: "Custom",
    description: "Your own weighting. Drag any dimension to change what the score rewards.",
    weights: { ...base },
  };
}

export function loadCustomProfile(): EvaluationProfile {
  if (typeof window === "undefined") return makeCustomProfile(BALANCED_PROFILE.weights);
  try {
    const raw = window.localStorage.getItem(CUSTOM_PROFILE_KEY);
    if (!raw) return makeCustomProfile(BALANCED_PROFILE.weights);
    const parsed = JSON.parse(raw) as Partial<Record<WeightedDimensionKey, number>>;
    const map = {} as Record<WeightedDimensionKey, number>;
    for (const key of WEIGHTED_DIMENSIONS) {
      const value = Number(parsed[key]);
      map[key] = Number.isFinite(value) ? Math.max(0, Math.min(10, value)) : 5;
    }
    return makeCustomProfile(map);
  } catch {
    return makeCustomProfile(BALANCED_PROFILE.weights);
  }
}

export function saveCustomProfile(profile: EvaluationProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CUSTOM_PROFILE_KEY, JSON.stringify(profile.weights));
  } catch {
    // storage unavailable — the profile simply resets next visit
  }
}

export function loadSelectedProfileId(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    return window.localStorage.getItem(PROFILE_KEY) || fallback;
  } catch {
    return fallback;
  }
}

export function saveSelectedProfileId(id: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_KEY, id);
  } catch {
    // ignore
  }
}

export function getProfile(id: string, custom: EvaluationProfile): EvaluationProfile {
  if (id === CUSTOM_PROFILE_ID) return custom;
  return PRESET_PROFILES.find((p) => p.id === id) ?? BALANCED_PROFILE;
}

export type WeightedResult = {
  overall: number;
  ranked: {
    key: WeightedDimensionKey;
    label: string;
    score: number;
    weight: number;
    share: number;
  }[];
  strongest: WeightedDimensionKey | null;
  weakest: WeightedDimensionKey | null;
};

/**
 * Pure, instant re-scoring. The AI-produced raw dimension scores never change —
 * only the weighting that turns them into an overall verdict.
 */
export function applyProfile(
  scores: SessionScores | null | undefined,
  profile: EvaluationProfile,
): WeightedResult {
  const total = WEIGHTED_DIMENSIONS.reduce((sum, key) => sum + (profile.weights[key] || 0), 0);

  const ranked = WEIGHTED_DIMENSIONS.map((key) => {
    const weight = profile.weights[key] || 0;
    return {
      key,
      label: DIMENSION_LABELS[key],
      score: scores?.[key] ?? 0,
      weight,
      share: total > 0 ? weight / total : 0,
    };
  }).sort((a, b) => b.weight - a.weight || b.score - a.score);

  if (!scores || total === 0) {
    return { overall: scores?.overallPerformance ?? 0, ranked, strongest: null, weakest: null };
  }

  const overall = Math.round(
    ranked.reduce((sum, row) => sum + row.score * row.share, 0),
  );

  // Impact = how much a dimension moves this profile's overall score.
  const impact = [...ranked].filter((row) => row.weight > 0);
  const strongest =
    [...impact].sort((a, b) => b.score * b.share - a.score * a.share)[0]?.key ?? null;
  const weakest =
    [...impact].sort((a, b) => (100 - b.score) * b.share - (100 - a.score) * a.share)[0]?.key ??
    null;

  return { overall, ranked, strongest, weakest };
}