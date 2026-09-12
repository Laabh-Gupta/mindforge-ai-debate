import { providerStatus } from "./ai-errors.server";
import { convertToModelMessages, streamText } from "ai";
import { ChatInput, coachingSettings } from "./ai-request";
import { CHAT_MODEL, getGroqProvider } from "./ai-provider.server";
import {
  OPENING_TRIGGER,
  buildClarificationDirective,
  buildOpeningPrompt,
  buildSystemPrompt,
  isClarificationRequest,
} from "./session-prompt";
export async function handleChat(request: Request, legacy = false) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return new Response("Invalid JSON request.", { status: 400 });
  }
  if (legacy && raw && typeof raw === "object") raw = { ...raw, modeId: "debate" };
  const parsed = ChatInput.safeParse(raw);
  if (!parsed.success)
    return new Response(parsed.error.issues[0]?.message ?? "Invalid session request.", {
      status: 400,
    });
  const body = parsed.data;
  const groq = getGroqProvider();
  if (!groq)
    return new Response("AI practice is temporarily unavailable. Please try again later.", {
      status: 503,
    });
  const opening = buildOpeningPrompt(body.modeId, body.topic, body.variant);
  const messages = body.messages.map((m) => ({
    ...m,
    parts: m.parts.map((p) => ({
      ...p,
      text: p.text.trim() === OPENING_TRIGGER ? opening : p.text,
    })),
  }));
  const lastUser =
    [...messages]
      .reverse()
      .find((m) => m.role === "user")
      ?.parts.map((p) => p.text)
      .join("") ?? "";
  const previous =
    [...messages]
      .reverse()
      .find((m) => m.role === "assistant")
      ?.parts.map((p) => p.text)
      .join("") ?? "";
  const clarifying = !!previous && isClarificationRequest(lastUser);
  try {
    const result = streamText({
      model: groq(CHAT_MODEL),
      system:
        buildSystemPrompt(body.modeId, body.topic, body.variant) +
        coachingSettings(body) +
        (clarifying ? buildClarificationDirective(previous) : ""),
      messages: await convertToModelMessages(messages),
      temperature: clarifying ? 0.4 : 0.7,
      maxOutputTokens: 2200,
      maxRetries: 1,
      abortSignal: AbortSignal.any([request.signal, AbortSignal.timeout(60000)]),
      providerOptions: { groq: { reasoningFormat: "hidden", reasoningEffort: "low" } },
    });
    return result.toUIMessageStreamResponse({
      sendReasoning: false,
      onError: (error) => {
        const status = providerStatus(error);
        console.warn("AI conversation failed", {
          status,
          type: error instanceof Error ? error.name : "UnknownError",
        });
        return status === 429
          ? "The AI provider is busy. Please retry in a minute. Your transcript is saved."
          : "The AI response was interrupted. Wait a moment, then retry. Your transcript is saved.";
      },
    });
  } catch {
    return new Response("The AI could not respond. Please try again.", { status: 502 });
  }
}
