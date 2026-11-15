import { sumUsageCost, usageCostCents } from './client-usage-pricing';
import type { ModelPriceCatalog } from './client-model-pricing';
export type ModelTokens = { model: string; tokens: number; prompt_tokens?: number; completion_tokens?: number };

// Preços públicos de referência por 1M tokens (USD, média entrada/saída).
const USD_PER_MILLION: Array<[RegExp, number]> = [
  [/opus/i, 45],
  [/sonnet/i, 9],
  [/fable/i, 9],
  [/haiku/i, 2.4],
  [/astra|terra|luna|gpt/i, 5.6],
];
const DEFAULT_USD_PER_MILLION = 9;
export const USD_TO_BRL = 5.4;

export function modelRateUsdPerMillion(model: string): number {
  for (const [pattern, rate] of USD_PER_MILLION) if (pattern.test(model)) return rate;
  return DEFAULT_USD_PER_MILLION;
}

export function estimateModelCostCents(model: string, tokens: number): number {
  if (!Number.isFinite(tokens) || tokens <= 0) return 0;
  return Math.round((tokens / 1_000_000) * modelRateUsdPerMillion(model) * USD_TO_BRL * 100);
}

export type SavingsRow = { model: string; tokens: number; costCents: number | null };
export type SavingsSummary = {
  rows: SavingsRow[];
  payPerTokenCents: number | null;
  subscriptionCents: number | null;
  consumedCents: number | null;
  savingsCents: number | null;
  ratio: number | null;
};

export function savingsSummary(models: ModelTokens[], subscriptionCents: number | null, catalog: ModelPriceCatalog, adjustedCatalog: ModelPriceCatalog | null): SavingsSummary {
  const rows = models.filter(m => m.tokens > 0)
    .map(m => ({ model: m.model, tokens: m.tokens, costCents: usageCostCents(m, catalog) }))
    .sort((a, b) => (b.costCents ?? -1) - (a.costCents ?? -1));
  const payPerTokenCents = rows.some(r => r.costCents == null) ? null : rows.reduce((sum, r) => sum + (r.costCents ?? 0), 0);
  const subscription = subscriptionCents != null && Number.isFinite(subscriptionCents) && subscriptionCents >= 0 ? Math.round(subscriptionCents) : null;
  // Compare the same consumed tokens, not partial use against the entire prepaid package.
  const consumedCents = adjustedCatalog != null ? sumUsageCost(models, adjustedCatalog) : null;
  const savingsCents = payPerTokenCents != null && consumedCents != null ? Math.max(0, payPerTokenCents - consumedCents) : null;
  const ratio = consumedCents != null && consumedCents > 0 && payPerTokenCents != null && payPerTokenCents > 0 ? payPerTokenCents / consumedCents : null;
  return { rows, payPerTokenCents, subscriptionCents: subscription, consumedCents, savingsCents, ratio };
}
