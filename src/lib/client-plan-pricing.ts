import type { ModelPriceCatalog } from './client-model-pricing';
import { sumUsageCost, planReferenceBalance, type PricedUsage } from './client-usage-pricing';

/** Adaptive reference allocation, not a charge: same factor preserves all tariff ratios. */
export function adjustedPlanPrices(base: ModelPriceCatalog, planCents: number | null, quota: { limit: number | null; used: number } | null, rows: PricedUsage[], allowed: string[]) {
  if (planCents == null || planCents <= 0 || !quota?.limit || quota.limit <= 0) return null;
  const rawCost = sumUsageCost(rows, base);
  const balance = planReferenceBalance(planCents, quota);
  if (balance == null || rawCost == null) return null;
  const spent = planCents - balance;
  const samples = allowed.flatMap(id => base[id] ? [base[id]] : []);
  const mean = samples.length ? samples.reduce((s, p) => s + (p.inputBrl * 3 + p.outputBrl) / 4 * 100, 0) / samples.length : 0;
  const factor = rawCost > 0 ? spent / rawCost : mean > 0 ? planCents / quota.limit * 1_000_000 / mean : null;
  if (factor == null || !Number.isFinite(factor) || factor < 0) return null;
  return Object.fromEntries(Object.entries(base).map(([id, p]) => [id, { ...p, input: p.input * factor, output: p.output * factor, inputBrl: p.inputBrl * factor, outputBrl: p.outputBrl * factor }])) as ModelPriceCatalog;
}