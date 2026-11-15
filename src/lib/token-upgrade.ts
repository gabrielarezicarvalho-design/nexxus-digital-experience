export type UpgradeKey = { status: string; token_limit: number | null; daily_token_limit?: number | null; expires_at: string | null };

export function canUpgradeTokens(key: UpgradeKey, now = Date.now()) {
  return (key.status === 'active' || key.status === 'exhausted')
    && key.token_limit != null && key.token_limit > 0
    && !key.daily_token_limit
    && (!key.expires_at || new Date(key.expires_at).getTime() > now);
}

export function isUpgradePackage(plan: { token_limit: number | null; daily_token_limit?: number | null; duration_days?: number | null }) {
  return (plan.token_limit ?? 0) > 0 && !plan.daily_token_limit && !plan.duration_days;
}