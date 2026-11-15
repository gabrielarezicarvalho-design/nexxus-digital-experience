import { preparePayment, fulfillApprovedPayment } from "./mercadopago.server";
import { gatewayFetch, type PaddleEnv } from "./paddle.server";
import { brlCentsToEurCents } from "./eur-rate";
import { FAMILY_LABELS, type ModelFamily } from "./model-family";

async function productId(env: PaddleEnv) {
  const r = await gatewayFetch(env, `/products?external_id=nexa_plan`);
  const j: any = await r.json();
  const id = j?.data?.[0]?.id;
  if (!id) throw new Error("Pagamento com cartão indisponível no momento.");
  return id as string;
}

/** Cria a transação de cartão em euro para um plano, com o valor calculado no servidor. */
export async function createCardTransaction(planCode: string, name: string, email: string, family: ModelFamily, env: PaddleEnv) {
  const prep = await preparePayment(planCode, name, email, family, undefined, "card");
  const eurCents = brlCentsToEurCents(prep.price);
  if (eurCents < 70) throw new Error("Valor abaixo do mínimo para cartão.");
  const res = await gatewayFetch(env, "/transactions", {
    method: "POST",
    body: JSON.stringify({
      items: [{
        quantity: 1,
        price: {
          description: `NEXA CLOUD - ${prep.plan.name}`,
          name: `${prep.plan.name} (${FAMILY_LABELS[prep.family]})`,
          product_id: await productId(env),
          unit_price: { amount: String(eurCents), currency_code: "EUR" },
          quantity: { minimum: 1, maximum: 1 },
        },
      }],
      currency_code: "EUR",
      custom_data: { paymentId: prep.row.id, expectedEurCents: eurCents },
    }),
  });
  const j: any = await res.json();
  if (!res.ok || !j?.data?.id) {
    console.error("card create error", res.status, j?.error?.code);
    await prep.db.from("payments").update({ status: "error" }).eq("id", prep.row.id);
    throw new Error("Não foi possível abrir o pagamento com cartão.");
  }
  return { id: prep.row.id, transactionId: j.data.id as string, eurCents };
}

/** Chamado pelo webhook assinado quando o cartão é aprovado. */
export async function fulfillCardTransaction(data: any) {
  const paymentId = data?.customData?.paymentId;
  if (typeof paymentId !== "string") return "ignored";
  const db = (await import("@/integrations/supabase/client.server")).supabaseAdmin as any;
  const { data: pay } = await db.from("payments").select("*").eq("id", paymentId).maybeSingle();
  if (!pay || pay.upgrade_key_id) return "ignored";
  const subtotal = Number(data?.details?.totals?.subtotal ?? 0);
  const currency = String(data?.currencyCode ?? "").toUpperCase();
  if (currency !== "EUR" || subtotal < brlCentsToEurCents(pay.amount_cents)) return "amount_mismatch";
  return fulfillApprovedPayment(pay, "cartao");
}
