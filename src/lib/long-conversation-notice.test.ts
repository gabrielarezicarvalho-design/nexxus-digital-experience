import { expect, test } from 'bun:test';
import { BAD_REQUEST_400_MESSAGE, ERROR_502_1M_MESSAGE, ERROR_502_MESSAGE, TEMPORARY_502_MESSAGE, BUSY_UPSTREAM_MESSAGE, clientUpstreamError, clientUpstreamMessage, hasOneMillionContext, LONG_CONVERSATION_MESSAGE, ONE_MILLION_CONTEXT_MESSAGE, REJECTED_REQUEST_MESSAGE, TEMPORARY_UPSTREAM_MESSAGE } from './long-conversation-notice';

test('502 sem sinal de conversa grande mostra falha temporária, sem falar em compactar', () => {
  expect(clientUpstreamMessage(502, 'Network connection lost', 'x')).toBe(TEMPORARY_502_MESSAGE);
  const safe = clientUpstreamError(502, 'error code: 502');
  expect(safe.status).toBe(502);
  expect(safe.message).toBe(TEMPORARY_502_MESSAGE);
  expect(safe.message.includes('/compact')).toBe(false);
  expect(safe.message.includes('/clear')).toBe(false);
});
test('502 de conversa grande mostra /compact e /clear (e /autocompact nos planos 1M)', () => {
  expect(clientUpstreamError(502, 'error code: 502', false, true).message).toBe(ERROR_502_MESSAGE);
  expect(clientUpstreamError(502, 'error code: 502', true, true).message).toBe(ERROR_502_1M_MESSAGE);
  expect(clientUpstreamError(502, 'Please reduce the length of the messages or completion').message).toBe(ERROR_502_MESSAGE);
  expect(ERROR_502_MESSAGE.includes('/compact') && ERROR_502_MESSAGE.includes('/clear')).toBe(true);
  expect(ERROR_502_1M_MESSAGE.includes('/autocompact 1000000')).toBe(true);
});
test('400 context-length shows the same message', () => {
  expect(clientUpstreamMessage(400, 'Please reduce the length of the messages or completion', 'x')).toBe(LONG_CONVERSATION_MESSAGE);
});
test('other errors keep their message', () => {
  expect(clientUpstreamMessage(429, 'rate limit', 'rate limit')).toBe('rate limit');
});

const RAW_BALANCE = 'API Error: 503 [anthropic-compatible-0a686d51-a38a-439b-ad2e-6a4905a6f38b/claude-opus-4-7] [403]: {"code":"INSUFFICIENT_BALANCE","message":"Insufficient account balance"} (reset after 1m 18s)';

test('saldo esgotado do fornecedor vira 503 com mensagem limpa, sem IDs internos', () => {
  const safe = clientUpstreamError(503, RAW_BALANCE);
  expect(safe.status).toBe(503);
  expect(safe.message).toBe(TEMPORARY_UPSTREAM_MESSAGE);
});
test('403 do fornecedor nunca chega ao cliente como 403', () => {
  expect(clientUpstreamError(403, '{"code":"INSUFFICIENT_BALANCE"}').status).toBe(503);
  expect(clientUpstreamError(401, '{"error":{"message":"Invalid API key"}}').status).toBe(503);
});
test('429 do fornecedor vira aviso de servidor ocupado', () => {
  const safe = clientUpstreamError(429, '{"error":{"message":"Rate limit exceeded on openrouter"}}');
  expect(safe.status).toBe(429);
  expect(safe.message).toBe(BUSY_UPSTREAM_MESSAGE);
});
test('todo 400 do fornecedor mostra /clear ou /autocompact 1000000', () => {
  expect(BAD_REQUEST_400_MESSAGE).toBe('Mensagem longa: rode /clear ou ative o 1M de contexto através do comando /autocompact 1000000');
  for (const raw of ['{"error":{"message":"tool_use ids must be unique"}}', 'Bad request from anthropic-compatible-0a686d51-a38a-439b-ad2e-6a4905a6f38b', 'Please reduce the length of the messages or completion']) {
    const safe = clientUpstreamError(400, raw);
    expect(safe.status).toBe(400);
    expect(safe.message).toBe(BAD_REQUEST_400_MESSAGE);
  }
});
test('400 por saldo do fornecedor continua como instabilidade 503', () => {
  expect(clientUpstreamError(400, '{"code":"INSUFFICIENT_BALANCE"}').status).toBe(503);
});
test('outros 4xx úteis continuam visíveis, sem identidade do fornecedor', () => {
  expect(clientUpstreamError(422, '{"error":{"message":"tool_use ids must be unique"}}').message).toBe('tool_use ids must be unique');
  expect(clientUpstreamError(422, '{"error":{"message":"see https://api.exemplo.com/docs"}}').message).toBe(REJECTED_REQUEST_MESSAGE);
});
test('500 e 404 do fornecedor viram instabilidade temporária', () => {
  expect(clientUpstreamError(500, 'Internal error at upstream').message).toBe(TEMPORARY_UPSTREAM_MESSAGE);
  expect(clientUpstreamError(404, 'model not found').status).toBe(503);
});

test('plano com 1M recebe a orientação do /autocompact no erro de conversa longa', () => {
  expect(ONE_MILLION_CONTEXT_MESSAGE).toBe('Ative o seu 1M de contexto no terminal rodando o comando /autocompact 1000000');
  expect(clientUpstreamError(413, 'Please reduce the length of the messages or completion', true).message).toBe(ONE_MILLION_CONTEXT_MESSAGE);
  expect(clientUpstreamError(413, 'Please reduce the length of the messages or completion').message).toBe(LONG_CONVERSATION_MESSAGE);
});

test('1M de contexto: Enterprise, Teams e pacotes por tokens; Pro e Max não', () => {
  expect(hasOneMillionContext({ plano: 'Enterprise', token_limit: null, expires_at: '2026-12-01' })).toBe(true);
  expect(hasOneMillionContext({ plano: 'Teams', token_limit: null, expires_at: '2026-12-01' })).toBe(true);
  expect(hasOneMillionContext({ plano: 'GPT Teams', token_limit: null, expires_at: '2026-12-01' })).toBe(true);
  expect(hasOneMillionContext({ plano: 'Essencial 30M', token_limit: 30_000_000, expires_at: null })).toBe(true);
  expect(hasOneMillionContext({ plano: 'Pro', token_limit: null, expires_at: '2026-12-01' })).toBe(true);
  expect(hasOneMillionContext({ plano: 'GPT Pro', token_limit: null, expires_at: '2026-12-01' })).toBe(true);
  expect(hasOneMillionContext({ plano: 'Max', token_limit: null, expires_at: '2026-12-01' })).toBe(true);
  expect(hasOneMillionContext({ plano: 'GPT Max', token_limit: null, expires_at: '2026-12-01' })).toBe(true);
  expect(hasOneMillionContext({ plano: 'Mensal 5x', token_limit: null, expires_at: '2026-12-01' })).toBe(false);
});

test('503 orienta /compact ou /clear, e /autocompact nos planos 1M', () => {
  expect(clientUpstreamError(503, 'The model provider could not complete this request.').message.includes('/compact ou /clear')).toBe(true);
  expect(clientUpstreamError(503, 'x', true).message.includes('/autocompact 1000000')).toBe(true);
});

test('Claude Code overflow wording starts with "prompt is too long" and states tokens over the plan limit', async () => {
  const { promptTooLongMessage } = await import('./long-conversation-notice');
  const over = promptTooLongMessage(1_300_000, 1_000_000, true);
  expect(over.startsWith('prompt is too long: 1300000 tokens > 1000000 maximum. Sua conversa tem cerca de 1300K tokens')).toBe(true);
  expect(over.includes('/autocompact 1000000')).toBe(true);
  const rejected = promptTooLongMessage(200_000, 256_000);
  expect(rejected.startsWith('prompt is too long: 256001 tokens > 256000 maximum. Sua conversa ficou grande demais')).toBe(true);
  expect(rejected.includes('/compact')).toBe(true);
});
