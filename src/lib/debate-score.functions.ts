import { createServerFn } from "@tanstack/react-start";
import { NoObjectGeneratedError, Output, generateText } from "ai";
import { z } from "zod";

import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const TranscriptInput = z.object({
  topic: z.string(),
  turns: z.array(z.object({ role: z.enum(["user", "ai"]), content: z.string() })),
});

const AnalysisSchema = z.object({
  summary: z.string(),
  scores: z.object({
    logic: z.number(),
    evidence: z.number(),
    clarity: z.number(),
    confidence: z.number(),
    bias: z.number(),
    communication: z.number(),
  }),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  fallacies: z.array(z.object({ name: z.string(), detail: z.string() })),
  suggestions: z.array(z.string()),
});

export type DebateAnalysis = z.infer<typeof AnalysisSchema>;

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 0)));

function normalize(analysis: DebateAnalysis): DebateAnalysis {
  return {
    summary: analysis.summary,
    scores: {
      logic: clamp(analysis.scores.logic),
      evidence: clamp(analysis.scores.evidence),
      clarity: clamp(analysis.scores.clarity),
      confidence: clamp(analysis.scores.confidence),
      bias: clamp(analysis.scores.bias),
      communication: clamp(analysis.scores.communication),
    },
    strengths: analysis.strengths.slice(0, 4),
    weaknesses: analysis.weaknesses.slice(0, 4),
    fallacies: analysis.fallacies.slice(0, 4),
    suggestions: analysis.suggestions.slice(0, 4),
  };
}

export const analyzeDebate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TranscriptInput.parse(input))
  .handler(async ({ data }): Promise<DebateAnalysis | null> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key || data.turns.length === 0) return null;

    const gateway = createLovableAiGatewayProvider(key);
    const transcript = data.turns
      .map((t) => `${t.role === "user" ? "STUDENT" : "AI"}: ${t.content}`)
      .join("\n\n");

    const prompt = `You are assessing a student's performance in a debate on the motion "${data.topic}".

Transcript:
${transcript}

Assess ONLY the STUDENT's contributions. Score each dimension from 0 to 100 (bias = freedom from bias, higher is better). Write a two-sentence summary of how they performed on this specific motion. Give at most 3 strengths, at most 3 weaknesses, at most 3 suggestions, each one concrete sentence referring to what they actually said. List only logical fallacies genuinely present in their reasoning — an empty list is correct if there are none; never invent one. Stay entirely within the subject matter of the debate and never cite statistics or studies that were not discussed.`;

    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3.6-flash"),
        output: Output.object({ schema: AnalysisSchema }),
        prompt,
      });
      return normalize(output);
    } catch (error) {
      console.error("[analyzeDebate]", error);
      if (NoObjectGeneratedError.isInstance(error)) {
        try {
          const text = error.text ?? "";
          const start = text.indexOf("{");
          const end = text.lastIndexOf("}");
          if (start >= 0 && end > start) {
            const parsed = AnalysisSchema.safeParse(JSON.parse(text.slice(start, end + 1)));
            if (parsed.success) return normalize(parsed.data);
          }
        } catch {
          return null;
        }
        return null;
      }
      return null;
    }
  });