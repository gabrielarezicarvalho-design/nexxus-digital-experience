// Resposta amigável no balão do chat quando os tokens da chave acabaram.
// Evita 401/403, que os apps (Claude Desktop etc.) tratam como credencial inválida.
export const TOKENS_EXHAUSTED_MESSAGE =
  'Seus tokens acabaram! Entre em contato com a NEXA CLOUD para adquirir mais e voltar ao seu ritmo de trabalho.';

const sseHeaders = { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' };

export function openAIExhaustedJson(model: string) {
  return {
    id: `chatcmpl-nexa-${Date.now()}`, object: 'chat.completion', created: Math.floor(Date.now() / 1000), model,
    choices: [{ index: 0, message: { role: 'assistant', content: TOKENS_EXHAUSTED_MESSAGE }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

export function openAIExhaustedStream(model: string): Response {
  const base = { id: `chatcmpl-nexa-${Date.now()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model };
  const chunks = [
    { ...base, choices: [{ index: 0, delta: { role: 'assistant', content: TOKENS_EXHAUSTED_MESSAGE }, finish_reason: null }] },
    { ...base, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } },
  ];
  const text = chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join('') + 'data: [DONE]\n\n';
  return new Response(text, { headers: sseHeaders });
}

export function anthropicExhaustedJson(model: string) {
  return {
    id: `msg_nexa_${Date.now()}`, type: 'message', role: 'assistant', model,
    content: [{ type: 'text', text: TOKENS_EXHAUSTED_MESSAGE }],
    stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 },
  };
}

export function anthropicExhaustedStream(model: string): Response {
  const msg = { ...anthropicExhaustedJson(model), content: [], stop_reason: null };
  const ev = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const text = ev('message_start', { type: 'message_start', message: msg })
    + ev('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })
    + ev('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: TOKENS_EXHAUSTED_MESSAGE } })
    + ev('content_block_stop', { type: 'content_block_stop', index: 0 })
    + ev('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 0 } })
    + ev('message_stop', { type: 'message_stop' });
  return new Response(text, { headers: sseHeaders });
}
