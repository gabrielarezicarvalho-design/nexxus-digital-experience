import { expect, test } from 'bun:test';
import { adjustedPlanPrices } from './client-plan-pricing';
import { sumUsageCost, planReferenceBalance } from './client-usage-pricing';
const close = (a: number | null | undefined, b: number) => expect(a == null ? null : Math.round(a * 1e8)).toBe(Math.round(b * 1e8));
const base = { 'claude-sonnet-5': { input: 1, output: 5, inputBrl: 5.4, outputBrl: 27, estimated: false }, 'claude-opus-5.5': { input: 3, output: 15, inputBrl: 16.2, outputBrl: 81, estimated: true } };
const rows = [{ model: 'claude-sonnet-5', prompt_tokens: 3_000_000, completion_tokens: 1_000_000 }, { model: 'claude-opus-5.5', prompt_tokens: 500_000, completion_tokens: 500_000 }];
test('mixed model adjusted spending plus balance equals the clients own plan', () => {
 const quota = { limit: 30_000_000, used: 5_000_000 };
 const prices = adjustedPlanPrices(base, 3490, quota, rows, Object.keys(base));
 expect(prices == null).toBe(false);
 close(sumUsageCost(rows, prices ?? {}), 3490 / 6);
 close((sumUsageCost(rows, prices ?? {}) ?? 0) + (planReferenceBalance(3490, quota) ?? 0), 3490);
 close((prices?.['claude-opus-5.5']?.inputBrl ?? 0) / (prices?.['claude-sonnet-5']?.inputBrl ?? 1), 3);
 close((prices?.['claude-sonnet-5']?.outputBrl ?? 0) / (prices?.['claude-sonnet-5']?.inputBrl ?? 1), 5);
});
test('full token exhaustion allocates exactly the entire plan without early zero', () => {
 const prices = adjustedPlanPrices(base, 3490, { limit: 5_000_000, used: 5_000_000 }, rows, Object.keys(base));
 close(sumUsageCost(rows, prices ?? {}), 3490);
 const almost = { limit: 5_000_000, used: 4_999_999 };
 const near = adjustedPlanPrices(base, 3490, almost, rows, Object.keys(base));
 close(sumUsageCost(rows, near ?? {}), 3489);
 expect(planReferenceBalance(3490, almost)).toBe(1);
});
test('different plans have different adjusted prices and missing data remains explicit', () => {
 const q = { limit: 30_000_000, used: 5_000_000 };
 const a = adjustedPlanPrices(base, 3490, q, rows, Object.keys(base));
 const b = adjustedPlanPrices(base, 6980, q, rows, Object.keys(base));
 close(b?.['claude-sonnet-5']?.inputBrl, (a?.['claude-sonnet-5']?.inputBrl ?? 0) * 2);
 expect(adjustedPlanPrices(base, null, q, rows, [])).toBeNull();
 expect(adjustedPlanPrices(base, 3490, q, [{model:'unknown',prompt_tokens:1,completion_tokens:1}], [])).toBeNull();
 expect((adjustedPlanPrices(base, 3490, {...q, used:0}, [], Object.keys(base))?.['claude-sonnet-5']?.inputBrl ?? 0) > 0).toBe(true);
});
test('saved model price changes update the relative model prices without changing the plan total', () => {
 const changed = { ...base, 'claude-opus-5.5': { ...base['claude-opus-5.5'], input:6, output:30, inputBrl:32.4, outputBrl:162 } };
 const prices = adjustedPlanPrices(changed, 3490, { limit:30_000_000, used:5_000_000 }, rows, Object.keys(changed));
 close((prices?.['claude-opus-5.5']?.inputBrl ?? 0) / (prices?.['claude-sonnet-5']?.inputBrl ?? 1), 6);
 close(sumUsageCost(rows, prices ?? {}), 3490 / 6);
});
test('daily plan resets its reference balance with the daily quota', () => {
 const value = 20990;
 expect(planReferenceBalance(value, {limit:500_000_000, used:500_000_000})).toBe(0);
 expect(planReferenceBalance(value, {limit:500_000_000, used:0})).toBe(value);
 close(planReferenceBalance(value, {limit:500_000_000, used:250_000_000}), 10495);
});