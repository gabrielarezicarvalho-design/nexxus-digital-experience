import { expect, test } from 'bun:test';
import { globalProviderHops, isUnavailableModel } from './upstream.server';

const names = ['Anthropic Revenda', 'Reserva Teste', 'Nexxus Pro'];
const accounts = names.map(name => ({ name, base_url: 'https://provider.test', api_secret_name: 'TEST', available_models: ['claude-sonnet-5', 'gpt-5.6-sol'] }));

test('Claude skips the Anthropic Revenda (9Router) reserve and keeps the saved order of the others', () => {
  expect(globalProviderHops(accounts, 'claude-sonnet-5', 'Reserva Teste', 'claude-sonnet-5').map(h => h.account.name)).toEqual(['Reserva Teste', 'Nexxus Pro']);
});
test('GPT follows the same fallback order without replacing it with Claude', () => {
  const hops = globalProviderHops(accounts, 'gpt-5.6-sol', 'Reserva Teste', 'gpt-5.6-sol');
  expect(hops.map(h => h.account.name)).toEqual(names);
  expect(hops.map(h => h.upstreamModel)).toEqual(Array(3).fill('gpt-5.6-sol'));
});
test('Claude hops retain the owner transport ID and skip the 9Router reserve', () => {
  const hops = globalProviderHops(accounts, 'claude-opus-5.2', 'Reserva Teste', 'claude-opus-5-2');
  expect(hops.map(h => [h.account.name, h.upstreamModel])).toEqual([
    ['Reserva Teste', 'claude-opus-5-2'], ['Nexxus Pro', 'claude-opus-5.2'],
  ]);
});
test('missing-model classifier remains specific while generic failover handles every upstream error', () => {
  expect(isUnavailableModel(400, 'Model not found')).toBe(true);
  expect(isUnavailableModel(400, 'Unsupported model')).toBe(true);
  expect(isUnavailableModel(400, 'Invalid messages')).toBe(false);
  expect(isUnavailableModel(403, 'Model not available')).toBe(false);
});
test('dedicated-only providers never enter the common chain', () => {
  const dedicated = ['Lauren API', 'FreeModel', 'FreeAPI Anthropic Revenda'].map(name => ({ name, base_url: 'https://provider.test', api_secret_name: 'TEST' }));
  expect(globalProviderHops([...accounts, ...dedicated], 'gpt-5.6-sol').map(h => h.account.name)).toEqual(names);
});
test('Tokens Token joins the common chain in saved order and keeps its dotted combo name', () => {
  const tokens = { name: 'Tokens Token', base_url: 'https://api.tokens-token.com/v1', api_secret_name: 'TEST', available_models: ['claude-opus-5.5', 'claude-fable-5.2'] };
  const reserva = { name: 'Reserva Teste', base_url: 'https://provider.test', api_secret_name: 'TEST', available_models: ['claude-opus-5.5'] };
  const anthropic = { name: 'Anthropic Revenda', base_url: 'https://provider.test', api_secret_name: 'TEST', available_models: ['claude-opus-5.5'] };
  const nexxus = { name: 'Nexxus Pro', base_url: 'https://provider.test', api_secret_name: 'TEST', available_models: ['claude-opus-5.5'] };
  const hops = globalProviderHops([reserva, tokens, anthropic, nexxus], 'claude-opus-5-5', 'Reserva Teste', 'claude-opus-5.5');
  expect(hops.map(h => h.account.name)).toEqual(['Reserva Teste', 'Tokens Token', 'Nexxus Pro']);
  expect(hops.find(h => h.account.name === 'Tokens Token')?.upstreamModel).toBe('claude-opus-5.5');
});
test('Tokens Token dedicated hop sends its dotted combo name for the hyphenated public model', async () => {
  const { forcedHop } = await import('./upstream.server');
  const tokens = { name: 'Tokens Token', base_url: 'https://api.tokens-token.com/v1', api_secret_name: 'TEST', available_models: ['claude-opus-5.5', 'claude-fable-5.2'] };
  expect(forcedHop(tokens, 'claude-opus-5-5').upstreamModel).toBe('claude-opus-5.5');
  expect(forcedHop(tokens, 'claude-fable-5-2').upstreamModel).toBe('claude-fable-5.2');
});
test('Nexxus Pro marked dedicated_only leaves the common chain but still serves its pinned key chain', async () => {
  const { forcedHop, isDedicatedOnly } = await import('./upstream.server');
  const anthropic = { name: 'Anthropic Revenda', base_url: 'https://provider.test', api_secret_name: 'TEST', available_models: ['claude-sonnet-5'] };
  const nexxus = { name: 'Nexxus Pro', base_url: 'https://provider.test', api_secret_name: 'TEST', available_models: ['claude-sonnet-5'], dedicated_only: true };
  expect(globalProviderHops([anthropic, nexxus], 'gpt-5.6-sol').map(h => h.account.name)).toEqual(['Anthropic Revenda']);
  expect(isDedicatedOnly(nexxus)).toBe(true);
  expect(isDedicatedOnly({ ...nexxus, dedicated_only: false })).toBe(false);
  expect(forcedHop(nexxus, 'claude-sonnet-5').account.name).toBe('Nexxus Pro');
});
