import { expect, test } from 'bun:test';
import { DEVHUB_COMBOS, devhubComboModels } from './devhub-combos';
import { expandDevhubCombos, globalProviderHops } from './upstream.server';

const devhubModels = ['devhub-chat', 'gemma-2-2b', 'claude-opus-5.5', 'claude-sonnet-5.5', 'claude-opus-4.8', 'claude-fable-5.1', 'claude-fable-5.2', 'gpt-6'];
const devhub = { name: 'DevHub Brasil', base_url: 'https://api.devhubbrasil.com/v1', api_secret_name: 'TEST', available_models: devhubModels };
const anthropic = { name: 'Anthropic Revenda', base_url: 'https://provider.test', api_secret_name: 'TEST', available_models: ['claude-opus-5-5'] };

test('the six requested combos exist', () => {
  expect([...DEVHUB_COMBOS].sort()).toEqual(['claude-fable-5-1', 'claude-fable-5-2', 'claude-haiku-5-5', 'claude-opus-4-8', 'claude-opus-5-5', 'claude-sonnet-5-5']);
});

const claudeOnly = devhubModels.filter(m => m.startsWith('claude-'));
test('a combo tries only the DevHub Claude models, the same-named one first', () => {
  const models = devhubComboModels(devhub, 'claude-opus-5-5')!;
  expect(models[0]).toBe('claude-opus-5.5');
  expect(new Set(models)).toEqual(new Set(claudeOnly));
});

test('haiku combo has no same-named model and keeps the saved Claude order', () => {
  expect(devhubComboModels(devhub, 'claude-haiku-5-5')).toEqual(claudeOnly);
});

test('dotted spelling uses the same combo', () => {
  expect(devhubComboModels(devhub, 'claude-fable-5.2')?.[0]).toBe('claude-fable-5.2');
});

test('non-combo models and other providers are untouched', () => {
  expect(devhubComboModels(devhub, 'gpt-6')).toBeNull();
  expect(devhubComboModels(anthropic, 'claude-opus-5-5')).toBeNull();
});

test('a DevHub combo expands into one hop per model, other providers stay one hop', () => {
  const hops = expandDevhubCombos(globalProviderHops([devhub, anthropic], 'claude-opus-5-5'), 'claude-opus-5-5');
  expect(hops.filter(h => h.account.name === 'DevHub Brasil').length).toBe(claudeOnly.length);
  expect(hops.filter(h => h.account.name === 'Anthropic Revenda').map(h => h.upstreamModel)).toEqual(['claude-opus-5-5']);
});

test('GPT never goes to the DevHub in the common line; Claude does', () => {
  const open = { ...devhub, dedicated_only: false };
  expect(globalProviderHops([open, anthropic], 'gpt-6-sol').map(h => h.account.name)).toEqual(['Anthropic Revenda']);
  expect(globalProviderHops([open, anthropic], 'claude-sonnet-5-5')[0]?.account.name).toBe('DevHub Brasil');
  expect(globalProviderHops([open, anthropic], 'claude-opus-5-5')[0]?.account.name).toBe('DevHub Brasil');
});
