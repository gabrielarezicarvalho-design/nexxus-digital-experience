import { z } from 'zod';
import { maskUpstreamModel } from '@/lib/upstream.server';
import type { ChatCompletionsAdapter, ChatUsage } from '@/lib/chat-completions-handler.server';
import { responsesToChat, chatToResponses, createResponsesStream, encodeResponsesEvent, type ResponsesEvent } from '@/lib/responses-conversion';

const inputSchema = z.object({
  model: z.string().min(1).max(200),
  instructions: z.string().max(4_000_000).optional(),
  input: z.union([z.string().max(8_000_000), z.array(z.unknown()).max(100_000)]),
  tools: z.array(z.unknown()).max(1024).optional(),
  stream: z.boolean().optional(),
  parallel_tool_calls: z.boolean().optional(),
  max_output_tokens: z.number().int().positive().max(10_000_000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
}).passthrough();

function translatedStream(upstream: Response, model: string, upstreamModel: string,
  finish: (usage: ChatUsage | null, status: number, error?: string) => Promise<void>) {
  const converter = createResponsesStream(model);
  const encoder = new TextEncoder();
  const reader = upstream.body?.getReader();
  let accounted = false;
  let canceled = false;
  const account = async (status: number, error?: string) => {
    if (accounted) return;
    accounted = true;
    await finish(converter.getUsage(), status, error);
  };
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (events: ResponsesEvent[]) => { if (!canceled) for (const event of events) controller.enqueue(encoder.encode(encodeResponsesEvent(event))); };
      try {
        emit(converter.start());
        if (!reader) throw new Error('empty stream');
        // Mask only complete data lines, so network boundaries cannot leak an internal name.
        const decoder = new TextDecoder();
        let pending = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          pending += decoder.decode(value, { stream: true });
          const lines = pending.split('\n'); pending = lines.pop() ?? '';
          for (const line of lines) emit(converter.push(encoder.encode(maskUpstreamModel(line, upstreamModel, model) + '\n')));
        }
        pending += decoder.decode();
        if (pending) emit(converter.push(encoder.encode(maskUpstreamModel(pending, upstreamModel, model) + '\n')));
        await account(200);
        emit(converter.end());
      } catch {
        // Do not expose raw provider errors, URLs or credentials.
        emit(converter.fail(502, 'Falha no stream do provedor'));
        await account(502, 'Falha no stream do provedor');
        await reader?.cancel().catch(() => {});
      } finally {
        reader?.releaseLock();
        if (!canceled) controller.close();
      }
    },
    async cancel() {
      canceled = true;
      await reader?.cancel().catch(() => {});
      await account(499, 'Stream cancelado pelo cliente');
    },
  });
  return new Response(body, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } });
}

export function createResponsesAdapter(): ChatCompletionsAdapter {
  let streaming = false;
  let model = '';
  return {
    acceptsApiKeyHeader: true,
    convertBody(body) {
      const validated = inputSchema.parse(body);
      streaming = validated.stream === true;
      model = validated.model;
      return responsesToChat(validated);
    },
    convertJson: chatToResponses,
    convertStream: translatedStream,
    upstreamError(status, raw) {
      let message = 'Falha ao contatar o provedor';
      let type = 'server_error';
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.error?.message === 'string') message = parsed.error.message;
        if (typeof parsed?.error?.type === 'string') type = parsed.error.type;
      } catch { /* Non-JSON supplier failures remain sanitized. */ }
      if (!streaming) return Response.json({ error: { message, type, code: status } }, { status });
      const converter = createResponsesStream(model);
      return new Response([...converter.start(), ...converter.fail(status, message)].map(encodeResponsesEvent).join(''), {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      });
    },
  };
}