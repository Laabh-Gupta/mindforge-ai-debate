import { NoObjectGeneratedError, Output, generateText } from "ai";
import { z } from "zod";

import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import {
  EVALUATION_DIMENSIONS,
  type SessionEvaluation,
  type SessionScores,
} from "./evaluation-shared";

export const MODEL = "google/gemini-3.6-flash";

const scoreShape = Object.fromEntries(
  EVALUATION_DIMENSIONS.map((key) => [key, z.number()]),
) as Record<(typeof EVALUATION_DIMENSIONS)[number], z.ZodNumber>;

export const EvaluationSchema = z.object({
  summary: z.string(),
  scores: z.object(scoreShape),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  fallacies: z.array(z.object({ name: z.string(), detail: z.string() })),
  suggestions: z.array(z.string()),
});

export const ObserverSchema = z.object({
  turns: z.array(z.object({ speaker: z.string(), content: z.string() })),
  questions: z.array(z.string()),
});

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 0)));

export function normalizeEvaluation(raw: SessionEvaluation): SessionEvaluation {
  const scores = {} as SessionScores;
  for (const key of EVALUATION_DIMENSIONS) scores[key] = clamp(raw.scores[key]);
  return {
    summary: raw.summary,
    scores,
    strengths: raw.strengths.slice(0, 4),
    weaknesses: raw.weaknesses.slice(0, 4),
    fallacies: raw.fallacies.slice(0, 4),
    suggestions: raw.suggestions.slice(0, 4),
  };
}

export function buildEvaluationPrompt(input: {
  modeName: string;
  topic: string;
  variant?: string | undefined;
  transcript: string;
  observer: boolean;
}) {
  const focus = input.observer
    ? `The user was an OBSERVER. They watched a group discussion and then answered analysis questions about it. Assess the QUALITY OF THEIR ANALYSIS: did they correctly identify leadership, fallacies, constructive building, evidence quality and improvements? Score dimensions that do not apply to a silent observer (e.g. teamwork, vocabulary delivery) based on the reasoning shown in their written answers.`
    : `Assess ONLY the user's own contributions. Ignore the quality of the AI participants except as context for what the user was responding to.`;

  return `You are a rigorous but fair examiner assessing a candidate's performance in a "${input.modeName}" session${
    input.variant ? ` (${input.variant})` : ""
  } on: "${input.topic}".

${focus}

Transcript:
${input.transcript}

Score every dimension from 0 to 100, calibrated honestly — 50 is average for a serious candidate, above 85 is exceptional. If a dimension had little evidence in this session, score it conservatively near the middle rather than inventing a signal. "overallPerformance" is your holistic judgement, not an average.
Write a two-sentence summary of how they performed in THIS specific session. Give at most 3 strengths, 3 weaknesses and 3 suggestions, each one concrete sentence quoting or referring to what they actually said. List only logical fallacies genuinely present — an empty list is correct if there are none; never invent one. Stay entirely within the subject matter and never cite statistics that were not discussed.`;
}

export async function runStructured<T>(
  apiKey: string,
  schema: z.ZodType<T>,
  prompt: string,
): Promise<T | null> {
  const gateway = createLovableAiGatewayProvider(apiKey, undefined, { structuredOutputs: true });
  try {
    const { output } = await generateText({
      model: gateway(MODEL),
      output: Output.object({ schema }),
      prompt,
    });
    return output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) return null;
    throw error;
  }
}

export async function runText(apiKey: string, prompt: string): Promise<string> {
  const gateway = createLovableAiGatewayProvider(apiKey);
  const { text } = await generateText({ model: gateway(MODEL), prompt });
  return text.trim();
}

export function buildObserverPrompt(topic: string) {
  return `Write a realistic transcript of a six-person group discussion on: "${topic}".

Participants (use these exact names and keep each voice distinct): Meera Iyer (Moderator), Dr. Anand Rao (Economist), Kavya Nair (Entrepreneur), Rajat Sharma (HR Manager), Advocate Sneha Pillai (Lawyer), Prof. Iqbal Khan (Professor).

The discussion must feel real, not idealised. Deliberately include: at least two genuinely strong, well-supported arguments; at least two weak or unsupported ones; one clear strawman fallacy where a speaker distorts another's point; at least one other named fallacy such as a false dilemma, hasty generalisation or appeal to authority; one moment of visible leadership where a speaker structures the discussion or brings in a quieter voice; one instance of poor listening where a speaker repeats or ignores what was already said; and one strong instance of constructive building on another person's point.
Speakers must address each other by name. 16 to 22 turns, each 1-4 sentences of natural spoken language. Set the "speaker" field to the name with role in brackets, e.g. "Dr. Anand Rao (Economist)".

Then write exactly 5 analysis questions about THIS transcript, in this order: who showed the strongest leadership; which participant committed a strawman fallacy; who built constructively on another person's point; which argument was best supported by evidence; and how the discussion could have been improved. Each question must be answerable only by someone who read this transcript.

Stay inside the subject matter and never invent external statistics or studies.`;
}