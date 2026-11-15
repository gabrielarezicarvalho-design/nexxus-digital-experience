import { expect, test } from 'bun:test';
import { routingDiagnostic, parseRoutingDiagnostic, sanitizeProviderCause } from './upstream-diagnostics';
import { maskUpstreamModel } from './upstream.server';

test('failure diagnostics preserve 502 cause even when final request succeeds', () => {
  const attempts = [{ provider: 'GhostCLI', model: 'claude-sonnet-5', status: 502, latencyMs: 45722, cause: 'error code: 502' }];
  expect(parseRoutingDiagnostic(routingDiagnostic(undefined, attempts))).toEqual({ error: null, attempts });
});
test('diagnostics never retain supplied credentials or upstream URLs', () => {
  const text = sanitizeProviderCause('private-value Bearer leaked cc_example fm_example https://provider.test/v1', ['private-value']);
  expect(text.includes('private-value')).toBe(false);
  expect(text.includes('leaked')).toBe(false);
  expect(text.includes('cc_example')).toBe(false);
  expect(text.includes('fm_example')).toBe(false);
  expect(text.includes('provider.test')).toBe(false);
});
test('reserve streaming keeps the requested public model even if pool reports another name', () => {
  expect(maskUpstreamModel('data: {"model": "internal-pool","choices":[]}\n\n', 'claude-sonnet-5', 'claude-sonnet-5')).toBe('data: {"model":"claude-sonnet-5","choices":[]}\n\n');
});