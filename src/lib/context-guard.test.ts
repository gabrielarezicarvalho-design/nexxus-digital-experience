import { expect, test } from 'bun:test';
import { DEFAULT_CONTEXT_TOKENS, estimatePromptTokens, isLongConversation502, ONE_MILLION_CONTEXT_TOKENS, planContextLimit, shouldBlockBeforeSend } from './context-guard';

const pro = { plano: 'Pro', token_limit: null, expires_at: '2026-12-01' };
const teams = { plano: 'Teams', token_limit: null, expires_at: '2026-12-01' };

test('contexto do plano: Pro/Max/Enterprise/Teams 1M, Mensal 5x 256K', () => {
  expect(planContextLimit(pro)).toBe(1_000_000);
  expect(planContextLimit({ plano: 'Max', token_limit: null, expires_at: '2026-12-01' })).toBe(1_000_000);
  expect(planContextLimit({ plano: 'Mensal 5x', token_limit: null, expires_at: '2026-12-01' })).toBe(256_000);
  expect(planContextLimit(teams)).toBe(1_000_000);
  expect(planContextLimit({ plano: 'Essencial 30M', token_limit: 30_000_000, expires_at: null })).toBe(1_000_000);
});

test('502 é de conversa grande só se passar do contexto do plano ou um fornecedor recusar pelo tamanho', () => {
  expect(isLongConversation502(40_000, DEFAULT_CONTEXT_TOKENS, [{ cause: 'error code: 502' }])).toBe(false);
  expect(isLongConversation502(300_000, DEFAULT_CONTEXT_TOKENS, [{ cause: 'error code: 502' }])).toBe(true);
  expect(isLongConversation502(300_000, ONE_MILLION_CONTEXT_TOKENS, [{ cause: 'error code: 502' }])).toBe(false);
  expect(isLongConversation502(40_000, DEFAULT_CONTEXT_TOKENS, [
    { cause: 'error code: 502' },
    { cause: '{"error":{"message":"[400]: {\\"status_code\\":400,\\"message\\":\\"Please reduce the length of the messages or completion\\"}"}}' },
  ])).toBe(true);
});

test('bloqueio antes de enviar só acima de 20% do limite do plano', () => {
  expect(shouldBlockBeforeSend(300_000, 256_000)).toBe(false);
  expect(shouldBlockBeforeSend(307_200, 256_000)).toBe(false);
  expect(shouldBlockBeforeSend(307_201, 256_000)).toBe(true);
  expect(shouldBlockBeforeSend(1_150_000, 1_000_000)).toBe(false);
  expect(shouldBlockBeforeSend(1_250_000, 1_000_000)).toBe(true);
});

test('estimativa ignora imagens em base64 e conta ~4 caracteres por token', () => {
  const text = 'palavra '.repeat(50_000); // 400.000 caracteres
  const image = 'A'.repeat(4_000_000);
  const body = { model: 'x', messages: [{ role: 'user', content: [
    { type: 'text', text },
    { type: 'image_url', image_url: { url: `data:image/png;base64,${image}` } },
    { type: 'image', source: { type: 'base64', media_type: 'image/png', data: image } },
  ] }] };
  const tokens = estimatePromptTokens(body);
  expect(tokens > 99_000 && tokens < 101_000).toBe(true);
});

test('espaços e símbolos repetidos não inflam a estimativa', () => {
  expect(estimatePromptTokens({ messages: [{ role: 'user', content: ' '.repeat(1_000_000) + '='.repeat(1_000_000) }] }) < 10).toBe(true);
});
