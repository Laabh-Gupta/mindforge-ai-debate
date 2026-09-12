import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v3";

import type { SessionEvaluation, ThinkingSteps } from "./evaluation-shared";
import {
  EvaluationSchema,
  GdWrapSchema,
  ObserverSchema,
  ThinkingStepsSchema,
  buildEvaluationPrompt,
  buildGdWrapPrompt,
  buildObserverPrompt,
  buildThinkingPrompt,
  normalizeEvaluation,
  runStructured,
  runText,
} from "./evaluation.server";
import { buildExtemporeTopicPrompt } from "./session-prompt";

const EvaluateInput = z.object({
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

export const evaluateSession = createServerFn({ method: "POST" })
  .validator((input: unknown) => EvaluateInput.parse(input))
  .handler(async ({ data }): Promise<SessionEvaluation | null> => {
    const words = (
      data.observerAnswers
        ? data.observerAnswers.map((a) => a.answer)
        : data.turns.filter((t) => t.role === "user").map((t) => t.content)
    )
      .join(" ")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    if (words < 20)
      throw new Error("Add at least 20 words of your own before requesting a review.");
    const observer = (data.observerAnswers?.length ?? 0) > 0;
    const body = observer
      ? [
          "DISCUSSION THE USER WATCHED:",
          data.turns.map((t) => `${t.speaker}: ${t.content}`).join("\n"),
          "\nTHE USER'S WRITTEN ANALYSIS:",
          (data.observerAnswers ?? [])
            .map((a) => `Q: ${a.question}\nUSER'S ANSWER: ${a.answer || "(left blank)"}`)
            .join("\n\n"),
        ].join("\n")
      : data.turns
          .map((t) => `${t.role === "user" ? "USER" : t.speaker}: ${t.content}`)
          .join("\n\n");

    if (!body.trim()) return null;

    const raw = await runStructured(
      EvaluationSchema,
      buildEvaluationPrompt({
        modeName: data.modeName,
        topic: data.topic,
        variant: data.variant,
        transcript: body,
        observer,
      }),
    );
    return raw ? normalizeEvaluation(raw) : null;
  });

export const generateExtemporeTopic = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ theme: z.string().max(3000) }).parse(input))
  .handler(async ({ data }): Promise<string | null> => {
    const text = await runText(buildExtemporeTopicPrompt(data.theme));
    if (!text) return null;
    return text.replace(/^["'“”]|["'“”]$/g, "").split("\n")[0] ?? null;
  });

export const generateObserverDiscussion = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ topic: z.string().min(1).max(3000) }).parse(input))
  .handler(async ({ data }) => {
    return runStructured(ObserverSchema, buildObserverPrompt(data.topic));
  });

const GdWrapInput = z.object({
  topic: z.string().min(1).max(3000),
  format: z.string().max(120),
  roster: z.string().max(5000),
  transcript: z.string().max(100000),
});

/** Moderator closing feedback + per-participant contribution summary for a GD. */
export const summarizeGroupDiscussion = createServerFn({ method: "POST" })
  .validator((input: unknown) => GdWrapInput.parse(input))
  .handler(async ({ data }) => {
    if (!data.transcript.trim()) return null;
    return runStructured(GdWrapSchema, buildGdWrapPrompt(data));
  });

const ExplainInput = z.object({
  modeId: z.string().min(1).max(60),
  modeName: z.string().min(1).max(120),
  topic: z.string().min(1).max(3000),
  variant: z.string().max(120).optional(),
  userTurn: z.string().max(20000),
  aiTurn: z.string().max(20000),
});

/** Educational breakdown of one AI turn for the Thinking View. */
export const explainTurn = createServerFn({ method: "POST" })
  .validator((input: unknown) => ExplainInput.parse(input))
  .handler(async ({ data }): Promise<ThinkingSteps | null> => {
    if (!data.aiTurn.trim()) return null;
    return runStructured(
      ThinkingStepsSchema,
      buildThinkingPrompt({
        modeId: data.modeId,
        modeName: data.modeName,
        topic: data.topic,
        variant: data.variant,
        userTurn: data.userTurn,
        aiTurn: data.aiTurn,
      }),
    );
  });
