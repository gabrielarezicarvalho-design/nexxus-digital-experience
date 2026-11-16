import { expect, test } from 'bun:test';
import { DEVHUB_COMBOS, devhubComboModels, devhubServesInCommonLine } from './devhub-combos';
import { expandDevhubCombos, globalProviderHops } from './upstream.server';

const devhubModels = ['devhub-chat', 'gemma-2-2b', 'claude-opus-5.5', 'claude-sonnet-5.5', 'claude-opus-4.8', 'claude-fable-5.1', 'claude-fable-5.2', 'gpt-6'];
const devhub = { name: 'DevHub Brasil', base_url: 'https://api.devhubbrasil.com/v1', api_secret_name: 'TEST', available_models: devhubModels };
const anthropic = { name: 'Anthropic Revenda', base_url: 'https://provider.test', api_secret_name: 'TEST', available_models: ['claude-opus-5-5'] };

test('the requested combos exist (opus-5, sonnet-5 and fable-5 added on 15/11/2026)', () => {
  expect([...DEVHUB_COMBOS].sort()).toEqual(['claude-fable-5', 'claude-fable-5-1', 'claude-fable-5-2', 'claude-haiku-5-5', 'claude-opus-4-8', 'claude-opus-5', 'claude-opus-5-5', 'claude-sonnet-5', 'claude-sonnet-5-5']);
});

const claudeOnly = devhubModels.filter(m => m.startsWith('claude-'));
test('a combo tries only the DevHub Claude models, the same-named one first', () => {
  const models = devhubComboModels(devhub, 'claude-opus-5-5')!;
  expect(models[0]).toBe('claude-opus-5.5');
  expect(new Set(models)).toEqual(new Set(claudeOnly));
});

test('haiku combo has no same-named model and tries every Claude model, fastest first', () => {
  const hops = devhubComboModels(devhub, 'claude-haiku-5-5') ?? [];
  expect([...hops].sort()).toEqual([...claudeOnly].sort());
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
  expect(hops.filter(h => h.account.name === 'Anthropic Revenda')).toEqual([]); // Claude só na DevHub
});

test('GPT never goes to the DevHub in the common line; Claude does', () => {
  const open = { ...devhub, dedicated_only: false };
  expect(globalProviderHops([open, anthropic], 'gpt-6-sol').map(h => h.account.name)).toEqual(['Anthropic Revenda']);
  expect(globalProviderHops([open, anthropic], 'claude-sonnet-5-5')[0]?.account.name).toBe('DevHub Brasil');
  expect(globalProviderHops([open, anthropic], 'claude-opus-5-5')[0]?.account.name).toBe('DevHub Brasil');
});

test("Claude only goes to the DevHub; GPT and Gemini only to the 9Router reserve", () => {
  const devhub = { name: "DevHub Brasil" };
  const revenda = { name: "Anthropic Revenda" };
  expect(devhubServesInCommonLine(devhub, "claude-opus-5-5")).toBe(true);
  expect(devhubServesInCommonLine(revenda, "claude-opus-5-5")).toBe(false);
  expect(devhubServesInCommonLine(devhub, "gpt-6-sol")).toBe(false);
  expect(devhubServesInCommonLine(revenda, "gpt-6-sol")).toBe(true);
  expect(devhubServesInCommonLine(revenda, "gemini-4-argon")).toBe(true);
});

test("Haiku (absent on the DevHub) tries the fastest measured Claude models first", () => {
  const dh = { name: "DevHub Brasil", available_models: ["claude-sonnet-5", "claude-sonnet-5.5", "claude-opus-4.8", "claude-opus-5", "claude-opus-5.5", "claude-fable-5.1"] };
  expect(devhubComboModels(dh, "claude-haiku-5-5")?.slice(0, 4)).toEqual(["claude-fable-5.1", "claude-opus-5.5", "claude-sonnet-5", "claude-opus-5"]);
  expect(devhubComboModels(dh, "claude-opus-5-5")?.[0]).toBe("claude-opus-5.5");
});

test("claude-opus-5 and claude-sonnet-5.5 fall back to other DevHub Claude models when they fail", () => {
  const dh = { name: "DevHub Brasil", available_models: ["claude-sonnet-5", "claude-sonnet-5.5", "claude-opus-5", "claude-opus-5.5", "claude-fable-5.1"] };
  expect(devhubComboModels(dh, "claude-opus-5")).toEqual(["claude-opus-5", "claude-fable-5.1", "claude-opus-5.5", "claude-sonnet-5", "claude-sonnet-5.5"]);
  expect(devhubComboModels(dh, "claude-sonnet-5-5")).toEqual(["claude-sonnet-5.5", "claude-fable-5.1", "claude-opus-5.5", "claude-sonnet-5", "claude-opus-5"]);
});
