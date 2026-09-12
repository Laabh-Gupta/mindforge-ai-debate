import { z } from "zod/v3";
import type { SessionEvaluation, ThinkingSteps } from "./evaluation-shared";
export const EvaluateInput = z.object({
  modeId: z.string().min(1).max(60),
  modeName: z.string().min(1).max(120),
  topic: z.string().min(1).max(3000),
  variant: z.string().max(120).optional(),
  turns: z
    .array(
      z.object({
        speaker: z.string().max(200),
        role: z.enum(["user", "ai"]),
        content: z.string().max(20000),
      }),
    )
    .min(1)
    .max(400),
  observerAnswers: z
    .array(z.object({ question: z.string().max(2000), answer: z.string().max(12000) }))
    .max(10)
    .optional(),
});
export const GdWrapInput = z.object({
  topic: z.string().min(1).max(3000),
  format: z.string().max(120),
  roster: z.string().max(5000),
  transcript: z.string().max(100000),
});
export const ExplainInput = z.object({
  modeId: z.string().min(1).max(60),
  modeName: z.string().min(1).max(120),
  topic: z.string().min(1).max(3000),
  variant: z.string().max(120).optional(),
  userTurn: z.string().max(20000),
  aiTurn: z.string().max(20000),
});
export type AiContract = {
  evaluateSession: { input: z.infer<typeof EvaluateInput>; output: SessionEvaluation | null };
  generateExtemporeTopic: { input: { theme: string }; output: string | null };
  generateObserverDiscussion: {
    input: { topic: string };
    output: { turns: { speaker: string; content: string }[]; questions: string[] } | null;
  };
  summarizeGroupDiscussion: {
    input: z.infer<typeof GdWrapInput>;
    output: {
      moderatorClosing: string;
      moderatorFeedback: string[];
      userVerdict: string;
      contributions: {
        name: string;
        role: string;
        stance: string;
        contribution: string;
        impact: "high" | "medium" | "low";
      }[];
    } | null;
  };
  explainTurn: { input: z.infer<typeof ExplainInput>; output: ThinkingSteps | null };
};
