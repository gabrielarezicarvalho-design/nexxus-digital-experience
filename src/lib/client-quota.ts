type QuotaKey = { token_limit: number | null; daily_token_limit: number | null; tokens_used: number };

// Quota and consumption must always come from the same (latest) key.
export function clientQuota(key: QuotaKey | undefined, todayUsed = 0) {
  if (!key) return null;
  const daily = key.token_limit == null && (key.daily_token_limit ?? 0) > 0;
  const limit = daily ? key.daily_token_limit : key.token_limit;
  const used = Math.max(0, daily ? todayUsed : key.tokens_used);
  return { limit, used, daily, progress: limit != null && limit > 0 ? Math.min(used, limit) : 0 };
}