import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
  modeId: z.string(),
  modeName: z.string(),
  topic: z.string(),
  variant: z.string().optional(),
  turns: z.array(
    z.object({ speaker: z.string(), role: z.enum(["user", "ai"]), content: z.string() }),
  ),
  observerAnswers: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .optional(),
});

export const evaluateSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => EvaluateInput.parse(input))
  .handler(async ({ data }): Promise<SessionEvaluation | null> => {
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
  .inputValidator((input: unknown) => z.object({ theme: z.string() }).parse(input))
  .handler(async ({ data }): Promise<string | null> => {
    const text = await runText(buildExtemporeTopicPrompt(data.theme));
    if (!text) return null;
    return text.replace(/^["'“”]|["'“”]$/g, "").split("\n")[0] ?? null;
  });

export const generateObserverDiscussion = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ topic: z.string() }).parse(input))
  .handler(async ({ data }) => {
    return runStructured(ObserverSchema, buildObserverPrompt(data.topic));
  });

const GdWrapInput = z.object({
  topic: z.string(),
  format: z.string(),
  roster: z.string(),
  transcript: z.string(),
});

/** Moderator closing feedback + per-participant contribution summary for a GD. */
export const summarizeGroupDiscussion = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GdWrapInput.parse(input))
  .handler(async ({ data }) => {
    if (!data.transcript.trim()) return null;
    return runStructured(GdWrapSchema, buildGdWrapPrompt(data));
  });

const ExplainInput = z.object({
  modeId: z.string(),
  modeName: z.string(),
  topic: z.string(),
  variant: z.string().optional(),
  userTurn: z.string(),
  aiTurn: z.string(),
});

/** Educational breakdown of one AI turn for the Thinking View. */
export const explainTurn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ExplainInput.parse(input))
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