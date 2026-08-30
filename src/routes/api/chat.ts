import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { CHAT_MODEL, getGroqProvider } from "@/lib/ai-provider.server";
import {
  OPENING_TRIGGER,
  buildClarificationDirective,
  buildDebateSystemPrompt,
  buildOpeningPrompt,
  isClarificationRequest,
} from "@/lib/debate-prompt";

function textOf(message: UIMessage) {
  return (message.parts ?? [])
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

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

        const groq = getGroqProvider();
        if (!groq) {
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

        // Clarification detector: if the latest user turn asks "what do you mean?",
        // force an explanation of the previous reply instead of a new counterargument.
        const lastUser = [...uiMessages].reverse().find((m) => m.role === "user");
        const lastAssistant = [...uiMessages].reverse().find((m) => m.role === "assistant");
        const lastUserText = lastUser ? textOf(lastUser) : "";
        const previousReply = lastAssistant ? textOf(lastAssistant) : "";
        const clarifying =
          previousReply.length > 0 &&
          lastUserText.length > 0 &&
          lastUserText !== buildOpeningPrompt(topic) &&
          isClarificationRequest(lastUserText);

        try {
          const result = streamText({
            model: groq(CHAT_MODEL),
            system:
              buildDebateSystemPrompt(topic) +
              (clarifying ? buildClarificationDirective(previousReply) : ""),
            messages: await convertToModelMessages(uiMessages),
            temperature: clarifying ? 0.5 : 0.8,
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