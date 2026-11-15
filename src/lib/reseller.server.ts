import { familyPriceCents, type ModelFamily } from "./model-family";
import { newApiKey, sha256Hex } from "./keys.server";
import { canGenerate, payToGenerateCents, resellerBalance, shouldBlock } from "./reseller-rules";
import { nextInstallmentCents, readSettlement } from "./reseller-settlement";
import { canUseResellerPlan } from "./reseller-plan-rules";
import { resellerDeliveryMessage } from "./reseller-delivery-message";
import { requireTokenLimit } from "./plan-limits";
import { RESELLER_TRIAL_LIMIT, TRIAL_AUDIT_ACTION, TRIAL_PLAN_NAME, TRIAL_TOKENS, TRIAL_PROVIDER, trialsRemaining, canGenerateHourTrial, hourTrialLimits, HOUR_TRIAL_PLAN_NAME, HOUR_TRIAL_AUDIT_ACTION, canIssueResellerKeys, RESELLER_ISSUANCE_DENIED } from "./free-trial";

const MP = "https://api.mercadopago.com/v1/payments";
async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin as any;
}

export async function balanceOf(resellerId: string) {
  const db = await admin();
  const [{ data: keys }, { data: pays }] = await Promise.all([
    db.from("api_keys").select("reseller_cost_cents").eq("reseller_id", resellerId),
    db.from("reseller_payouts").select("amount_cents").eq("reseller_id", resellerId).eq("status", "approved"),
  ]);
  return resellerBalance((keys ?? []).map((k: any) => k.reseller_cost_cents), (pays ?? []).map((p: any) => p.amount_cents));
}

/** Bloqueia ou libera a revenda e as chaves dela conforme o saldo. */
export async function enforce(resellerId: string) {
  const db = await admin();
  const { data: r } = await db.from("resellers").select("*").eq("id", resellerId).single();
  if (!r || r.status === "disabled") return;
  const bal = await balanceOf(resellerId);
  // Com acordo ativo, a revenda só é liberada quando o acordo é quitado (pendente = 0).
  if (shouldBlock(bal.pending, r.debt_limit_cents) || (readSettlement(r) && bal.pending > 0)) {
    if (r.status !== "blocked") await db.from("resellers").update({ status: "blocked" }).eq("id", r.id);
    await db.from("api_keys").update({ status: "blocked", reseller_blocked: true }).eq("reseller_id", r.id).eq("status", "active");
  } else if (r.status === "blocked") {
    await db.from("resellers").update({ status: "active" }).eq("id", r.id);
    await db.from("api_keys").update({ status: "active", reseller_blocked: false }).eq("reseller_id", r.id).eq("reseller_blocked", true);
  }
}

async function availablePlan(db: any, resellerId: string, code: string) {
  if (code.startsWith("rp_")) {
    const { data, error } = await db.from("reseller_plans").select("*").eq("code", code).eq("reseller_id", resellerId).eq("active", true).maybeSingle();
    if (error || !data || !canUseResellerPlan(data, resellerId)) throw new Error("Plano não encontrado");
    requireTokenLimit(data);
    return data;
  }
  const { data, error } = await db.from("plans").select("*").eq("code", code).eq("active", true).maybeSingle();
  if (error || !data) throw new Error("Plano não encontrado");
  requireTokenLimit(data);
  return data;
}

export async function generateKey(resellerId: string, planCode: string, label?: string, family: ModelFamily = "claude") {
  const db = await admin();
  const { data: r } = await db.from("resellers").select("*").eq("id", resellerId).single();
  if (!r || r.status !== "active") throw new Error("Revenda bloqueada. Pague o repasse para liberar.");
  if (!canIssueResellerKeys(r.email)) throw new Error(RESELLER_ISSUANCE_DENIED);
  const plan = await availablePlan(db, resellerId, planCode);
  const cost = familyPriceCents(family, r.cost_cents);
  const bal = await balanceOf(r.id);
  if (!canGenerate(bal, cost)) throw new Error(`Saldo pré-pago insuficiente. Pague R$ ${(payToGenerateCents(bal, cost) / 100).toFixed(2).replace(".", ",")} via PIX para gerar esta chave.`);
  const key = newApiKey();
  const { data: k, error } = await db.from("api_keys").insert({
    api_key: key, key_hash: await sha256Hex(key), key_prefix: key.slice(0, 12), status: "active",
    token_limit: plan.token_limit, daily_token_limit: plan.daily_token_limit ?? null, rpm_limit: plan.rpm_limit, plano: plan.name, label: label?.trim() || null, model_family: family,
    expires_at: plan.duration_days ? new Date(Date.now() + plan.duration_days * 86400000).toISOString() : null,
    reseller_id: r.id, reseller_cost_cents: cost,
  }).select("id, api_key, plano, expires_at, token_limit").single();
  if (error) throw new Error("Não foi possível gerar a chave.");
  // Duas gerações ao mesmo tempo não podem gastar o mesmo saldo.
  if ((await balanceOf(r.id)).pending > 0) {
    await db.from("api_keys").delete().eq("id", k.id);
    throw new Error("Saldo pré-pago insuficiente. Tente novamente após recarregar.");
  }
  await enforce(r.id);
  const created = k as { id: string; api_key: string; plano: string; expires_at: string | null; token_limit: number | null };
  const message = resellerDeliveryMessage(r.email, created.api_key, r.delivery_template);
  return { ...created, ...(message ? { mensagem: message } : {}) };
}

export async function resellerTrialsUsed(resellerId: string) {
  const db = await admin();
  const { count } = await db.from("audit_logs").select("id", { count: "exact", head: true }).eq("action", TRIAL_AUDIT_ACTION).eq("entity_id", resellerId);
  return count ?? 0;
}

/** Gera uma chave de teste grátis (5M tokens, sem custo de repasse), limitada a 20 por revenda. */
export async function generateTrialKey(resellerId: string, label?: string, family: ModelFamily = "claude") {
  const db = await admin();
  const { data: r } = await db.from("resellers").select("*").eq("id", resellerId).single();
  if (!r || r.status !== "active") throw new Error("Revenda bloqueada. Pague o repasse para liberar.");
  if (!canIssueResellerKeys(r.email)) throw new Error(RESELLER_ISSUANCE_DENIED);
  if (trialsRemaining(await resellerTrialsUsed(r.id)) <= 0) throw new Error(`Você já usou os ${RESELLER_TRIAL_LIMIT} testes grátis disponíveis.`);
  const { data: log, error: logErr } = await db.from("audit_logs").insert({ actor_id: r.user_id, actor_email: r.email, action: TRIAL_AUDIT_ACTION, entity: "reseller", entity_id: r.id }).select("id").single();
  if (logErr) throw new Error("Não foi possível gerar o teste grátis.");
  if (trialsRemaining((await resellerTrialsUsed(r.id)) - 1) <= 0) { await db.from("audit_logs").delete().eq("id", log.id); throw new Error(`Você já usou os ${RESELLER_TRIAL_LIMIT} testes grátis disponíveis.`); }
  const key = newApiKey();
  const { data: k, error } = await db.from("api_keys").insert({
    api_key: key, key_hash: await sha256Hex(key), key_prefix: key.slice(0, 12), status: "active",
    token_limit: TRIAL_TOKENS, forced_provider: TRIAL_PROVIDER, rpm_limit: 60, plano: TRIAL_PLAN_NAME, label: label?.trim() || null, model_family: family,
    reseller_id: r.id, reseller_cost_cents: 0,
  }).select("id, api_key, plano, expires_at, token_limit").single();
  if (error) { await db.from("audit_logs").delete().eq("id", log.id); throw new Error("Não foi possível gerar o teste grátis."); }
  await db.from("audit_logs").update({ details: { key_id: k.id } }).eq("id", log.id);
  const message = resellerDeliveryMessage(r.email, k.api_key, r.delivery_template);
  return { ...k, ...(message ? { mensagem: message } : {}) } as { id: string; api_key: string; plano: string; expires_at: string | null; token_limit: number | null; mensagem?: string };
}

/** Teste de 30 minutos: somente revendas autorizadas; tokens ilimitados, fila comum, sem custo. */
export async function generateHourTrialKey(resellerId: string, label?: string, family: ModelFamily = "claude") {
  const db = await admin();
  const { data: r } = await db.from("resellers").select("*").eq("id", resellerId).single();
  if (!r || r.status !== "active") throw new Error("Revenda bloqueada. Pague o repasse para liberar.");
  if (!canIssueResellerKeys(r.email)) throw new Error(RESELLER_ISSUANCE_DENIED);
  if (!canGenerateHourTrial(r.email)) throw new Error("Opção não disponível para sua revenda.");
  const key = newApiKey();
  const { data: k, error } = await db.from("api_keys").insert({
    api_key: key, key_hash: await sha256Hex(key), key_prefix: key.slice(0, 12), status: "active",
    ...hourTrialLimits(Date.now()), rpm_limit: 60, plano: HOUR_TRIAL_PLAN_NAME, label: label?.trim() || null, model_family: family,
    reseller_id: r.id, reseller_cost_cents: 0,
  }).select("id, api_key, plano, expires_at, token_limit").single();
  if (error) throw new Error("Não foi possível gerar o teste de 30 minutos.");
  await db.from("audit_logs").insert({ actor_id: r.user_id, actor_email: r.email, action: HOUR_TRIAL_AUDIT_ACTION, entity: "reseller", entity_id: r.id, details: { key_id: k.id } });
  const message = resellerDeliveryMessage(r.email, k.api_key, r.delivery_template);
  return { ...k, ...(message ? { mensagem: message } : {}) } as { id: string; api_key: string; plano: string; expires_at: string | null; token_limit: number | null; mensagem?: string };
}

export async function newResellerApiKey(resellerId: string) {
  const db = await admin();
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const key = "nx_res_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  await db.from("resellers").update({ api_key: key, api_key_hash: await sha256Hex(key) }).eq("id", resellerId);
  return key;
}

export async function resellerByApiKey(token: string) {
  const db = await admin();
  const { data } = await db.from("resellers").select("id,status,api_allowed_ips").eq("api_key_hash", await sha256Hex(token)).maybeSingle();
  return data as { id: string; status: string; api_allowed_ips: string[] } | null;
}

export async function createPayoutPix(resellerId: string, origin: string, full = false, topupCents = 0) {
  const t = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!t) throw new Error("Mercado Pago não configurado");
  const db = await admin();
  const { data: r } = await db.from("resellers").select("*").eq("id", resellerId).single();
  const bal = await balanceOf(resellerId);
  if (bal.pending <= 0 && topupCents <= 0) throw new Error("Você não tem repasse pendente.");
  const settlement = readSettlement(r);
  // Recarga pré-pago: quita a dívida antiga inteira e soma o crédito pedido.
  const amountCents = topupCents > 0 ? bal.pending + topupCents : settlement && !full ? nextInstallmentCents(settlement, bal.pending) : bal.pending;
  if (amountCents <= 0) throw new Error("Você não tem repasse pendente.");
  const { data: row } = await db.from("reseller_payouts").insert({ reseller_id: resellerId, amount_cents: amountCents }).select("id").single();
  const res = await fetch(MP, {
    method: "POST",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json", "X-Idempotency-Key": row.id },
    body: JSON.stringify({
      transaction_amount: amountCents / 100, description: topupCents > 0 ? "NEXA CLOUD - Saldo pré-pago de revenda" : settlement ? "NEXA CLOUD - Acordo de regularização de revenda" : "NEXA CLOUD - Repasse de revenda", payment_method_id: "pix",
      external_reference: `payout:${row.id}`,
      notification_url: origin.startsWith("https://") ? `${origin}/api/public/mercadopago-webhook` : undefined,
      payer: { email: r.email, first_name: r.name.split(" ")[0] || "Revenda" },
    }),
  });
  const mp: any = await res.json();
  if (!res.ok) { console.error("MP payout", res.status, mp); await db.from("reseller_payouts").update({ status: "error" }).eq("id", row.id); throw new Error("Não foi possível gerar o PIX."); }
  await db.from("reseller_payouts").update({ mp_payment_id: String(mp.id) }).eq("id", row.id);
  const tx = mp.point_of_interaction?.transaction_data ?? {};
  return { id: row.id as string, qrCode: tx.qr_code as string, qrBase64: tx.qr_code_base64 as string, amount: amountCents / 100 };
}

/** Chamado pelo webhook/verificação: aprova o repasse e libera a revenda. */
export async function syncPayout(mp: any) {
  const db = await admin();
  const { data: p } = await db.from("reseller_payouts").select("*").eq("mp_payment_id", String(mp.id)).maybeSingle();
  if (!p) return "unknown";
  if (mp.status !== "approved") {
    if (p.status !== "approved") await db.from("reseller_payouts").update({ status: mp.status }).eq("id", p.id);
    return mp.status as string;
  }
  if (Math.round(Number(mp.transaction_amount) * 100) < p.amount_cents) return "amount_mismatch";
  const { data: locked } = await db.from("reseller_payouts").update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", p.id).neq("status", "approved").select("id").maybeSingle();
  if (locked) await enforce(p.reseller_id);
  return "approved";
}

export async function checkPayout(resellerId: string, id: string) {
  const db = await admin();
  const { data: p } = await db.from("reseller_payouts").select("*").eq("id", id).eq("reseller_id", resellerId).maybeSingle();
  if (!p) return "unknown";
  if (p.status === "approved" || !p.mp_payment_id) return p.status as string;
  const res = await fetch(`${MP}/${p.mp_payment_id}`, { headers: { Authorization: `Bearer ${process.env["MERCADOPAGO_ACCESS_TOKEN"]}` } });
  if (!res.ok) return p.status as string;
  return syncPayout(await res.json());
}

async function resellerKey(resellerId: string, chave: string) {
  const db = await admin();
  const { data } = await db.from("api_keys").select("*").eq("key_hash", await sha256Hex(chave.trim())).eq("reseller_id", resellerId).maybeSingle();
  if (!data) throw new Error("Chave não encontrada");
  return data;
}

/** Troca o plano e/ou a duração de uma chave existente da revenda (sem nova cobrança). */
export async function updateResellerKey(resellerId: string, chave: string, opts: { plano?: string | undefined; dias?: number | undefined }) {
  const db = await admin();
  const { data: owner } = await db.from("resellers").select("email").eq("id", resellerId).maybeSingle();
  if (!canIssueResellerKeys(owner?.email)) throw new Error(RESELLER_ISSUANCE_DENIED);
  const k = await resellerKey(resellerId, chave);
  if (k.status === "revoked") throw new Error("Chave revogada não pode ser alterada");
  const patch: any = {};
  if (opts.plano) {
    const plan = await availablePlan(db, resellerId, opts.plano);
    patch.plano = plan.name; patch.token_limit = plan.token_limit; patch.daily_token_limit = plan.daily_token_limit ?? null; patch.rpm_limit = plan.rpm_limit;
    patch.expires_at = plan.duration_days ? new Date(Date.now() + plan.duration_days * 86400000).toISOString() : null;
  }
  if (opts.dias !== undefined) patch.expires_at = opts.dias > 0 ? new Date(Date.now() + opts.dias * 86400000).toISOString() : null;
  if (!k.reseller_blocked && (k.status === "expired" || k.status === "exhausted")) patch.status = "active";
  const { data, error } = await db.from("api_keys").update(patch).eq("id", k.id).select("plano, status, expires_at, token_limit, tokens_used").single();
  if (error) throw new Error("Não foi possível alterar a chave");
  return data;
}

export async function revokeResellerKey(resellerId: string, chave: string) {
  const db = await admin();
  const k = await resellerKey(resellerId, chave);
  await db.from("api_keys").update({ status: "revoked" }).eq("id", k.id);
}

export async function deleteResellerKey(resellerId: string, chave: string) {
  const db = await admin();
  const k = await resellerKey(resellerId, chave);
  // Pré-pago: chave já usada não devolve saldo; só é revogada.
  if (Number(k.tokens_used) > 0 || Number(k.requests_count) > 0) { await db.from("api_keys").update({ status: "revoked" }).eq("id", k.id); return; }
  const { error } = await db.from("api_keys").delete().eq("id", k.id);
  if (error) throw new Error("Não foi possível excluir a chave");
  await enforce(resellerId);
}
