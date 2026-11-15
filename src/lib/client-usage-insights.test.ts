import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modelUsageInsights, usageInsights } from './client-usage-insights';
import type { ClientUsage } from './client-usage';

const now = new Date('2026-10-31T02:13:00Z');
const daily = [
  { day: '2026-10-01', requests: 2, tokens: 100 },
  { day: '2026-10-27', requests: 1, tokens: 200 },
  { day: '2026-10-28', requests: 3, tokens: 600 },
  { day: '2026-10-29', requests: 2, tokens: 300 },
  { day: '2026-10-30', requests: 4, tokens: 500 },
];
test('period totals preserve real usage and Brasília day', () => {
  const result = usageInsights(daily, 7, now);
  assert.deepEqual(result.today, { requests: 4, tokens: 500 });
  assert.deepEqual(result.week, { requests: 10, tokens: 1600 });
  assert.deepEqual(result.month, { requests: 12, tokens: 1700 });
  assert.equal(usageInsights(daily, 1, now).total.tokens, 500);
});
test('activity and streaks count days with requests, best day ranks tokens', () => {
  const result = usageInsights(daily, 30, now);
  assert.equal(result.activeDays, 5);
  assert.equal(result.currentStreak, 4);
  assert.equal(result.bestStreak, 4);
  assert.equal(result.bestDay?.day, '2026-10-28');
  assert.equal(result.weekPeak, 600);
});
test('empty usage has no invented activity or best day', () => {
  const result = usageInsights([], 30, now);
  assert.equal(result.currentStreak, 0);
  assert.equal(result.bestStreak, 0);
  assert.equal(result.bestDay, undefined);
  assert.deepEqual(result.total, { requests: 0, tokens: 0 });
});

const usage: ClientUsage = {
  total_requests: 20, today_requests: 7, total_tokens: 900, models_used: 2, daily: [], by_model: [],
  daily_by_model: [
    { day: '2026-10-01', model: 'old-model', requests: 10, tokens: 100 },
    { day: '2026-10-29', model: 'opus', requests: 4, tokens: 300 },
    { day: '2026-10-30', model: 'sonnet', requests: 3, tokens: 200 },
    { day: '2026-10-30', model: 'opus', requests: 2, tokens: 300 },
    { day: '2026-10-30', model: null, requests: 2, tokens: 0 },
  ], today_average_latency_ms: 1750, today_latency_samples: 5,
};
test('favorite uses recorded requests only within the selected period', () => {
  assert.equal(modelUsageInsights(usage, 7, now).favorite?.model, 'opus');
  assert.equal(modelUsageInsights(usage, 7, now).favorite?.requests, 6);
  assert.equal(modelUsageInsights(usage, 1, now).favorite?.model, 'sonnet');
  assert.equal(modelUsageInsights(usage, 30, now).favorite?.model, 'old-model');
});
test('today model tokens and requests use Brasília day, including unknown names without guessing', () => {
  assert.deepEqual(modelUsageInsights(usage, 7, now).todayModels, [
    { model: 'opus', requests: 2, tokens: 300 },
    { model: 'sonnet', requests: 3, tokens: 200 },
    { model: 'Não informado', requests: 2, tokens: 0 },
  ]);
  assert.deepEqual(modelUsageInsights(usage, 7, new Date('2026-10-31T03:01:00Z')).todayModels, []);
});
test('latency uses recorded samples and never converts missing data into zero', () => {
  assert.equal(modelUsageInsights(usage, 30, now).averageLatencyMs, 1750);
  for (const value of [null, -1, NaN]) {
    assert.equal(modelUsageInsights({ ...usage, today_average_latency_ms: value }, 30, now).averageLatencyMs, null);
  }
  const { today_average_latency_ms: _missing, ...withoutLatency } = usage;
  assert.equal(modelUsageInsights(withoutLatency, 30, now).averageLatencyMs, null);
  assert.equal(modelUsageInsights({ ...usage, today_latency_samples: 0 }, 30, now).averageLatencyMs, null);
  assert.equal(modelUsageInsights({ ...usage, today_average_latency_ms: 0 }, 30, now).averageLatencyMs, 0);
  assert.equal(modelUsageInsights(undefined, 30, now).favorite, undefined);
});