export type Coupon = { code: string; percent_off: number | null; amount_off_cents: number | null; active: boolean; expires_at: string | null; max_uses: number | null };

/** Valor mínimo cobrado após desconto (R$ 1,00), para o PIX nunca ficar zerado. */
export const MIN_CHARGE_CENTS = 100;

export function normalizeCouponCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function couponProblem(c: Coupon, usedCount: number, now = Date.now()): string | null {
  if (!c.active) return "Cupom inválido ou expirado.";
  if (c.expires_at && new Date(c.expires_at).getTime() <= now) return "Cupom inválido ou expirado.";
  if (c.max_uses != null && usedCount >= c.max_uses) return "Este cupom já atingiu o limite de usos.";
  return null;
}

export function couponDiscountCents(c: Pick<Coupon, "percent_off" | "amount_off_cents">, priceCents: number) {
  const raw = c.percent_off ? Math.round(priceCents * c.percent_off / 100) : (c.amount_off_cents ?? 0);
  return Math.max(0, Math.min(raw, priceCents - MIN_CHARGE_CENTS));
}
