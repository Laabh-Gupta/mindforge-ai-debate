import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { SessionEvaluation } from "./evaluation-shared";
import {
  EvaluationSchema,
  ObserverSchema,
  buildEvaluationPrompt,
  buildObserverPrompt,
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
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return null;

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
      key,
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
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return null;
    const text = await runText(key, buildExtemporeTopicPrompt(data.theme));
    return text.replace(/^["'“”]|["'“”]$/g, "").split("\n")[0] ?? null;
  });

export const generateObserverDiscussion = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ topic: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return null;
    return runStructured(key, ObserverSchema, buildObserverPrompt(data.topic));
  });