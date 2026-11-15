import { newApiKey, sha256Hex } from "./keys.server";
import { asFamily, FAMILY_LABELS, familyPriceCents, type ModelFamily } from "./model-family";
import { MONTHLY_PLAN_FAMILY } from "./plan-models";
import { TOKEN_PROMOTION } from "./token-promotion";
import { isConfiguredPromotionOpen } from "./promotion-rules";

const MP = "https://api.mercadopago.com/v1/payments";

function token() {
  const t = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!t) throw new Error("Mercado Pago não configurado");
  return t;
}

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin as any;
}

type Upgrade = { keyId: string; userId: string; clientId: string | null; tokens: number; price: number };

/** Valida o plano e cria a linha pendente em payments (mesmas regras para PIX e cartão). */
export async function resolveCoupon(db: Awaited<ReturnType<typeof admin>>, rawCode: string, priceCents: number) {
  const { normalizeCouponCode, couponProblem, couponDiscountCents } = await import("./coupons");
  const code = normalizeCouponCode(rawCode);
  const { data: c } = await db.from("coupons").select("code,percent_off,amount_off_cents,active,expires_at,max_uses").eq("code", code).maybeSingle();
  if (!c) throw new Error("Cupom inválido ou expirado.");
  const { count } = await db.from("payments").select("id", { count: "exact", head: true }).eq("coupon_code", code).eq("status", "approved");
  const problem = couponProblem(c, count ?? 0);
  if (problem) throw new Error(problem);
  return { code, discount: couponDiscountCents(c, priceCents) };
}

export async function planPriceCents(planCode: string, family: ModelFamily) {
  const db = await admin();
  const { data: plan } = await db.from("plans").select("price_cents").eq("code", planCode).eq("active", true).maybeSingle();
  if (!plan) throw new Error("Plano não encontrado");
  const monthly = MONTHLY_PLAN_FAMILY[planCode];
  return { db, price: monthly ? plan.price_cents : familyPriceCents(family, plan.price_cents) };
}

export async function preparePayment(planCode: string, name: string, email: string, family: ModelFamily = "claude", upgrade?: Upgrade, method = "pix", couponCode?: string) {
  const db = await admin();
  let offer: { enabled: boolean; starts_at: string; ends_at: string } | null = null;
  if (planCode === TOKEN_PROMOTION.code) {
    const { data, error } = await db.from("site_promotions").select("enabled,starts_at,ends_at").eq("id", "token_offer").maybeSingle();
    if (error || !data || !isConfiguredPromotionOpen(data, Date.now())) throw new Error("Esta promoção não está disponível.");
    offer = data;
  }
  const { data: plan } = await db.from("plans").select("*").eq("code", planCode).eq("active", true).maybeSingle();
  if (!plan) throw new Error("Plano não encontrado");
  const monthlyFamily = MONTHLY_PLAN_FAMILY[planCode];
  if (monthlyFamily) family = monthlyFamily;
  const basePrice = monthlyFamily ? plan.price_cents : familyPriceCents(family, plan.price_cents);
  let price = basePrice;
  const coupon = couponCode && !upgrade ? await resolveCoupon(db, couponCode, basePrice) : null;
  if (coupon) price = basePrice - coupon.discount;
  if (upgrade && (plan.token_limit !== upgrade.tokens || price !== upgrade.price || plan.daily_token_limit || plan.duration_days || !plan.show_on_site)) throw new Error('O pacote foi alterado. Selecione novamente.');
  const { data: row, error } = await db.from("payments").insert({
    plan_code: planCode, name, email: email.toLowerCase(), amount_cents: price, model_family: family,
    ...(coupon ? { coupon_code: coupon.code, discount_cents: coupon.discount } : {}),
    ...(upgrade ? { upgrade_key_id: upgrade.keyId, upgrade_tokens: upgrade.tokens, upgrade_user_id: upgrade.userId, client_id: upgrade.clientId, plan_snapshot: { id: plan.id, name: `Recarga · ${plan.name}`, token_limit: plan.token_limit, rpm_limit: plan.rpm_limit, duration_days: plan.duration_days, daily_token_limit: plan.daily_token_limit } } : {}),
    ...(offer ? { plan_snapshot: { id: plan.id, name: plan.name, token_limit: plan.token_limit, rpm_limit: plan.rpm_limit, duration_days: plan.duration_days, daily_token_limit: plan.daily_token_limit } } : {}),
  }).select("id").single();
  if (error) throw new Error(error.message);
  return { db, row: row as { id: string }, plan, price, family, offer, method };
}

export async function createPix(planCode: string, name: string, email: string, origin: string, family: ModelFamily = "claude", upgrade?: Upgrade, couponCode?: string) {
  const prep = await preparePayment(planCode, name, email, family, upgrade, "pix", couponCode);
  const { db, row, plan, price, offer } = prep; family = prep.family;
  const [first, ...rest] = name.trim().split(/\s+/);
  const res = await fetch(MP, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", "X-Idempotency-Key": row.id },
    body: JSON.stringify({
      transaction_amount: price / 100,
      description: `NEXA CLOUD - ${upgrade ? 'Recarga · ' : ''}${plan.name} (${FAMILY_LABELS[family]})`,
      payment_method_id: "pix",
      ...(offer ? { date_of_expiration: new Date(offer.ends_at).toISOString().replace("Z", "+00:00") } : {}),
      external_reference: row.id,
      notification_url: origin.startsWith("https://") ? `${origin}/api/public/mercadopago-webhook` : undefined,
      payer: { email: email.toLowerCase(), first_name: first, last_name: rest.join(" ") || first },
    }),
  });
  const mp: any = await res.json();
  if (!res.ok) {
    console.error("MP create error", res.status, mp);
    await db.from("payments").update({ status: "error" }).eq("id", row.id);
    throw new Error("Não foi possível gerar o PIX. Tente novamente.");
  }
  await db.from("payments").update({ mp_payment_id: String(mp.id) }).eq("id", row.id);
  const tx = mp.point_of_interaction?.transaction_data ?? {};
  return { id: row.id as string, qrCode: tx.qr_code as string, qrBase64: tx.qr_code_base64 as string, amount: price / 100, planName: plan.name as string };
}

/** PIX de reset do limite diário de uma chave mensal (preço fixo, sem cupom/afiliado). */
export async function createDailyResetPix(keyId: string, clientId: string | null, name: string, email: string, origin: string, family: ModelFamily) {
  const { DAILY_RESET_PRICE_CENTS, DAILY_RESET_PLAN_CODE } = await import("./daily-limit-reset");
  const db = await admin();
  const { data: row, error } = await db.from("payments").insert({
    plan_code: DAILY_RESET_PLAN_CODE, name, email: email.toLowerCase(), amount_cents: DAILY_RESET_PRICE_CENTS, model_family: family,
    reset_key_id: keyId, client_id: clientId, plan_snapshot: { name: "Reset de limite diário" },
  }).select("id").single();
  if (error) throw new Error(error.message);
  const [first, ...rest] = name.trim().split(/\s+/);
  const res = await fetch(MP, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", "X-Idempotency-Key": row.id },
    body: JSON.stringify({
      transaction_amount: DAILY_RESET_PRICE_CENTS / 100,
      description: "NEXA CLOUD - Reset de limite diário",
      payment_method_id: "pix",
      external_reference: row.id,
      notification_url: origin.startsWith("https://") ? `${origin}/api/public/mercadopago-webhook` : undefined,
      payer: { email: email.toLowerCase(), first_name: first, last_name: rest.join(" ") || first },
    }),
  });
  const mp: any = await res.json();
  if (!res.ok) {
    console.error("MP reset create error", res.status, mp);
    await db.from("payments").update({ status: "error" }).eq("id", row.id);
    throw new Error("Não foi possível gerar o PIX. Tente novamente.");
  }
  await db.from("payments").update({ mp_payment_id: String(mp.id) }).eq("id", row.id);
  const tx = mp.point_of_interaction?.transaction_data ?? {};
  return { id: row.id as string, qrCode: tx.qr_code as string, qrBase64: tx.qr_code_base64 as string, amount: DAILY_RESET_PRICE_CENTS / 100 };
}

/** Consulta o pagamento no Mercado Pago e, se aprovado, gera a chave (idempotente). */
export async function syncPayment(mpPaymentId: string) {
  const res = await fetch(`${MP}/${encodeURIComponent(mpPaymentId)}`, { headers: { Authorization: `Bearer ${token()}` } });
  if (!res.ok) return "unknown";
  const mp: any = await res.json();
  const db = await admin();
  const { data: pay } = await db.from("payments").select("*").eq("mp_payment_id", String(mp.id)).maybeSingle();
  if (!pay) { const { syncPayout } = await import("./reseller.server"); return syncPayout(mp); }
  if (mp.status !== "approved") {
    if (pay.status !== "approved" && pay.status !== mp.status) await db.from("payments").update({ status: mp.status }).eq("id", pay.id);
    return mp.status as string;
  }
  if (Math.round(Number(mp.transaction_amount) * 100) < pay.amount_cents) return "amount_mismatch";
  if (pay.reset_key_id) {
    if (Math.round(Number(mp.transaction_amount) * 100) !== pay.amount_cents || mp.currency_id !== 'BRL' || mp.external_reference !== pay.id) return 'amount_mismatch';
    const result = await db.rpc('fulfill_daily_reset', { _payment_id: pay.id });
    if (result.error) throw new Error('Não foi possível liberar o limite. Tente verificar novamente.');
    return result.data as string;
  }
  if (pay.upgrade_key_id) {
    if (Math.round(Number(mp.transaction_amount) * 100) !== pay.amount_cents || mp.currency_id !== 'BRL' || mp.external_reference !== pay.id) return 'amount_mismatch';
    const result = await db.rpc('fulfill_token_upgrade', { _payment_id: pay.id });
    if (result.error) throw new Error('Não foi possível creditar a recarga. Tente verificar novamente.');
    const { sendMetaEvent } = await import('./meta-capi.server');
    await sendMetaEvent({ name: 'Purchase', eventId: `purchase-${pay.id}`, email: pay.email, value: pay.amount_cents / 100, currency: 'BRL', contentName: pay.plan_snapshot?.name ?? 'Recarga de tokens' });
    return result.data as string;
  }
  return fulfillApprovedPayment(pay, "mercadopago");
}

/** Gera a chave de um pagamento aprovado (idempotente). Compartilhado por PIX e cartão. */
export async function fulfillApprovedPayment(pay: any, actor: string) {
  const db = await admin();
  // trava: só uma execução passa de pending -> approved
  const { data: locked } = await db.from("payments").update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", pay.id).neq("status", "approved").select("id").maybeSingle();
  if (!locked) return "approved";

  const { data: currentPlan } = await db.from("plans").select("*").eq("code", pay.plan_code).single();
  const plan = pay.plan_snapshot ?? currentPlan;
  let { data: client } = await db.from("clients").select("id").ilike("email", pay.email).maybeSingle();
  if (!client) {
    client = (await db.from("clients").insert({ name: pay.name, email: pay.email, plan_id: plan.id, status: "active" }).select("id").single()).data;
  }
  const key = newApiKey();
  const { data: k } = await db.from("api_keys").insert({
    client_id: client.id, api_key: key, key_hash: await sha256Hex(key), key_prefix: key.slice(0, 12), status: "active",
    token_limit: plan.token_limit, daily_token_limit: plan.daily_token_limit ?? null, rpm_limit: plan.rpm_limit, plano: plan.name, model_family: asFamily(pay.model_family),
    allowed_models: currentPlan?.allowed_models ?? null, spam_guard: currentPlan?.spam_guard ?? false,
    expires_at: plan.duration_days ? new Date(Date.now() + plan.duration_days * 86400000).toISOString() : null,
  }).select("id").single();
  await db.from("payments").update({ client_id: client.id, api_key_id: k?.id ?? null }).eq("id", pay.id);
  await db.from("audit_logs").insert({ actor_email: actor, action: "payment.approved", entity: "payment", entity_id: pay.id, details: { plan: pay.plan_code, email: pay.email } });
  const { sendMetaEvent } = await import("./meta-capi.server");
  await sendMetaEvent({ name: "Purchase", eventId: `purchase-${pay.id}`, email: pay.email, value: pay.amount_cents / 100, currency: "BRL", contentName: plan.name });
  return "approved";
}

export async function checkByRowId(id: string) {
  const db = await admin();
  const { data: pay } = await db.from("payments").select("status, mp_payment_id").eq("id", id).maybeSingle();
  if (!pay) return "unknown";
  if (pay.status === "approved") return "approved";
  if (!pay.mp_payment_id) return pay.status as string;
  return syncPayment(pay.mp_payment_id);
}
