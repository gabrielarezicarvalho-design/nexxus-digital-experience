import { USD_TO_BRL } from './usage-savings';

export const PRICE_TOKEN_UNIT = 1_000_000;
export type ModelPriceCatalog = Record<string, { input: number; output: number; estimated: boolean; inputBrl: number; outputBrl: number }>;
// Presentation aliases only: never feed these additions into usage or plan allocation.
const DISPLAY_PRICE_ALIASES: Record<string, string> = {
  'gemini 4 argon': 'gpt-6-sol',
  'gpt 6 astra': 'gpt-6-astra',
  'gpt-5.7-luna': 'gpt-5.6-luna',
  'gpt-5.7-terra': 'gpt-5.6-terra',
};

export function modelDisplayPrices(catalog: ModelPriceCatalog): ModelPriceCatalog {
  const display = { ...catalog };
  for (const [alias, reference] of Object.entries(DISPLAY_PRICE_ALIASES)) {
    if (display[alias] || !catalog[reference]) continue;
    display[alias] = { ...catalog[reference], estimated: true };
  }
  return display;
}
const ESTIMATED_DEFAULTS: Record<string, { input: number; output: number }> = {
  'claude-opus-5-5': { input: 3.88, output: 18.88 },
  'claude-opus-5.5': { input: 3.88, output: 18.88 },
  'claude-fable-5.1': { input: 7.55, output: 37.75 },
  'gpt-6-astra': { input: .716, output: 3.58 },
  'claude-opus-5-6': { input: 3.88, output: 18.88 },
  'claude-fable-5-5': { input: 7.55, output: 37.75 },
  'claude-haiku-5-5': { input: 0.718, output: 3.59 },
};

// Dot, space and hyphen spellings (claude-opus-4.8 / claude-opus-4-8) are the same model for display prices.
const spellingKey = (id: string) => id.toLowerCase().trim().replace(/[.\s]+/g, '-');
function lookupSpelling<T>(table: Record<string, T>, id: string): T | undefined {
  const exact = table[id.toLowerCase()];
  if (exact) return exact;
  const key = spellingKey(id);
  for (const [name, value] of Object.entries(table)) if (spellingKey(name) === key) return value;
  return undefined;
}

export function displayedModelPrice(id: string, catalog?: ModelPriceCatalog): ModelPriceCatalog[string] | null {
  if (catalog) {
    const found = lookupSpelling(catalog, id);
    if (found) return found;
  }
  const confirmed = lookupSpelling(CLIENT_MODEL_PRICES, id) ?? null;
  const price = confirmed ?? lookupSpelling(ESTIMATED_DEFAULTS, id);
  return price ? { ...price, estimated: !confirmed, inputBrl: price.input * USD_TO_BRL, outputBrl: price.output * USD_TO_BRL } : null;
}

export function displayedConsumption(id: string, input: number, output: number, catalog?: ModelPriceCatalog) {
  const price = displayedModelPrice(id, catalog);
  if (!price || !Number.isFinite(input) || !Number.isFinite(output)) return null;
  const inputBrl = Math.max(0, input) / PRICE_TOKEN_UNIT * price.inputBrl;
  const outputBrl = Math.max(0, output) / PRICE_TOKEN_UNIT * price.outputBrl;
  return { inputBrl, outputBrl, totalBrl: inputBrl + outputBrl };
}

// Customer-facing reference tariffs, independent of provider costs and package billing.
export const CLIENT_MODEL_PRICES: Record<string, { input: number; output: number }> = {
  'claude-haiku-4.5': { input: 0.718, output: 3.59 },
  'claude-sonnet-5.5': { input: 1.52, output: 7.61 },
  'claude-sonnet-5': { input: 1.52, output: 7.60 },
  'claude-sonnet-4.6': { input: 2.16, output: 10.78 },
  'claude-sonnet-4.5': { input: 2.77, output: 13.85 },
  'claude-fable-5': { input: 7.55, output: 37.75 },
  'claude-opus-5': { input: 3.88, output: 18.88 },
  'claude-opus-4.8': { input: 3.59, output: 17.96 },
  'claude-opus-4.7': { input: 3.59, output: 17.96 },
  'claude-opus-4.6': { input: 3.59, output: 17.96 },
  'claude-opus-4.5': { input: 4.62, output: 23.09 },
  'gpt-6.1-terra': { input: 0.716, output: 3.58 },
  'gpt-5.6-luna': { input: 0.154, output: 0.924 },
  'gpt-5.6-terra': { input: 1.43, output: 8.60 },
  'gpt-5.4-mini': { input: 0.632, output: 3.79 },
  'gpt-5.4-nano': { input: 0.177, output: 1.10 },
  'gpt-oss-20b': { input: 0.043, output: 0.189 },
  'gpt-5.5': { input: 3.88, output: 22.65 },
  'gpt-5.6-sol': { input: 3.02, output: 14.05 },
  'gpt-6-luna': { input: 0.154, output: 0.924 },
  'gpt-6-sol': { input: 3.02, output: 14.05 },
  'gpt-6.1-sol': { input: 3.02, output: 14.05 },
};

export function clientModelPrice(id: string) {
  return lookupSpelling(CLIENT_MODEL_PRICES, id) ?? null;
}

// Catalog grouping is presentation-only, separate from key authorization.
export function clientCatalogFamily(id: string): 'claude' | 'openai' | null {
  const name = id.trim().replace(/^.*\//, '');
  if (/^(?:claude|cloud|nexa|opus|sonnet|fable|haiku)(?:[-\s.]|$)/i.test(name)) return 'claude';
  if (/^(?:gpt|glm|gemini|codex|o\d)(?:[-\s.]|$)/i.test(name)) return 'openai';
  return null;
}

export function filterClientCatalog(names: string[], family: string) {
  return names.filter(id => family === 'all' || clientCatalogFamily(id) === family);
}

export function referenceCostUsd(id: string, inputTokens: number, outputTokens: number) {
  const price = clientModelPrice(id);
  if (!price) return null;
  return (Math.max(0, inputTokens) * price.input + Math.max(0, outputTokens) * price.output) / 1_000_000;
}

// "Melhor negócio agora": cheapest catalog model by blended 1M-token price (3 in : 1 out).
export function cheapestClientModel(ids: string[], catalog?: ModelPriceCatalog) {
  let best: string | null = null;
  let bestBlended = Infinity;
  for (const id of ids) {
    const price = displayedModelPrice(id, catalog);
    if (!price) continue;
    const blended = (price.input * 3 + price.output) / 4;
    if (blended < bestBlended) {
      bestBlended = blended;
      best = id;
    }
  }
  return best;
}