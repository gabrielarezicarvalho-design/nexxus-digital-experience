import { expect, test } from 'bun:test';
import { anthropicRevendaCombo, providerCatalogModels } from './provider-catalog';
import { forcedHop, versionedClaudeHops, globalProviderHops } from './upstream.server';

const available_models = ['claude-opus-4-8', 'claude-opus-5-5', 'claude-fable-5-1', 'gemini-4-argon', 'gpt-6-astra', 'gpt-6-sol', 'gpt-6.1-sol', 'gpt-6-luna', 'gpt-6.1-terra', 'claude-sonnet-5-5', 'claude-haiku-5-5'];
const account = { name: 'Anthropic Revenda', base_url: 'https://example.test/v1', api_secret_name: 'TEST', available_models };
for (const combo of available_models) {
  const model = combo.replaceAll('-', '.').replace(/^([a-z]+)\./, '$1-');
  test(`routes ${model} through the selected ${combo} combo`, () => {
    expect(anthropicRevendaCombo(account, model)).toBe(combo);
    expect(forcedHop(account, model).upstreamModel).toBe(combo);
    // 15/11/2026: na rota comum a 9Router só atende o que não é Claude (GPT, Gemini).
    if (/^claude-/.test(combo)) expect(globalProviderHops([account], model)[0]).toBeUndefined();
    else expect(globalProviderHops([account], model)[0]?.upstreamModel).toBe(combo);
    expect(versionedClaudeHops(account, [account], model, 'old-id')[0]?.upstreamModel).toBe(combo);
    const owner = { ...account, name: 'Nexxus Pro' };
    expect(versionedClaudeHops(owner, [owner, account], model, model)[1]?.upstreamModel).toBe(combo);
  });
}
test('legacy Fable 5.5 requests use the current Fable 5.1 combo', () => {
  expect(anthropicRevendaCombo(account, 'claude-fable-5-5')).toBe('claude-fable-5-1');
  expect(anthropicRevendaCombo({ ...account, available_models: ['claude-fable-5-5'] }, 'claude-fable-5.1')).toBeNull();
});
test('approved Fable 5.2 uses the exact Anthropic combo in catalog and all routes', () => {
  const updated = { ...account, available_models: [...available_models, 'claude-fable-5-2'] };
  expect(providerCatalogModels(updated.name, ['claude-fable-5-2', 'ag/private-pool'])).toEqual(['claude-fable-5-2']);
  for (const model of ['claude-fable-5-2', 'claude-fable-5.2']) {
    expect(anthropicRevendaCombo(updated, model)).toBe('claude-fable-5-2');
    expect(forcedHop(updated, model).upstreamModel).toBe('claude-fable-5-2');
    expect(globalProviderHops([updated], model)[0]).toBeUndefined(); // 15/11/2026: Claude não cai na 9Router na rota comum
    expect(versionedClaudeHops(updated, [updated], model, model)[0]?.upstreamModel).toBe('claude-fable-5-2');
  }
  expect(anthropicRevendaCombo(account, 'claude-fable-5-2')).toBeNull();
  expect(anthropicRevendaCombo({ ...updated, name: 'Reserva Teste' }, 'claude-fable-5-2')).toBeNull();
});
test('does not change other providers or accept unlisted combos', () => {
  expect(anthropicRevendaCombo(account, 'gpt-5.6-luna')).toBeNull();
  expect(anthropicRevendaCombo({ ...account, available_models: [...available_models, 'glm-5.3-flash'] }, 'glm-5.3-flash')).toBeNull();
  expect(anthropicRevendaCombo({ ...account, name: 'Reserva Teste' }, 'claude-fable-5.1')).toBeNull();
  expect(anthropicRevendaCombo({ ...account, available_models: [] }, 'claude-opus-5-5')).toBeNull();
  expect(providerCatalogModels(account.name, [...available_models, 'ag/gpt-oss-120b-medium'])).toEqual(available_models);
});
test('Sonnet 5.5 uses the requested combo, not retired Sonnet 5', () => {
  expect(anthropicRevendaCombo(account, 'claude-sonnet-5-5')).toBe('claude-sonnet-5-5');
  expect(anthropicRevendaCombo(account, 'claude-sonnet-5.5')).toBe('claude-sonnet-5-5');
  expect(anthropicRevendaCombo(account, 'claude-sonnet-5')).toBeNull();
});

test('Haiku 4.5 uses the Anthropic Revenda Haiku combo, preferring a dedicated 4-5 combo when listed', () => {
  for (const model of ['claude-haiku-4-5', 'claude-haiku-4.5', 'claude-haiku-4-5-20251001']) {
    expect(anthropicRevendaCombo(account, model)).toBe('claude-haiku-5-5');
    expect(forcedHop(account, model).upstreamModel).toBe('claude-haiku-5-5');
    expect(globalProviderHops([account], model)[0]).toBeUndefined(); // 15/11/2026: Claude não cai na 9Router na rota comum
  }
  const withOwn = { ...account, available_models: [...available_models, 'claude-haiku-4-5'] };
  expect(anthropicRevendaCombo(withOwn, 'claude-haiku-4-5')).toBe('claude-haiku-4-5');
  expect(anthropicRevendaCombo(withOwn, 'claude-haiku-4-5-20251001')).toBe('claude-haiku-4-5');
  expect(anthropicRevendaCombo(withOwn, 'claude-haiku-4.5')).toBe('claude-haiku-4-5');
  expect(anthropicRevendaCombo({ ...account, available_models: ['claude-sonnet-5-5'] }, 'claude-haiku-4-5')).toBeNull();
});

test('Claude Code Sonnet/Opus 4.x defaults use the Sonnet/Opus 5.5 combos', () => {
  for (const model of ['claude-sonnet-4-6', 'claude-sonnet-4.6', 'claude-sonnet-4-5-20250929', 'claude-sonnet-4']) {
    expect(anthropicRevendaCombo(account, model)).toBe('claude-sonnet-5-5');
    expect(globalProviderHops([account], model)[0]).toBeUndefined(); // 15/11/2026: Claude não cai na 9Router na rota comum
  }
  for (const model of ['claude-opus-4-6', 'claude-opus-4-7', 'claude-opus-4-9', 'claude-opus-4-1-20250805']) {
    expect(anthropicRevendaCombo(account, model)).toBe('claude-opus-5-5');
    expect(forcedHop(account, model).upstreamModel).toBe('claude-opus-5-5');
  }
  expect(anthropicRevendaCombo(account, 'claude-opus-4-8')).toBe('claude-opus-4-8');
  expect(anthropicRevendaCombo({ ...account, available_models: ['claude-opus-5-5'] }, 'claude-sonnet-4-6')).toBeNull();
  expect(anthropicRevendaCombo({ ...account, name: 'Nexxus Pro' }, 'claude-sonnet-4-6')).toBeNull();
});
