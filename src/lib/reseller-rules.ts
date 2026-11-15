/** Regras de repasse da revenda (valores em centavos). */

/** Preço de venda estimado por chave no painel de revenda: R$ 59,90. */
export const ESTIMATED_SALE_CENTS = 5990;

/** Faturamento e lucro estimados: cada chave conta como vendida a R$ 59,90,
 *  e o lucro é o faturamento menos o repasse de cada chave. */
export function resellerEstimates(keys: { reseller_cost_cents: number }[]) {
  const revenue = keys.length * ESTIMATED_SALE_CENTS;
  const costs = keys.reduce((s, k) => s + k.reseller_cost_cents, 0);
  return { revenue, costs, profit: revenue - costs };
}

export function resellerBalance(keyCosts: number[], approvedPayouts: number[]) {
  const generated = keyCosts.reduce((s, n) => s + n, 0);
  const paid = approvedPayouts.reduce((s, n) => s + n, 0);
  return { generated, paid, pending: Math.max(0, generated - paid), credit: Math.max(0, paid - generated) };
}

/** Bloqueia quando a dívida pendente atinge ou passa do limite. */
export function shouldBlock(pendingCents: number, limitCents: number) {
  return pendingCents >= limitCents;
}

/** Pré-pago: só gera chave se o saldo já pago cobrir o custo dela inteiro (sem dívida). */
export function canGenerate(bal: { pending: number; credit: number }, costCents: number) {
  return bal.pending === 0 && bal.credit >= costCents;
}

/** Valor do PIX para gerar uma chave: dívida antiga + o que falta do custo da chave. */
export function payToGenerateCents(bal: { pending: number; credit: number }, costCents: number) {
  return bal.pending + Math.max(0, costCents - bal.credit);
}
