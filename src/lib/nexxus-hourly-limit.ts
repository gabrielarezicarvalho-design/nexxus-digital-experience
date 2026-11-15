export const NEXXUS_HOURLY_INPUT_LIMIT = 100_000_000;
export const NEXXUS_HOURLY_PAUSE_MS = 2 * 60 * 60 * 1000;
/** Fixed local cap set by the owner: when reached, Nexxus is skipped until the 2h cycle resets. */
export const NEXXUS_WINDOW_TOKEN_LIMIT = 107_000_000;
export const NEXXUS_WINDOW_SECONDS = 7200;
/** Same epoch-aligned cycle as public.provider_window_start. */
export function providerWindowReset(seconds: number, now = Date.now()): number {
  return (Math.floor(now / 1000 / seconds) + 1) * seconds * 1000;
}
export const PROVIDER_QUOTA_MODEL = '*';

/** Only an explicit hourly token throttle, never credentials, account blocks or billing. */
export function isNexxusHourlyLimit(provider: string, status: number, text: string): boolean {
  if (provider !== 'Nexxus Pro' || status !== 429) return false;
  if (/authenticat|autentica|credential|credencia|invalid.?key|account.*(?:block|suspend)|payment|billing|balance|saldo|credit|cr[eé]dito/i.test(text)) return false;
  return /(?:hour|hora|\btph\b)/i.test(text) && /token|\buso\b|usage/i.test(text) && /limit|quota|cota|exceed|exced|ating|esgot|paus/i.test(text);
}

/** Use Retry-After when supplied; otherwise respect the reported one-hour pause. */
export function nexxusHourlyReset(headers: Headers, now = Date.now()): number {
  const retry = headers.get('retry-after');
  if (retry) {
    const delay = /^\d+(?:\.\d+)?$/.test(retry.trim()) ? Number(retry) * 1000 : Date.parse(retry) - now;
    if (Number.isFinite(delay) && delay > 0 && delay <= NEXXUS_HOURLY_PAUSE_MS) return now + delay;
  }
  return now + NEXXUS_HOURLY_PAUSE_MS;
}

export function skipHourlyPaused<T extends { account: { name: string } }>(hops: T[], paused: Set<string>): T[] {
  return hops.filter(hop => !paused.has(hop.account.name));
}