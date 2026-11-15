import { createFileRoute } from '@tanstack/react-router';
import { handleChatCompletions } from '@/lib/chat-completions-handler.server';
import { createResponsesAdapter } from '@/lib/responses-adapter.server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const Route = createFileRoute('/api/public/v1/responses')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const response = await handleChatCompletions(request, createResponsesAdapter());
        const resultHeaders = new Headers(response.headers);
        for (const [name, value] of Object.entries(corsHeaders)) resultHeaders.set(name, value);
        return new Response(response.body, { status: response.status, headers: resultHeaders });
      },
    },
  },
});