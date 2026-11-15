import { expect, test } from 'bun:test';
import { NEXXUS_WINDOW_TOKEN_LIMIT, NEXXUS_WINDOW_SECONDS, providerWindowReset, isNexxusHourlyLimit, nexxusHourlyReset, NEXXUS_HOURLY_INPUT_LIMIT, NEXXUS_HOURLY_PAUSE_MS, skipHourlyPaused } from './nexxus-hourly-limit';

test('Nexxus has 100 million input tokens per hour and a two-hour pause', () => {
  expect(NEXXUS_HOURLY_INPUT_LIMIT).toBe(100_000_000);
  expect(NEXXUS_HOURLY_PAUSE_MS).toBe(7_200_000);
  expect(isNexxusHourlyLimit('Nexxus Pro', 429, 'Hourly input token quota exceeded')).toBe(true);
  expect(isNexxusHourlyLimit('Nexxus Pro', 429, 'Limite de tokens por hora atingido')).toBe(true);
});
test('hourly throttle never includes credit or credential restrictions', () => {
  expect(isNexxusHourlyLimit('Nexxus Pro', 429, 'Hourly token limit: insufficient credit')).toBe(false);
  expect(isNexxusHourlyLimit('Nexxus Pro', 403, 'Hourly token limit exceeded')).toBe(false);
  expect(isNexxusHourlyLimit('Invision', 429, 'Hourly token limit exceeded')).toBe(false);
});
test('reset follows Retry-After or the one-hour pause, not ten-minute cooldown', () => {
  const now = Date.parse('2026-11-01T23:00:00Z');
  expect(nexxusHourlyReset(new Headers(), now)).toBe(now + 7_200_000);
  expect(nexxusHourlyReset(new Headers({ 'Retry-After': '600' }), now)).toBe(now + 600_000);
  expect(nexxusHourlyReset(new Headers({ 'Retry-After': 'Sun, 01 Nov 2026 23:30:00 GMT' }), now)).toBe(now + 1_800_000);
});
test('paused supplier is excluded for every model without introducing new dedicated suppliers', () => {
  const hops = [{ account: { name: 'Nexxus Pro' } }, { account: { name: 'Invision' } }];
  expect(skipHourlyPaused(hops, new Set(['Nexxus Pro']))).toEqual([hops[1]]);
  expect(skipHourlyPaused(hops.slice(0, 1), new Set(['Nexxus Pro']))).toEqual([]);
  expect(skipHourlyPaused(hops, new Set())).toEqual(hops);
});
test('two-hour usage limit message pauses Nexxus', () => {
  expect(isNexxusHourlyLimit('Nexxus Pro', 429, 'Voce atingiu o limite de uso das ultimas 2 horas. Ele libera sozinho ao longo das proximas 2 horas')).toBe(true);
  expect(NEXXUS_HOURLY_PAUSE_MS).toBe(7_200_000);
});

test('Nexxus fixed cap is 107 million tokens every two hours', () => {
  expect(NEXXUS_WINDOW_TOKEN_LIMIT).toBe(107_000_000);
  expect(NEXXUS_WINDOW_SECONDS).toBe(7200);
  expect(providerWindowReset(7200, Date.parse('2026-11-12T21:47:00Z'))).toBe(Date.parse('2026-11-12T22:00:00Z'));
  expect(providerWindowReset(7200, Date.parse('2026-11-12T22:00:00Z'))).toBe(Date.parse('2026-11-13T00:00:00Z'));
});
test('Felipe chain: exhausted Nexxus goes to Anthropic, then Nexxus returns after reset', () => {
  const hops = [{ account: { name: 'Nexxus Pro' } }, { account: { name: 'Anthropic Revenda' } }];
  expect(skipHourlyPaused(hops, new Set(['Nexxus Pro']))).toEqual([hops[1]]);
  expect(skipHourlyPaused(hops, new Set())[0]).toEqual(hops[0]);
});
