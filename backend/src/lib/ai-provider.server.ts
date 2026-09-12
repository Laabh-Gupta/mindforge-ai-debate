import { createGroq } from "@ai-sdk/groq";

/**
 * Chat model used for live debate/session turns (streaming).
 * Override with GROQ_CHAT_MODEL if you want to try a different Groq model.
 */
export const CHAT_MODEL = process.env["GROQ_CHAT_MODEL"] || "openai/gpt-oss-120b";

/**
 * Model used for structured JSON output (scoring, evaluations, generated
 * transcripts). Must be one of Groq's structured-output-capable models.
 * See https://console.groq.com/docs/structured-outputs
 */
export const STRUCTURED_MODEL = process.env["GROQ_STRUCTURED_MODEL"] || "openai/gpt-oss-120b";

/**
 * Reads the API key from the environment and builds a Groq provider.
 * Returns undefined if no key is configured, so callers can fail gracefully
 * with a clear message instead of throwing deep inside the AI SDK.
 */
export function getGroqProvider() {
  const apiKey = process.env["GROQ_API_KEY"];
  if (!apiKey) return undefined;
  return createGroq({ apiKey });
}
