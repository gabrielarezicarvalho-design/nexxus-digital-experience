import { createFileRoute } from "@tanstack/react-router";
import { handleChatCompletions } from "@/lib/chat-completions-handler.server";

export const Route = createFileRoute("/api/public/v1/chat/completions")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "authorization, content-type",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
          },
        }),
      POST: async ({ request }) => {
        return handleChatCompletions(request);
      },
    },
  },
});
