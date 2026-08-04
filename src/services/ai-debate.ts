/**
 * Placeholder AI debate service.
 *
 * All responses are static for now. When the AI backend is wired up, replace the
 * bodies of these functions with server-function calls — the signatures are
 * intentionally async so no calling component needs to change.
 */

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

const counterOpenings = [
  "That's a defensible position, but it rests on an assumption you haven't defended yet.",
  "I'll grant you the premise for a moment — the conclusion still doesn't follow.",
  "You've described a correlation. Let's see whether you can establish causation.",
  "Strong framing. Now consider the strongest version of the opposing case.",
];

const counterProbes = [
  "If your claim held generally, we would expect the opposite outcome in at least one comparable case. Why don't we see it?",
  "You appealed to consensus rather than to evidence. What data would change your mind?",
  "This looks like a false dilemma — you've excluded a middle option without arguing against it.",
  "Your second point contradicts the standard you set in your first. Which one are you keeping?",
];

const counterEvidence = [
  "Opposing evidence: a 2023 cross-country review found the effect reversed once you control for income.",
  "Opposing evidence: the two largest pilot programmes both reported the outcome you say is impossible.",
  "Opposing evidence: the trend you cite flattens entirely when measured over ten years instead of two.",
];

function pick<T>(list: T[], seed: number): T {
  return list[seed % list.length]!;
}

export async function generateAiRebuttal(
  userMessage: string,
  turn: number,
): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  const seed = turn + userMessage.length;
  return [
    pick(counterOpenings, seed),
    pick(counterProbes, seed + 1),
    pick(counterEvidence, seed + 2),
    "Answer that directly before you add a new argument.",
  ].join("\n\n");
}

export async function generateOpeningChallenge(topic: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return `Motion: "${topic}"\n\nState your position and the single strongest reason behind it. I'll take the opposing side and I won't concede easily — expect follow-up questions, contradictions raised against you, and evidence from the other camp.`;
}

export async function scoreDebate(_messages: DebateMessage[]): Promise<DebateScore[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return [
    { label: "Logic", value: 84 },
    { label: "Evidence", value: 72 },
    { label: "Clarity", value: 91 },
    { label: "Confidence", value: 78 },
    { label: "Bias", value: 63 },
    { label: "Communication", value: 88 },
  ];
}