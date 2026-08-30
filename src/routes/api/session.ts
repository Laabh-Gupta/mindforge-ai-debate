import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { CHAT_MODEL, getGroqProvider } from "@/lib/ai-provider.server";
import {
  OPENING_TRIGGER,
  buildClarificationDirective,
  buildOpeningPrompt,
  buildSystemPrompt,
  isClarificationRequest,
} from "@/lib/session-prompt";

function textOf(message: UIMessage) {
  return (message.parts ?? [])
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

type Body = { messages?: unknown; topic?: unknown; modeId?: unknown; variant?: unknown };

export const Route = createFileRoute("/api/session")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        const topic = typeof body.topic === "string" ? body.topic.trim() : "";
        const modeId = typeof body.modeId === "string" ? body.modeId : "debate";
        const variant = typeof body.variant === "string" && body.variant ? body.variant : undefined;

        if (!Array.isArray(body.messages) || !topic) {
          return new Response("messages and topic are required", { status: 400 });
        }

        const groq = getGroqProvider();
        if (!groq) {
          return new Response("AI is not configured for this project.", { status: 500 });
        }

        const opening = buildOpeningPrompt(modeId, topic, variant);
        const uiMessages = (body.messages as UIMessage[]).map((message) => ({
          ...message,
          parts: message.parts?.map((part) =>
            part.type === "text" && part.text.trim() === OPENING_TRIGGER
              ? { ...part, text: opening }
              : part,
          ),
        })) as UIMessage[];

        const lastUser = [...uiMessages].reverse().find((m) => m.role === "user");
        const lastAssistant = [...uiMessages].reverse().find((m) => m.role === "assistant");
        const lastUserText = lastUser ? textOf(lastUser) : "";
        const previousReply = lastAssistant ? textOf(lastAssistant) : "";
        const clarifying =
          modeId !== "negotiation" &&
          modeId !== "interview" &&
          previousReply.length > 0 &&
          lastUserText.length > 0 &&
          lastUserText !== opening &&
          isClarificationRequest(lastUserText);

        try {
          const result = streamText({
            model: groq(CHAT_MODEL),
            system:
              buildSystemPrompt(modeId, topic, variant) +
              (clarifying ? buildClarificationDirective(previousReply) : ""),
            messages: await convertToModelMessages(uiMessages),
            temperature: clarifying ? 0.5 : 0.85,
          });

          return result.toUIMessageStreamResponse({
            originalMessages: uiMessages,
            onError: (error) => {
              const message = error instanceof Error ? error.message : String(error);
              if (message.includes("429")) {
                return "The AI is receiving too many requests right now. Try again in a moment.";
              }
              if (message.includes("402") || message.includes("401") || message.includes("403")) {
                return "The AI provider rejected the request — check that your GROQ_API_KEY is valid and has quota.";
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