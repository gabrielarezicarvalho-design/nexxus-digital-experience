import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fillUsageDays, modelPeriodRows } from './client-usage';

test('client chart includes 30 days and preserves commands and tokens', () => {
  const days = fillUsageDays([{ day:'2026-10-07', requests:9, tokens:1200 }], new Date('2026-10-07T19:25:00Z'));
  assert.equal(days.length,30);
  assert.deepEqual(days[29], { day:'2026-10-07', requests:9, tokens:1200 });
  assert.equal(days[0]?.day,'2026-09-08');
  assert.equal(days.reduce((sum,row) => sum + row.requests,0),9);
});
test('client chart day follows Brasília rather than UTC midnight', () => {
  const days = fillUsageDays([],new Date('2026-10-08T01:30:00Z'));
  assert.equal(days[29]?.day,'2026-10-07');
});
test('model period rows aggregate by Brasilia day window and sort by tokens', () => {
  const now = new Date('2026-10-31T15:00:00Z'); // 31/10 em Brasília
  const rows = modelPeriodRows([
    { day: '2026-10-31', model: 'claude-sonnet-5', requests: 10, tokens: 1000 },
    { day: '2026-10-30', model: 'claude-sonnet-5', requests: 5, tokens: 500 },
    { day: '2026-10-31', model: 'claude-opus-5-5', requests: 2, tokens: 3000 },
    { day: '2026-10-20', model: 'claude-opus-5-5', requests: 9, tokens: 9000 },
    { day: '2026-10-31', model: null, requests: 1, tokens: 100 },
  ], 7, now);
  assert.equal(rows[0]?.model, 'claude-opus-5-5');
  assert.equal(rows[0]?.tokens, 3000);
  assert.equal(rows[0]?.requests, 2);
  assert.equal(rows[1]?.model, 'claude-sonnet-5');
  assert.equal(rows[1]?.tokens, 1500);
  assert.equal(rows[2]?.model, 'Não informado');
  assert.equal(rows[0]?.percent, 65);
});

test('model period rows for hoje only count the current Brasilia day', () => {
  const now = new Date('2026-10-31T15:00:00Z');
  const rows = modelPeriodRows([
    { day: '2026-10-31', model: 'claude-sonnet-5', requests: 3, tokens: 300 },
    { day: '2026-10-30', model: 'claude-sonnet-5', requests: 7, tokens: 700 },
  ], 1, now);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.tokens, 300);
  assert.equal(rows[0]?.percent, 100);
});
