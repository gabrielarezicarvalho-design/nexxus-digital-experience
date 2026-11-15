import { expect, test } from 'bun:test';
import { monthlyPlanPreviews, monthlyPreviewCanCheckout } from './monthly-plan-preview';

test('monthly prices: Pro 89.90, Max 164.90, Enterprise 650, Teams 1450 reais', () => {
  expect(monthlyPlanPreviews.map(plan => plan.priceCents)).toEqual([8990, 16490, 65000, 145000]);
});

test('monthly plans are open for checkout with their plan codes', () => {
  expect(monthlyPreviewCanCheckout()).toBe(true);
  expect(monthlyPlanPreviews.map(plan => plan.code)).toEqual(['cc_monthly_pro', 'cc_monthly_max', 'cc_monthly_enterprise', 'cc_monthly_teams']);
});
