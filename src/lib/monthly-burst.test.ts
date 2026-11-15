import { expect, test } from 'bun:test';
import { monthlyBurstLimit, monthlyBurstMessage, MONTHLY_BURST_PAUSE_MS, keyBurstLimit, keyBurstMessage } from './monthly-burst';

test('hourly ceilings: Pro 100M, Max 100M, Enterprise 200M, Teams 250M', () => {
  expect(monthlyBurstLimit('Pro')).toBe(100_000_000);
  expect(monthlyBurstLimit('Max')).toBe(100_000_000);
  expect(monthlyBurstLimit('Enterprise')).toBe(200_000_000);
  expect(monthlyBurstLimit('Teams')).toBe(250_000_000);
});

test('token packages have no hourly ceiling', () => {
  expect(monthlyBurstLimit('Claude 20x')).toBeNull();
  expect(monthlyBurstLimit(null)).toBeNull();
});

test('window lasts one hour', () => {
  expect(MONTHLY_BURST_PAUSE_MS).toBe(3_600_000);
});

test('message shows hourly amount, release time in Brasília and next plan', () => {
  const msg = monthlyBurstMessage('Enterprise', '2026-11-11T01:40:00Z');
  expect(msg.includes('200 milhões de tokens por hora')).toBe(true);
  expect(msg.includes('22:40')).toBe(true);
  expect(msg.includes('plano Teams')).toBe(true);
});

test('per-key override: 250M every 5 hours wins over plan and reaches token packages', () => {
  const key = { plano: 'Essencial 750M', reseller_id: null, burst_token_limit: 250_000_000, burst_window_minutes: 300 };
  expect(keyBurstLimit(key)).toBe(250_000_000);
  expect(keyBurstLimit({ plano: 'Essencial 750M', reseller_id: null })).toBeNull();
  expect(keyBurstLimit({ plano: 'Pro', reseller_id: null })).toBe(100_000_000);
  const msg = keyBurstMessage(key, '2026-11-11T23:00:00Z');
  expect(msg.includes('250 milhões de tokens a cada 5 horas')).toBe(true);
  expect(msg.includes('20:00')).toBe(true);
});

test('sk-nx-dWxuhJ rule: 200M then a 5-hour wait', () => {
  const key = { plano: 'Essencial 750M', reseller_id: null, burst_token_limit: 200_000_000, burst_window_minutes: 300, burst_pause_minutes: 300 };
  expect(keyBurstLimit(key)).toBe(200_000_000);
  const msg = keyBurstMessage(key, '2026-11-13T01:10:00Z');
  expect(msg.includes('200 milhões de tokens')).toBe(true);
  expect(msg.includes('Espera de 5 horas')).toBe(true);
  expect(msg.includes('22:10')).toBe(true);
});
