import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateModelCostCents, modelRateUsdPerMillion, savingsSummary, USD_TO_BRL } from './usage-savings';

test('usa a taxa pública de referência de cada família de modelo', () => {
  assert.equal(modelRateUsdPerMillion('claude-opus-5-5'), 45);
  assert.equal(modelRateUsdPerMillion('claude-sonnet-5'), 9);
  assert.equal(modelRateUsdPerMillion('claude-fable-5.1'), 9);
  assert.equal(modelRateUsdPerMillion('gpt-astra'), 5.6);
  assert.equal(modelRateUsdPerMillion('modelo-desconhecido'), 9);
});

test('estima o custo em centavos a partir dos tokens reais', () => {
  assert.equal(estimateModelCostCents('claude-sonnet-5', 1_000_000), Math.round(9 * USD_TO_BRL * 100));
  assert.equal(estimateModelCostCents('claude-opus-5-5', 0), 0);
  assert.equal(estimateModelCostCents('claude-opus-5-5', -5), 0);
});

const catalog = { 'claude-sonnet-5': { input: 1.52, output: 7.6, inputBrl: 8.208, outputBrl: 41.04, estimated: false } };

test('usa entrada e saída reais e as tarifas da aba Modelos', () => {
  const result = savingsSummary([{ model: 'claude-sonnet-5', tokens: 2_000_000, prompt_tokens: 1_000_000, completion_tokens: 1_000_000 }], 3490, catalog, catalog);
  assert.equal(result.rows[0]?.tokens, 2_000_000);
  assert.ok(Math.abs((result.payPerTokenCents ?? 0) - 4924.8) < 1e-8);
  assert.equal(result.subscriptionCents, 3490);
  assert.equal(result.savingsCents, 0);
});
test('economia nunca é negativa se o uso custaria menos que o plano', () => {
  const result = savingsSummary([{ model: 'claude-sonnet-5', tokens: 100, prompt_tokens: 100, completion_tokens: 0 }], 3490, catalog, catalog);
  assert.equal(result.savingsCents, 0);
});
test('não inventa preço ou assinatura quando faltam dados', () => {
  const result = savingsSummary([{ model: 'unknown', tokens: 100, prompt_tokens: 100, completion_tokens: 0 }], null, catalog, null);
  assert.equal(result.payPerTokenCents, null);
  assert.equal(result.subscriptionCents, null);
  assert.equal(result.savingsCents, null);
  assert.equal(result.ratio, null);
});
test('sem uso preserva o valor real do plano e custo zero', () => {
  const result = savingsSummary([], 3490, catalog, catalog);
  assert.equal(result.subscriptionCents, 3490);
  assert.equal(result.payPerTokenCents, 0);
  assert.equal(result.savingsCents, 0);
});
test('economia compara o mesmo uso ajustado, mesmo antes de consumir o valor inteiro do plano', () => {
  const rows = [{ model: 'claude-sonnet-5', tokens: 1_000_000, prompt_tokens: 1_000_000, completion_tokens: 0 }];
  const base = { 'claude-sonnet-5': { input: 1, output: 2, inputBrl: 21.19, outputBrl: 42.38, estimated: false } };
  const adjusted = { 'claude-sonnet-5': { ...base['claude-sonnet-5'], inputBrl: 0.72, outputBrl: 1.44 } };
  const result = savingsSummary(rows, 3490, base, adjusted);
  assert.equal(result.payPerTokenCents, 2119);
  assert.equal(result.consumedCents, 72);
  assert.equal(result.subscriptionCents, 3490);
  assert.equal(result.savingsCents, 2047);
  assert.equal(result.ratio, 2119 / 72);
});
test('tarifa ajustada ausente não inventa consumo ou economia', () => {
  const result = savingsSummary([{ model: 'claude-sonnet-5', tokens: 100, prompt_tokens: 100, completion_tokens: 0 }], 3490, catalog, null);
  assert.equal(result.consumedCents, null);
  assert.equal(result.savingsCents, null);
});
