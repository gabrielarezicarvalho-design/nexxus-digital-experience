// Daily ceilings of monthly plans renew at midnight Brasília time (UTC-3, no daylight saving).
const BRASILIA_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Next 00:00 in Brasília after `now`, as an absolute instant. */
export function nextBrasiliaMidnight(now: Date = new Date()): Date {
  const local = new Date(now.getTime() - BRASILIA_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1) + BRASILIA_OFFSET_MS);
}

/** Only keys whose allowance is a daily ceiling (monthly plans) have a daily reset. */
export function hasDailyReset(key: { token_limit: number | null; daily_token_limit?: number | null }): boolean {
  return key.token_limit == null && Number(key.daily_token_limit ?? 0) > 0;
}
