import { test } from 'node:test';
import assert from 'node:assert/strict';
import { approvedRevenue, periodStart, resellerTotals, registeredInPeriod, activePlanDistribution, type BusinessData, type BusinessClient, type BusinessPayment, type BusinessKey, type BusinessPayout } from './business-metrics';

test('faturamento diário, semanal e mensal inclui apenas pagamentos aprovados dentro do período', () => {
  const now = new Date('2026-10-11T19:46:00Z');
  const payments: BusinessPayment[] = [
    { status: 'approved', amount_cents: 1000, approved_at: '2026-10-11T03:01:00Z' },
    { status: 'approved', amount_cents: 2000, approved_at: '2026-10-05T12:00:00Z' },
    { status: 'approved', amount_cents: 3000, approved_at: '2026-09-20T12:00:00Z' },
    { status: 'pending', amount_cents: 9000, created_at: '2026-10-11T12:00:00Z' },
  ].map(p => ({ id: 'test', name: 'Teste', email: 'test@example.com', plan_code: 'test', client_id: null, api_key_id: null, created_at: '2026-10-01T12:00:00Z', approved_at: null, ...p }));
  assert.equal(approvedRevenue(payments, periodStart(1, now), now), 1000);
  assert.equal(approvedRevenue(payments, periodStart(7, now), now), 3000);
  assert.equal(approvedRevenue(payments, periodStart(30, now), now), 6000);
});
test('repasse de cada revendedor usa custos reais menos apenas repasses aprovados', () => {
  const keys = [{ reseller_id: 'a', reseller_cost_cents: 2990 }, { reseller_id: 'a', reseller_cost_cents: 2990 }, { reseller_id: 'b', reseller_cost_cents: 5000 }] as BusinessKey[];
  const payouts = [{ reseller_id: 'a', status: 'approved', amount_cents: 2990 }, { reseller_id: 'a', status: 'pending', amount_cents: 2990 }] as BusinessPayout[];
  assert.deepEqual(resellerTotals(keys, payouts, 'a'), { count: 2, generated: 5980, paid: 2990, pending: 2990 });
});
test('Hoje, 7, 30 e 90 dias filtram cadastros pelo horário de Brasília', () => {
  const now = new Date('2026-10-22T02:31:00Z');
  const clients = ['2026-10-21T03:00:00Z','2026-10-16T12:00:00Z','2026-10-01T12:00:00Z','2026-08-01T12:00:00Z'].map((created_at,i) => ({ id: String(i), user_id: String(i), created_at })) as BusinessClient[];
  assert.deepEqual([1,7,30,90].map(days => registeredInPeriod(clients, days, now).length), [1,2,3,4]);
});
test('planos em uso excluem bloqueadas, expiradas e sem saldo, sem depender da venda do catálogo', () => {
  const now = new Date('2026-10-22T02:31:00Z');
  const base = { plano: '5 milhões', status: 'active', created_at: '2026-10-21T12:00:00Z', expires_at: null, token_limit: 5000000, tokens_used: 0 };
  const data = { plans: [{ name: '5 milhões', active: false }], keys: [base, {...base,status:'blocked'}, {...base,reseller_blocked:true}, {...base,tokens_used:5000000}, {...base,expires_at:'2026-10-21T12:00:00Z'}, {...base,created_at:'2026-09-01T12:00:00Z'}] } as BusinessData;
  assert.deepEqual(activePlanDistribution(data, 7, now), [{ name: '5 milhões', count: 1 }]);
});