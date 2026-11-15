/** Acordo de regularização da revenda (valores em centavos). */

export type Settlement = { totalCents: number; installments: number };

/** Lê o acordo do cadastro da revenda; null quando não há acordo ativo. */
export function readSettlement(r: { settlement_total_cents?: number | null; settlement_installments?: number | null }): Settlement | null {
  const total = r.settlement_total_cents ?? null;
  const installments = r.settlement_installments ?? null;
  if (!total || total <= 0 || !installments || installments < 1) return null;
  return { totalCents: total, installments };
}

/** Valor da próxima parcela PIX: o menor entre a parcela do acordo e o que ainda falta pagar. */
export function nextInstallmentCents(settlement: Settlement, pendingCents: number): number {
  const perInstallment = Math.ceil(settlement.totalCents / settlement.installments);
  return Math.min(perInstallment, Math.max(0, pendingCents));
}
