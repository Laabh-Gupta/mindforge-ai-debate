import { aiFetch } from "./api-transport";
import type { AiContract } from "@shared/ai-contract";
function action<K extends keyof AiContract>(name: K) {
  return async (args: { data: AiContract[K]["input"] }): Promise<AiContract[K]["output"]> => {
    const response = await aiFetch("/api/ai/" + name, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args.data),
    });
    if (!response.ok)
      throw new Error(
        response.status === 429
          ? "The hourly practice limit has been reached. Please try again later."
          : "The AI request could not finish. Please retry.",
      );
    return response.json();
  };
}
export const evaluateSession = action("evaluateSession");
export const generateExtemporeTopic = action("generateExtemporeTopic");
export const generateObserverDiscussion = action("generateObserverDiscussion");
export const summarizeGroupDiscussion = action("summarizeGroupDiscussion");
export const explainTurn = action("explainTurn");
