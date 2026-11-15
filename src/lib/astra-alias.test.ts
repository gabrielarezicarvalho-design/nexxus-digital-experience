import { test, expect } from 'bun:test';
import { astraAliasAvailable, apiModelLabel, ASTRA_TARGET } from './astra-alias';
test('Astra uses only the requested available combo on Anthropic Revenda', () => {
  expect(ASTRA_TARGET).toBe('gpt-6-astra');
  expect(astraAliasAvailable('Anthropic Revenda', [ASTRA_TARGET])).toBe(true);
  expect(astraAliasAvailable('Reserva Teste', [ASTRA_TARGET])).toBe(false);
  expect(astraAliasAvailable('Anthropic Revenda', [])).toBe(false);
});
test('Astra does not fall back to the retired Luna transport', () => {
  expect(astraAliasAvailable('Anthropic Revenda', ['cx/gpt-5.6-luna'])).toBe(false);
});