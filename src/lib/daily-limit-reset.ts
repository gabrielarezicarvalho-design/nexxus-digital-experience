import { hasDailyReset } from './daily-reset';

/** Price charged to immediately release the daily token ceiling of a monthly-plan key. */
export const DAILY_RESET_PRICE_CENTS = 2990;
export const DAILY_RESET_PLAN_CODE = 'daily_reset';

export type ResetKey = { status: string; token_limit: number | null; daily_token_limit?: number | null; expires_at: string | null };

export function canBuyDailyReset(key: ResetKey, now = Date.now()) {
  return (key.status === 'active' || key.status === 'exhausted')
    && hasDailyReset(key)
    && (!key.expires_at || new Date(key.expires_at).getTime() > now);
}
