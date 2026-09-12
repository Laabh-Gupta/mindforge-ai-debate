import { createFileRoute } from "@tanstack/react-router";
import { handleChat } from "@/lib/chat-handler.server";
export const Route = createFileRoute("/api/session")({
  server: { handlers: { POST: ({ request }) => handleChat(request) } },
});
