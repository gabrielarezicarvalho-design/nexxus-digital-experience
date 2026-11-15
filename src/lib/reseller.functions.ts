import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canEditDeliveryMessage, DEFAULT_DELIVERY_TEMPLATE } from "./reseller-delivery-message";
import { balanceOf, checkPayout, createPayoutPix, generateKey, generateTrialKey, generateHourTrialKey, newResellerApiKey, resellerTrialsUsed } from "./reseller.server";
import { canGenerateHourTrial, trialsRemaining } from "./free-trial";
import { resellerIpsInput } from "./reseller-ip-rules";
import { resellerApiUrls } from "./reseller-domain";
import { hasTokenLimit } from "./plan-limits";

async function myReseller(supabase: any, userId: string) {
  const { data } = await supabase.from("resellers").select("*").eq("user_id", userId).maybeSingle();
  // Reseller panel restricted to a single approved reseller; keys of others keep working.
  if (!data || String((data as any).email || "").toLowerCase() !== RESELLER_PANEL_EMAIL) return null;
  return data as any;
}
export const RESELLER_PANEL_EMAIL = "diegopiantkoski@gmail.com";

export const getResellerPanel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const r = await myReseller(context.supabase, context.userId);
    if (!r) return { reseller: null };
    const [keys, payouts, plans, bal, customPlans, trialsUsed] = await Promise.all([
      context.supabase.from("api_keys").select("id,api_key,plano,label,status,requests_count,tokens_used,token_limit,reseller_cost_cents,reseller_blocked,created_at,expires_at").eq("reseller_id", r.id).order("created_at", { ascending: false }),
      context.supabase.from("reseller_payouts").select("id,amount_cents,status,created_at,approved_at").eq("reseller_id", r.id).order("created_at", { ascending: false }),
      context.supabase.from("plans").select("code,name,price_cents,token_limit,daily_token_limit").eq("active", true).order("sort_order"),
      balanceOf(r.id),
      context.supabase.from("reseller_plans").select("*").eq("reseller_id", r.id).order("created_at", { ascending: false }),
      resellerTrialsUsed(r.id),
    ]);
    if (customPlans.error) throw new Error("Não foi possível carregar seus planos personalizados.");
    return {
      apiUrls: resellerApiUrls(r.email),
      reseller: { id: r.id, name: r.name, status: r.status, cost_cents: r.cost_cents, debt_limit_cents: r.debt_limit_cents, api_key: r.api_key as string | null, custom_domain: r.custom_domain as string | null, custom_domain_status: r.custom_domain_status as string, settlement_total_cents: r.settlement_total_cents as number | null, settlement_installments: r.settlement_installments as number | null },
      deliveryTemplate: canEditDeliveryMessage(r.email) ? ((r.delivery_template as string | null) || DEFAULT_DELIVERY_TEMPLATE) : null,
      keys: (keys.data ?? []).map((k: any) => ({ ...k, price_cents: ((plans.data ?? []) as any[]).filter((p) => k.plano?.startsWith(p.name)).sort((a, b) => b.name.length - a.name.length)[0]?.price_cents ?? 0 })), payouts: payouts.data ?? [], plans: [...(plans.data ?? []).filter(hasTokenLimit), ...(customPlans.data ?? []).filter((p) => p.active && hasTokenLimit(p)).map((p) => ({ code: p.code, name: `${p.name} · Personalizado`, price_cents: 0 }))], customPlans: (customPlans.data ?? []).filter(hasTokenLimit), balance: bal, trialsLeft: trialsRemaining(trialsUsed), hourTrial: canGenerateHourTrial(r.email),
    };
  });

export const resellerGenerateKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ plan: z.string().max(40), label: z.string().trim().max(60).optional(), family: z.enum(["claude", "openai", "combo"]).default("claude") }).parse(d))
  .handler(async ({ context, data }) => {
    const r = await myReseller(context.supabase, context.userId);
    if (!r) throw new Error("Você não é revendedor.");
    return generateKey(r.id, data.plan, data.label, data.family);
  });

export const resellerGenerateTrialKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ label: z.string().trim().max(60).optional(), family: z.enum(["claude", "openai", "combo"]).default("claude") }).parse(d))
  .handler(async ({ context, data }) => {
    const r = await myReseller(context.supabase, context.userId);
    if (!r) throw new Error("Você não é revendedor.");
    return generateTrialKey(r.id, data.label, data.family);
  });

export const resellerGenerateHourTrialKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ label: z.string().trim().max(60).optional(), family: z.enum(["claude", "openai", "combo"]).default("claude") }).parse(d))
  .handler(async ({ context, data }) => {
    const r = await myReseller(context.supabase, context.userId);
    if (!r) throw new Error("Você não é revendedor.");
    return generateHourTrialKey(r.id, data.label, data.family);
  });

export const resellerSaveDeliveryMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ text: z.string().max(4000) }).parse(d))
  .handler(async ({ context, data }) => {
    const r = await myReseller(context.supabase, context.userId);
    if (!r || !canEditDeliveryMessage(r.email)) throw new Error("Opção não disponível para sua revenda.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const text = data.text.trim() ? data.text : null;
    const { error } = await (supabaseAdmin as any).from("resellers").update({ delivery_template: text }).eq("id", r.id);
    if (error) throw new Error("Não foi possível salvar a mensagem.");
    return { ok: true };
  });

export const resellerRenameKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), label: z.string().trim().max(60) }).parse(d))
  .handler(async ({ context, data }) => {
    const r = await myReseller(context.supabase, context.userId);
    if (!r) throw new Error("Você não é revendedor.");
    const { error } = await context.supabase.from("api_keys")
      .update({ label: data.label || null })
      .eq("id", data.id).eq("reseller_id", r.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resellerSetKeyStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const r = await myReseller(context.supabase, context.userId);
    if (!r) throw new Error("Você não é revendedor.");
    const { error } = await context.supabase.from("api_keys")
      .update({ status: data.active ? "active" : "blocked" })
      .eq("id", data.id).eq("reseller_id", r.id).eq("reseller_blocked", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resellerDeleteKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const r = await myReseller(context.supabase, context.userId);
    if (!r) throw new Error("Você não é revendedor.");
    const { data: k } = await context.supabase.from("api_keys").select("id,tokens_used,requests_count").eq("id", data.id).eq("reseller_id", r.id).maybeSingle();
    if (!k) throw new Error("Chave não encontrada");
    // Pré-pago: chave já usada não devolve saldo; só é revogada.
    const used = Number(k.tokens_used) > 0 || Number(k.requests_count) > 0;
    const { error } = used
      ? await context.supabase.from("api_keys").update({ status: "revoked" }).eq("id", data.id).eq("reseller_id", r.id)
      : await context.supabase.from("api_keys").delete().eq("id", data.id).eq("reseller_id", r.id);
    if (error) throw new Error(error.message);
    return { ok: true, revoked: used };
  });

export const resellerRotateApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const r = await myReseller(context.supabase, context.userId);
    if (!r) throw new Error("Você não é revendedor.");
    return { key: await newResellerApiKey(r.id) };
  });

export const resellerPayPix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ full: z.boolean().optional(), topup_cents: z.number().int().min(100).max(10_000_000).optional() }).optional().parse(d ?? undefined))
  .handler(async ({ context, data }) => {
    const r = await myReseller(context.supabase, context.userId);
    if (!r) throw new Error("Você não é revendedor.");
    return createPayoutPix(r.id, (await import("./public-origin.server")).publicOrigin(getRequest().url), data?.full === true, data?.topup_cents ?? 0);
  });

export const resellerCheckPix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const r = await myReseller(context.supabase, context.userId);
    if (!r) throw new Error("Você não é revendedor.");
    return { status: await checkPayout(r.id, data.id) };
  });

// Domínio próprio do revendedor: verifica o CNAME via DNS-over-HTTPS (workerd-safe, sem Node dns)
const CNAME_TARGET = "cloudnexa.com.br";
const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

const HOST_IP = "185.158.133.1";
async function dns(name: string, type: string) {
  const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, { headers: { accept: "application/dns-json" } });
  if (!res.ok) return [];
  return (((await res.json()) as { Answer?: { type: number; data: string }[] }).Answer ?? []);
}
// Aceita CNAME para cloudnexa.com.br (subdomínio) ou registro A para o IP da hospedagem (domínio raiz)
async function checkCname(domain: string): Promise<boolean> {
  try {
    const cname = await dns(domain, "CNAME");
    if (cname.some((a) => a.type === 5 && a.data.replace(/\.$/, "").toLowerCase() === CNAME_TARGET)) return true;
    const a = await dns(domain, "A");
    return a.some((r) => r.type === 1 && r.data === HOST_IP);
  } catch {
    return false;
  }
}

export const resellerSetCustomDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ domain: z.string().trim().toLowerCase().max(253) }).parse(d))
  .handler(async ({ context, data }) => {
    const r = await myReseller(context.supabase, context.userId);
    if (!r) throw new Error("Você não é revendedor.");
    const domain = data.domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!domain) {
      await (await import("@/integrations/supabase/client.server")).supabaseAdmin.from("resellers").update({ custom_domain: null, custom_domain_status: "pending" }).eq("id", r.id);
      return { domain: null, status: "pending" };
    }
    if (!DOMAIN_RE.test(domain)) throw new Error("Domínio inválido. Use algo como api.sualoja.com");
    if (domain === CNAME_TARGET || domain.endsWith(".cloudnexa.com.br") || domain === "cloudnexapro.site" || domain.endsWith(".cloudnexapro.site") || domain.endsWith(".nexapro.site")) throw new Error("Esse já é o endereço padrão da NEXA.");
    const { error } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin.from("resellers").update({ custom_domain: domain, custom_domain_status: "pending" }).eq("id", r.id);
    if (error) throw new Error(error.code === "23505" ? "Esse domínio já está em uso por outra revenda." : error.message);
    const ok = await checkCname(domain);
    if (ok) await (await import("@/integrations/supabase/client.server")).supabaseAdmin.from("resellers").update({ custom_domain_status: "active" }).eq("id", r.id);
    return { domain, status: ok ? "active" : "pending" };
  });

export const resellerCheckCustomDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const r = await myReseller(context.supabase, context.userId);
    if (!r?.custom_domain) throw new Error("Nenhum domínio configurado.");
    const ok = await checkCname(r.custom_domain);
    await (await import("@/integrations/supabase/client.server")).supabaseAdmin.from("resellers").update({ custom_domain_status: ok ? "active" : "pending" }).eq("id", r.id);
    return { status: ok ? "active" : "pending" };
  });

// ---------- Admin ----------
async function requireAdmin(context: any) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Acesso negado");
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin as any;
}

export const adminListResellers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const { data } = await db.from("resellers").select("id,name,email,status,cost_cents,debt_limit_cents,created_at,api_allowed_ips").order("created_at", { ascending: false });
    return Promise.all((data ?? []).map(async (r: any) => ({ ...r, balance: await balanceOf(r.id) })));
  });

export const adminUpsertReseller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    email: z.string().trim().email().max(255),
    cost_cents: z.number().int().min(0).max(10_000_000),
    debt_limit_cents: z.number().int().min(100).max(100_000_000),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const db = await requireAdmin(context);
    const email = data.email.toLowerCase();
    const { data: client } = await db.from("clients").select("user_id,name").ilike("email", email).not("user_id", "is", null).maybeSingle();
    if (!client) throw new Error("Esse e-mail ainda não tem conta criada no site.");
    const { data: existing } = await db.from("resellers").select("id").eq("user_id", client.user_id).maybeSingle();
    if (existing) {
      await db.from("resellers").update({ cost_cents: data.cost_cents, debt_limit_cents: data.debt_limit_cents }).eq("id", existing.id);
    } else {
      await db.from("resellers").insert({ user_id: client.user_id, name: client.name, email, cost_cents: data.cost_cents, debt_limit_cents: data.debt_limit_cents });
    }
    const { data: r } = await db.from("resellers").select("id").eq("user_id", client.user_id).single();
    const { enforce } = await import("./reseller.server");
    await enforce(r.id);
    await db.from("audit_logs").insert({ actor_id: context.userId, action: "reseller.upsert", entity: "reseller", entity_id: r.id, details: data });
    return { ok: true };
  });

export const adminSaveResellerIps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => resellerIpsInput.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_save_reseller_api_ips", { _reseller_id: data.id, _ips: data.ips });
    if (error) throw new Error("Não foi possível salvar os IPs autorizados.");
    return { ok: true };
  });

export const adminResellerApiIps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: ips, error } = await context.supabase.rpc("admin_reseller_api_ips", { _reseller_id: data.id });
    if (error) throw new Error("Não foi possível carregar os acessos da API.");
    return ips as unknown as { ip: string | null; requests: number; denied: number; last_seen: string }[];
  });

export const adminSetResellerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), enabled: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const db = await requireAdmin(context);
    if (data.enabled) {
      await db.from("resellers").update({ status: "active" }).eq("id", data.id);
      await db.from("api_keys").update({ status: "active", reseller_blocked: false }).eq("reseller_id", data.id).eq("reseller_blocked", true);
      const { enforce } = await import("./reseller.server");
      await enforce(data.id);
    } else {
      await db.from("resellers").update({ status: "disabled" }).eq("id", data.id);
      await db.from("api_keys").update({ status: "blocked", reseller_blocked: true }).eq("reseller_id", data.id).eq("status", "active");
    }
    return { ok: true };
  });

export const adminMarkPayoutPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const db = await requireAdmin(context);
    const bal = await balanceOf(data.id);
    if (bal.pending > 0) await db.from("reseller_payouts").insert({ reseller_id: data.id, amount_cents: bal.pending, status: "approved", approved_at: new Date().toISOString() });
    const { enforce } = await import("./reseller.server");
    await enforce(data.id);
    return { ok: true };
  });

export const adminListResellerKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const { data, error } = await db.from("api_keys").select("id,api_key,plano,status,reseller_id,reseller_blocked,tokens_used,token_limit,requests_count,created_at,expires_at").not("reseller_id", "is", null).order("created_at", { ascending: false }).limit(5000);
    if (error) throw new Error(error.message);
    return (data ?? []) as any[];
  });
