import { ReviewDetailsSchema } from "./review-details";
import { z } from "zod/v3";
import { EVALUATION_DIMENSIONS } from "./evaluation-shared";
const scoreShape = Object.fromEntries(
  EVALUATION_DIMENSIONS.map((key) => [key, z.number().min(0).max(100)]),
) as Record<(typeof EVALUATION_DIMENSIONS)[number], z.ZodNumber>;
export const PracticeSchema = z
  .object({
    id: z.string().uuid(),
    modeId: z.string().max(60),
    modeName: z.string().max(120),
    topic: z.string().max(3000),
    startedAt: z.number().finite().nonnegative(),
    updatedAt: z.number().finite().nonnegative(),
    completedAt: z.number().finite().optional(),
    durationSeconds: z.number().min(0).max(86400),
    status: z.enum(["active", "completed"]),
    difficulty: z.enum(["adaptive", "beginner", "intermediate", "advanced"]),
    draft: z.string().optional(),
    variant: z.string().optional(),
    profileId: z.string().optional(),
    phase: z.enum(["prep", "live"]).optional(),
    remainingSeconds: z.number().min(0).max(86400).optional(),
    userRole: z.string().optional(),
    evidenceType: z.string().optional(),
    overall: z.number().min(0).max(100).optional(),
    observerAnswers: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
    extra: z.record(z.unknown()).optional(),
    turns: z.array(
      z.object({ speaker: z.string(), role: z.enum(["user", "ai"]), content: z.string() }),
    ),
    messages: z.array(
      z.object({
        id: z.string(),
        role: z.enum(["user", "assistant", "system"]),
        parts: z.array(z.object({ type: z.string() }).passthrough()),
      }),
    ),
    evaluation: z
      .object({
        details: ReviewDetailsSchema.optional(),
        summary: z.string(),
        scores: z.object(scoreShape),
        strengths: z.array(z.string()),
        weaknesses: z.array(z.string()),
        suggestions: z.array(z.string()),
        fallacies: z.array(z.object({ name: z.string(), detail: z.string() })),
      })
      .optional(),
  })
  .passthrough();
