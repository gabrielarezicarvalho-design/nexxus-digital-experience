import { expect, test } from 'bun:test';
import { forcedHop, globalProviderHops } from './upstream.server';
const tokens = { name: 'Tokens Token', base_url: 'https://api.tokens-token.com/v1', api_secret_name: 'TEST', available_models: ['claude-opus-5.5', 'claude-sonnet-5.5', 'euatendo-promax', 'euatendo-claude', 'prime/claude-haiku-4-5', 'prime/claude-haiku-4-5-20251001', 'prime/claude-sonnet-4-6'] };
test('Tokens Token answers Opus with euatendo-promax and Sonnet with euatendo-claude', () => {
  expect(forcedHop(tokens, 'claude-opus-5-5').upstreamModel).toBe('euatendo-promax');
  expect(forcedHop(tokens, 'claude-sonnet-5.5').upstreamModel).toBe('euatendo-claude');
  expect(globalProviderHops([tokens], 'claude-opus-5.5')[0]?.upstreamModel).toBe('euatendo-promax');
});

test('Tokens Token answers Haiku 4.5 with its prime/ Haiku 4.5 instead of the rejected raw name', () => {
  expect(forcedHop(tokens, 'claude-haiku-4-5').upstreamModel).toBe('prime/claude-haiku-4-5');
  expect(forcedHop(tokens, 'claude-haiku-4.5').upstreamModel).toBe('prime/claude-haiku-4-5');
  expect(forcedHop(tokens, 'claude-haiku-4-5-20251001').upstreamModel).toBe('prime/claude-haiku-4-5-20251001');
  expect(globalProviderHops([tokens], 'claude-haiku-4-5')[0]?.upstreamModel).toBe('prime/claude-haiku-4-5');
});

test('Tokens Token answers other listed Claude IDs like Sonnet 4.6 with their prime/ model', () => {
  expect(forcedHop(tokens, 'claude-sonnet-4-6').upstreamModel).toBe('prime/claude-sonnet-4-6');
  expect(forcedHop(tokens, 'claude-sonnet-4.6').upstreamModel).toBe('prime/claude-sonnet-4-6');
  expect(globalProviderHops([tokens], 'claude-sonnet-4-6')[0]?.upstreamModel).toBe('prime/claude-sonnet-4-6');
  expect(forcedHop(tokens, 'claude-opus-5-5').upstreamModel).toBe('euatendo-promax');
});
