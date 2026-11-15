// After a provider fails a model (outage/rate limit/no response), the next requests
// for that same model start on the next provider in the saved order for a while.
// The saved priority is never changed; the failed provider is only moved to the end.
export const COOLDOWN_MS = 10 * 60 * 1000;
// Inner models of a supplier combo (DevHub) rest for one minute only.
export const COMBO_COOLDOWN_MS = 60 * 1000;

export const cooldownKey = (provider: string, model: string) => `${provider}\u0000${model.toLowerCase().replace(/[._]/g, '-')}`;

export function orderByCooldown<T extends { account: { name: string }; upstreamModel: string; requestedModel?: string }>(hops: T[], cooled: Set<string>): T[] {
  if (hops.length < 2 || !cooled.size) return hops;
  const restingHop = (h: T) => cooled.has(cooldownKey(h.account.name, h.upstreamModel)) || Boolean(h.requestedModel && cooled.has(cooldownKey(h.account.name, h.requestedModel)));
  const ready = hops.filter((h) => !restingHop(h));
  const resting = hops.filter(restingHop);
  return [...ready, ...resting];
}
