import { test, expect } from 'bun:test';
import { clientUsageRate, remainingKeyTokens, type ClientUsage } from './admin-client-usage';

test('client success rate counts 502 as an error again', () => {
  const stats = { requests: 10, errors: 3, excluded502: 2 } as ClientUsage['stats'];
  expect(clientUsageRate(stats)).toBe(70);
});
test('Felipe 502 are excluded from success rate without removing real errors', () => {
  const stats = { requests: 10, errors: 3, excluded502: 2, rateExcluded502: 2, rateExcluded502Errors: 2 } as ClientUsage['stats'];
  expect(clientUsageRate(stats)).toBe(87.5);
  expect(stats.errors).toBe(3);
});
test('client limits, denied models and 22 other errors leave only operational failures in the rate', () => {
  const stats = { requests: 35, errors: 27, rateExcluded502: 25, rateExcluded502Errors: 25 } as ClientUsage['stats'];
  expect(clientUsageRate(stats)).toBe(80);
  expect(stats.errors).toBe(27);
});
test('monthly keys never invent a stored token balance', () => {
  expect(remainingKeyTokens({ token_limit: null, daily_token_limit: null, tokens_used: 100 } as ClientUsage['key'], 50)).toBeNull();
});
test('daily balance uses today rather than lifetime consumption', () => {
  expect(remainingKeyTokens({ token_limit: null, daily_token_limit: 1000, tokens_used: 5000 } as ClientUsage['key'], 250)).toBe(750);
});
test('exhausted packages show zero remaining tokens', () => {
  expect(remainingKeyTokens({ token_limit: 1000, daily_token_limit: null, tokens_used: 1100 } as ClientUsage['key'], 0)).toBe(0);
});