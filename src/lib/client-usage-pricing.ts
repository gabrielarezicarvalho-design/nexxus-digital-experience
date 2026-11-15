import { displayedConsumption, displayedModelPrice, type ModelPriceCatalog } from './client-model-pricing';

/** Maps logged aliases (provider prefixes, dashed versions, tiers) to a priced Modelos ID for estimates only. */
export function usagePriceModel(raw: string, catalog?: ModelPriceCatalog): string | null {
  const id = raw.trim().toLowerCase().replace(/^(anthropic|openai)\//, '').replace(/^(devhub|nexa)-/, '').replace(/^cloud-/, 'claude-').replace(/(\d)-(\d)/g, '$1.$2');
  if (displayedModelPrice(id, catalog)) return id;
  if (/opus|mythos/.test(id)) return 'claude-opus-5.5';
  if (/fable/.test(id)) return 'claude-fable-5.1';
  if (/haiku/.test(id)) return 'claude-haiku-4.5';
  if (/sonnet|^claude(-(fast|balanced|best))?$|^(fast|balanced|best)$/.test(id)) return 'claude-sonnet-5';
  if (/^gpt/.test(id)) return 'gpt-6-astra';
  return null;
}
export type PricedUsage = { model: string | null; tokens?: number; prompt_tokens?: number; completion_tokens?: number };
export function usageCostCents(row: PricedUsage, catalog?: ModelPriceCatalog): number | null {
  if (row.tokens === 0 || (row.prompt_tokens === 0 && row.completion_tokens === 0 && !row.tokens)) return 0;
  const model = row.model ? usagePriceModel(row.model, catalog) : null;
  if (!model || row.prompt_tokens == null || row.completion_tokens == null) return null;
  const cost = displayedConsumption(model, row.prompt_tokens, row.completion_tokens, catalog);
  return cost ? cost.totalBrl * 100 : null;
}
export function sumUsageCost(rows: PricedUsage[], catalog?: ModelPriceCatalog): number | null {
  let total = 0;
  for (const row of rows) {
    const cost = usageCostCents(row, catalog);
    if (cost == null) return null;
    total += cost;
  }
  return total;
}
export function dailyUsageCost(rows: (PricedUsage & { day: string })[], day: string, tokens: number, catalog?: ModelPriceCatalog): number | null {
  const matches = rows.filter(row => row.day === day);
  return matches.length ? sumUsageCost(matches, catalog) : tokens === 0 ? 0 : null;
}

/** Reference balance only; never changes gateway quotas or payment accounting. */
export function planReferenceBalance(planCents: number | null, quota: { limit: number | null; used: number } | null): number | null {
  if (planCents == null || !Number.isFinite(planCents) || planCents < 0) return null;
  if (!quota || !Number.isFinite(quota.used) || quota.used < 0) return null;
  if (quota.limit == null) return planCents;
  if (!Number.isFinite(quota.limit) || quota.limit <= 0) return null;
  const remainingTokens = Math.max(0, quota.limit - quota.used);
  if (remainingTokens === 0) return 0;
  // Keep at least one visible cent while there are tokens left.
  return Math.min(planCents, Math.max(1, planCents * remainingTokens / quota.limit));
}
/** Compares plan-adjusted call cost with the unadjusted Modelos reference tariffs; display only. */
export function callsSavings(rows: PricedUsage[], catalog?: ModelPriceCatalog) {
  const paid = sumUsageCost(rows, catalog);
  const official = sumUsageCost(rows);
  if (paid == null || official == null) return { paid, official, savings: null, percent: null };
  const savings = Math.max(0, official - paid);
  return { paid, official, savings, percent: official > 0 ? savings / official * 100 : 0 };
}

/** Valor que o desconto de cache poupou: tokens descontados precificados como entrada no catálogo do plano. Só exibição. */
export function cacheSavingsCents(rows: { model: string | null; discount_tokens: number }[], catalog?: ModelPriceCatalog): number | null {
  return sumUsageCost(rows.filter(r => r.discount_tokens > 0).map(r => ({ model: r.model, prompt_tokens: r.discount_tokens, completion_tokens: 0 })), catalog);
}
