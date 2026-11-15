import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientQuota } from './client-quota';

test('o cartão usa os tokens comprados e o consumo da mesma chave', () => {
  assert.deepEqual(clientQuota({ token_limit: 25_000_000, daily_token_limit: null, tokens_used: 5_000_000 }), { limit: 25_000_000, used: 5_000_000, daily: false, progress: 5_000_000 });
});
test('plano diário mostra consumo de hoje, não o consumo acumulado', () => {
  assert.deepEqual(clientQuota({ token_limit: null, daily_token_limit: 250_000_000, tokens_used: 600_000_000 }, 12_000_000), { limit: 250_000_000, used: 12_000_000, daily: true, progress: 12_000_000 });
});
test('a barra não ultrapassa os tokens comprados', () => {
  assert.equal(clientQuota({ token_limit: 25_000_000, daily_token_limit: null, tokens_used: 30_000_000 })?.progress, 25_000_000);
});
test('sem chave não inventa saldo', () => assert.equal(clientQuota(undefined), null));