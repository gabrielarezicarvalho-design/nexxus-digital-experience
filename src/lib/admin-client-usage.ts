import { successRate } from './success-rate';

export type ClientUsage = {
  client: { id: string; name: string; email: string; company: string | null; status: string; created_at: string };
  keys: { id: string; key_prefix: string | null; status: string; plano: string | null }[];
  key: { id: string; key_prefix: string | null; status: string; plano: string | null; created_at: string; expires_at: string | null; last_used_at: string | null; token_limit: number | null; daily_token_limit: number | null; tokens_used: number; requests_count: number; rpm_limit: number; ip_limit: number; reseller_blocked: boolean; allowed_models: string[] | null } | null;
  stats: { requests: number; successes: number; errors: number; excluded502: number; rateExcluded502?: number; rateExcluded502Errors?: number; rejections: number; input: number; output: number; tokens: number; origins: number };
  lastHourTokens: number; todayTokens: number; purchaseAt: string | null; asOf: string;
  days: { day: string; requests: number; tokens: number; errors: number }[];
  ips: { ip: string; requests: number; last_seen: string }[];
  models: { model: string; requests: number; tokens: number; input: number; output: number; errors: number }[];
  recent: { id: string; created_at: string; model: string | null; total_tokens: number; status_code: number }[];
};

export function clientUsageRate(stats: ClientUsage['stats']) {
  const total = Number(stats.requests);
  const excluded = Number(stats.rateExcluded502 ?? 0);
  return successRate(total, total - Number(stats.errors) - excluded + Number(stats.rateExcluded502Errors ?? 0), excluded);
}

export function remainingKeyTokens(key: ClientUsage['key'], todayTokens: number): number | null {
  if (!key) return null;
  const remaining = key.token_limit == null ? null : Math.max(0, Number(key.token_limit) - Number(key.tokens_used));
  if (key.daily_token_limit == null) return remaining;
  const daily = Math.max(0, Number(key.daily_token_limit) - Number(todayTokens));
  return remaining == null ? daily : Math.min(remaining, daily);
}