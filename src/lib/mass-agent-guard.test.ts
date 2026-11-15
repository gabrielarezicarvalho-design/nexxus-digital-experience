import { expect, test } from 'bun:test';
import { MASS_AGENT_DETECT_FACTOR, MASS_AGENT_RELEASE_MINUTES, MASS_AGENT_THROTTLE_RPM, rpmRefusal } from './mass-agent-guard';

test('detected mass-dispatch keys are reduced to 5 requests per minute', () => {
  expect(MASS_AGENT_THROTTLE_RPM).toBe(5);
});

test('detection triggers at twice the key limit within one minute', () => {
  expect(MASS_AGENT_DETECT_FACTOR).toBe(2);
});

test('throttle lifts after 10 minutes without exceeding the reduced limit', () => {
  expect(MASS_AGENT_RELEASE_MINUTES).toBe(10);
});

test('throttled refusal uses the mass-agent message, normal refusal keeps the RPM message', () => {
  const t = rpmRefusal({ blocked: true, throttled: true, effective_rpm: 5, attempts: 9, until_at: null });
  expect(t?.log).toBe('agente em massa: limite 5 RPM');
  expect(t?.message.includes('5 requisições por minuto')).toBe(true);
  const n = rpmRefusal({ blocked: true, throttled: false, effective_rpm: 50, attempts: 50, until_at: null });
  expect(n?.log).toBe('rate limit');
  expect(rpmRefusal({ blocked: false, throttled: true, effective_rpm: 5, attempts: 2, until_at: null })).toBeNull();
});
