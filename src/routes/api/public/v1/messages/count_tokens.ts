import { createFileRoute } from "@tanstack/react-router";

// Estimativa simples (~4 caracteres por token) usada pelo Claude Code
export const Route = createFileRoute("/api/public/v1/messages/count_tokens")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown = {};
        try { body = await request.json(); } catch { /* vazio */ }
        const { model: _m, ...rest } = (body ?? {}) as Record<string, unknown>;
        return Response.json({ input_tokens: Math.ceil(JSON.stringify(rest).length / 4) });
      },
    },
  },
});
