export const TOKEN_PROMOTION = {
  code: "cc_promo_25m",
  tokenLimit: 25_000_000,
  priceCents: 990,
  durationDays: null,
  countdownSeconds: (24 * 60 + 15) * 60,
  startsAt: "2026-10-19T20:49:00Z",
  endsAt: "2026-10-20T21:04:00Z",
} as const;

export function isTokenPromotionOpen(now: number) {
  return now >= Date.parse(TOKEN_PROMOTION.startsAt) && now < Date.parse(TOKEN_PROMOTION.endsAt);
}

export function promotionSecondsRemaining(deadline: number, now: number) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}