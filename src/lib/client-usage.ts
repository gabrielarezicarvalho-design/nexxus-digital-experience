export type DailyUsage = { day: string; requests: number; tokens: number };
export type ModelUsage = { model: string; requests: number; tokens: number; prompt_tokens?: number; completion_tokens?: number };
export type DailyModelUsage = { day: string; model: string | null; requests: number; tokens: number; prompt_tokens?: number; completion_tokens?: number };
export type ClientUsage = { total_requests: number; today_requests: number; total_tokens: number; models_used: number; daily: DailyUsage[]; by_model: ModelUsage[]; daily_by_model?: DailyModelUsage[]; today_average_latency_ms?: number | null; today_latency_samples?: number };
export type ClientCall = { finished_at: string; model: string; prompt_tokens: number; completion_tokens: number; latency_ms: number | null; status_code: number | null; stream: boolean; error: string | null; cached_tokens?: number; cache_write_tokens?: number; cache_discount_tokens?: number };
/** Cache lido do fornecedor nos pedidos da chave; discount_tokens = tokens que deixaram de ser cobrados. */
export type CacheUsage = { cached_tokens: number; cache_write_tokens: number; discount_tokens: number; requests: number; by_model: { model: string | null; cached_tokens: number; discount_tokens: number }[] };
export type ModelPeriodRow = { model: string; tokens: number; requests: number; percent: number };
export function modelPeriodRows(daily: DailyModelUsage[], days: number, now = new Date()): ModelPeriodRow[] {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const start = new Date(`${today}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (Math.max(1, days) - 1));
  const cutoff = start.toISOString().slice(0, 10);
  const totals = new Map<string, { tokens: number; requests: number }>();
  for (const row of daily) {
    if (row.day < cutoff) continue;
    const model = row.model ?? 'Não informado';
    const entry = totals.get(model) ?? { tokens: 0, requests: 0 };
    entry.tokens += Math.max(0, row.tokens);
    entry.requests += Math.max(0, row.requests);
    totals.set(model, entry);
  }
  const totalTokens = [...totals.values()].reduce((sum, v) => sum + v.tokens, 0);
  return [...totals.entries()]
    .map(([model, v]) => ({ model, tokens: v.tokens, requests: v.requests, percent: totalTokens ? Math.round((v.tokens / totalTokens) * 100) : 0 }))
    .sort((a, b) => b.tokens - a.tokens);
}

export function fillUsageDays(daily: DailyUsage[], now = new Date()): DailyUsage[] {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() - 29 + i);
    const day = date.toISOString().slice(0, 10);
    return daily.find(row => row.day === day) ?? { day, requests: 0, tokens: 0 };
  });
}