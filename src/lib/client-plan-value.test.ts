import { expect, test } from 'bun:test';
import { clientPlanValue } from './client-plan-value';
const key = { id: 'key', plano: 'Mensal 20x', client_id: 'client' };
const plans = [{ id: 'plan', code: 'cc_mensal_20x', name: 'Mensal 20x', price_cents: 20990 }];
test('Mensal 20x resolves catalog value even when client has no plan_id', () => {
  expect(clientPlanValue(key, plans, [{ id: 'client', plan_id: null }], [])).toBe(20990);
});
test('approved purchase must belong to the exact key, never a top-up or another key', () => {
  const payments = [
    { status: 'approved', api_key_id: 'other', upgrade_key_id: null, amount_cents: 1 },
    { status: 'approved', api_key_id: 'key', upgrade_key_id: 'key', amount_cents: 2 },
    { status: 'pending', api_key_id: 'key', upgrade_key_id: null, amount_cents: 3 },
    { status: 'approved', api_key_id: 'key', upgrade_key_id: null, amount_cents: 19900 },
  ];
  expect(clientPlanValue(key, plans, [], payments)).toBe(19900);
  expect(clientPlanValue(key, plans, [], payments.slice(0, 3))).toBe(20990);
});
test('assigned plan stays tied to the key owner and missing values stay unknown', () => {
  expect(clientPlanValue({ ...key, plano: 'Legacy' }, plans, [{ id: 'other', plan_id: 'plan' }], [])).toBeNull();
  expect(clientPlanValue({ ...key, plano: 'Legacy' }, plans, [{ id: 'client', plan_id: 'plan' }], [])).toBe(20990);
});