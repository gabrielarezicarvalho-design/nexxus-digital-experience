import { expect, test } from 'bun:test';
import { hasDailyReset, nextBrasiliaMidnight } from './daily-reset';

test('resets at the next midnight in Brasília (03:00 UTC)', () => {
    // 11/11 17:31 Brasília → 12/11 00:00 Brasília
    expect(nextBrasiliaMidnight(new Date('2026-11-11T20:31:00Z')).toISOString()).toBe('2026-11-12T03:00:00.000Z');
  });
test('late evening in Brasília still resets the same night', () => {
    // 11/11 23:59 Brasília is 12/11 02:59 UTC
    expect(nextBrasiliaMidnight(new Date('2026-11-12T02:59:00Z')).toISOString()).toBe('2026-11-12T03:00:00.000Z');
  });
test('exactly at midnight it points to the following midnight', () => {
    expect(nextBrasiliaMidnight(new Date('2026-11-12T03:00:00Z')).toISOString()).toBe('2026-11-13T03:00:00.000Z');
  });
test('only daily-ceiling monthly keys show a reset', () => {
    expect(hasDailyReset({ token_limit: null, daily_token_limit: 400_000_000 })).toBe(true);
    expect(hasDailyReset({ token_limit: 30_000_000, daily_token_limit: null })).toBe(false);
    expect(hasDailyReset({ token_limit: null, daily_token_limit: null })).toBe(false);
  });
