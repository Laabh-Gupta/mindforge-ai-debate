import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { createLovableAiGatewayProvider, getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";
import { OPENING_TRIGGER, buildDebateSystemPrompt, buildOpeningPrompt } from "@/lib/debate-prompt";

type ChatRequestBody = { messages?: unknown; topic?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatRequestBody;
        const topic = typeof body.topic === "string" ? body.topic.trim() : "";

        if (!Array.isArray(body.messages) || !topic) {
          return new Response("messages and topic are required", { status: 400 });
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) {
          return new Response("AI is not configured for this project.", { status: 500 });
        }

        // The client seeds the first turn with a trigger token; swap it for the real
        // opening instruction so the user never sees an artificial prompt.
        const uiMessages = (body.messages as UIMessage[]).map((message) => ({
          ...message,
          parts: message.parts?.map((part) =>
            part.type === "text" && part.text.trim() === OPENING_TRIGGER
              ? { ...part, text: buildOpeningPrompt(topic) }
              : part,
          ),
        })) as UIMessage[];

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayProvider(key, initialRunId);

        try {
          const result = streamText({
            model: gateway("google/gemini-3.6-flash"),
            system: buildDebateSystemPrompt(topic),
            messages: convertToModelMessages(uiMessages),
            temperature: 0.8,
          });

          return result.toUIMessageStreamResponse({
            originalMessages: uiMessages,
            onError: (error) => {
              const message = error instanceof Error ? error.message : String(error);
              if (message.includes("429")) {
                return "The AI is receiving too many requests right now. Try again in a moment.";
              }
              if (message.includes("402")) {
                return "AI credits are exhausted for this workspace. Add credits to continue debating.";
              }
              return "The AI could not respond. Please try again.";
            },
          });
        } catch {
          return new Response("The AI could not respond. Please try again.", { status: 502 });
        }
      },
    },
  },
});