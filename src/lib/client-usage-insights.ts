import { fillUsageDays, type ClientUsage, type DailyUsage, type ModelUsage } from './client-usage';

export function modelUsageInsights(usage: ClientUsage | undefined, range: number, now = new Date()) {
  const days = fillUsageDays([], now).slice(-Math.min(30, Math.max(1, range))).map(row => row.day);
  const today = days.at(-1);
  const aggregate = (rows: NonNullable<ClientUsage['daily_by_model']>) => {
    const models = new Map<string, ModelUsage>();
    for (const row of rows) {
      const model = row.model?.trim() || 'Não informado';
      const previous = models.get(model) ?? { model, requests: 0, tokens: 0 };
      models.set(model, { model, requests: previous.requests + row.requests, tokens: previous.tokens + row.tokens });
    }
    return [...models.values()].sort((a, b) => b.requests - a.requests || b.tokens - a.tokens || a.model.localeCompare(b.model));
  };
  const rows = usage?.daily_by_model ?? [];
  // Unknown names still contribute usage, but cannot identify a favorite model.
  const favorites = aggregate(rows.filter(row => days.includes(row.day) && row.model?.trim()));
  const latency = usage?.today_average_latency_ms;
  return {
    favorite: favorites[0],
    todayModels: aggregate(rows.filter(row => row.day === today)).sort((a, b) => b.tokens - a.tokens || b.requests - a.requests || a.model.localeCompare(b.model)),
    available: usage?.daily_by_model !== undefined,
    averageLatencyMs: typeof latency === 'number' && Number.isFinite(latency) && latency >= 0 && (usage?.today_latency_samples ?? 0) > 0 ? latency : null,
    latencySamples: usage?.today_latency_samples ?? 0,
  };
}

export function usageInsights(daily: DailyUsage[], range: number, now = new Date()) {
  const all = fillUsageDays(daily, now);
  const days = all.slice(-Math.min(30, Math.max(1, range)));
  const sum = (rows: DailyUsage[]) => rows.reduce((total, row) => ({ requests: total.requests + row.requests, tokens: total.tokens + row.tokens }), { requests: 0, tokens: 0 });
  let bestStreak = 0;
  let streak = 0;
  for (const day of days) {
    streak = day.requests > 0 ? streak + 1 : 0;
    bestStreak = Math.max(bestStreak, streak);
  }
  // A current streak can continue from yesterday while today has no requests yet.
  let currentStreak = 0;
  let index = days.length - 1;
  if (days[index]?.requests === 0) index -= 1;
  for (; index >= 0 && (days[index]?.requests ?? 0) > 0; index -= 1) currentStreak += 1;
  const bestDay = days.reduce<DailyUsage | undefined>((best, day) => day.requests > 0 && (!best || day.tokens > best.tokens) ? day : best, undefined);
  const week = all.slice(-7);
  return { days, total: sum(days), today: sum(all.slice(-1)), week: sum(week), month: sum(all), activeDays: days.filter(day => day.requests > 0).length, bestStreak, currentStreak, bestDay, weekPeak: Math.max(0, ...week.map(day => day.tokens)) };
}