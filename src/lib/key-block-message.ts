export const RESELLER_PAYMENT_BLOCK_MESSAGE = "Sua chave está bloqueada. Regularize sua chave no site oficial https://cloudnexapro.site para continuar usando.";

/** Only payment-blocked reseller keys receive the regularization notice. */
export function resellerPaymentBlockMessage(key: { status: string; reseller_blocked?: boolean | null }): string | null {
  return key.status === "blocked" && key.reseller_blocked === true
    ? RESELLER_PAYMENT_BLOCK_MESSAGE
    : null;
}
export const IP_LIMIT_BLOCK_MESSAGE = "IP atingido. Entre em contato com o provedor Nexa Cloud para adquirir mais IPs.";

type LogDb = { from: (t: "request_logs") => any };
/** Keys blocked by the automatic IP limit receive the IP notice instead of the generic block text. */
export async function blockedKeyMessage(db: LogDb, key: { id: string; status: string; reseller_blocked?: boolean | null }): Promise<string> {
  const reseller = resellerPaymentBlockMessage(key);
  if (reseller) return reseller;
  if (key.status !== "blocked") return "API key bloqueada";
  const { data } = await db.from("request_logs").select("id").eq("api_key_id", key.id).like("error", "bloqueio automático%").limit(1);
  return data && data.length ? IP_LIMIT_BLOCK_MESSAGE : "API key bloqueada";
}
