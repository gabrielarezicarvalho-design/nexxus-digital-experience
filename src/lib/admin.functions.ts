import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { newApiKey, sha256Hex } from "./keys.server";
import { requireTokenLimit } from "./plan-limits";
import { asFamily, type ModelFamily } from "./model-family";
import { assertAdminAccess } from "./admin-access";

const familyField = z.enum(["claude", "openai", "combo"]).default("claude");

type Ctx = { supabase: any; userId: string; claims: any };

async function assertAdmin(ctx: Ctx) {
  await assertAdminAccess(ctx.supabase, ctx.userId);
}

async function audit(ctx: Ctx, action: string, entity: string, entity_id: string | null, details?: unknown) {
  await ctx.supabase.from("audit_logs").insert({
    actor_id: ctx.userId, actor_email: ctx.claims?.email ?? null, action, entity, entity_id, details: details ?? null,
  });
}

async function issueKey(ctx: Ctx, clientId: string, opts: { token_limit: number | null; daily_token_limit?: number | null; expires_at: string | null; rpm_limit: number; plano: string | null; model_family?: ModelFamily }) {
  requireTokenLimit(opts);
  const key = newApiKey();
  const { data, error } = await ctx.supabase.from("api_keys").insert({
    created_by: ctx.userId,
    client_id: clientId, api_key: key, key_hash: await sha256Hex(key), key_prefix: key.slice(0, 12),
    status: "active", ...opts,
  }).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string, key };
}

const clientInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  company: z.string().trim().max(120).nullable().optional(),
  plan_id: z.string().uuid().nullable().optional(),
  token_limit: z.number().int().positive().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  family: familyField.optional(),
  status: z.enum(["active", "blocked"]).default("active"),
});

export const adminCreateClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => clientInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let plan: any = null;
    if (data.plan_id) plan = (await context.supabase.from("plans").select("*").eq("id", data.plan_id).single()).data;
    if (data.plan_id && (!plan || !plan.active)) throw new Error("Plano indisponível.");
    requireTokenLimit({ token_limit: data.token_limit ?? plan?.token_limit, daily_token_limit: plan?.daily_token_limit });
    const { data: c, error } = await context.supabase.from("clients").insert({
      name: data.name, email: data.email.toLowerCase(), company: data.company ?? null, plan_id: data.plan_id ?? null, status: data.status,
    }).select("id").single();
    if (error) throw new Error(error.message);
    const expires = data.expires_at ?? (plan?.duration_days ? new Date(Date.now() + plan.duration_days * 86400000).toISOString() : null);
    const k = await issueKey(context, c.id, {
      token_limit: data.token_limit ?? plan?.token_limit ?? null, daily_token_limit: plan?.daily_token_limit ?? null, expires_at: expires, rpm_limit: plan?.rpm_limit ?? 60, plano: plan?.name ?? null, model_family: data.family ?? "claude",
    });
    await audit(context, "client.create", "client", c.id, { name: data.name, email: data.email });
    return { clientId: c.id as string, apiKey: k.key };
  });

export const adminUpdateClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => clientInput.partial().extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, token_limit, expires_at, ...rest } = data;
    const clean = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)) as any;
    const { error } = await context.supabase.from("clients").update(clean).eq("id", id);
    if (error) throw new Error(error.message);
    if (token_limit !== undefined || expires_at !== undefined) {
      const patch: any = {};
      if (token_limit !== undefined) patch["token_limit"] = token_limit;
      if (expires_at !== undefined) patch["expires_at"] = expires_at;
      await context.supabase.from("api_keys").update(patch).eq("client_id", id).in("status", ["active", "blocked", "exhausted", "expired"]);
    }
    await audit(context, "client.update", "client", id, data);
    return { ok: true };
  });

export const adminSetClientStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), status: z.enum(["active", "blocked"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await context.supabase.from("clients").update({ status: data.status }).eq("id", data.id);
    await audit(context, data.status === "blocked" ? "client.block" : "client.unblock", "client", data.id);
    return { ok: true };
  });

export const adminDeleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("clients").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context, "client.delete", "client", data.id);
    return { ok: true };
  });

/** Exclui clientes que nunca tiveram nenhuma chave (e a conta de login deles). Preserva admins, revendedores, afiliados e quem tem pagamento. */
export const adminPurgeKeylessClients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: clients, error } = await supabaseAdmin.from("clients").select("id, user_id, email, api_keys(id), payments(id)");
    if (error) throw new Error(error.message);
    const candidates = (clients ?? []).filter((c: any) => (c.api_keys ?? []).length === 0 && (c.payments ?? []).length === 0);
    const userIds = candidates.map((c: any) => c.user_id).filter(Boolean) as string[];
    const protectedIds = new Set<string>();
    if (userIds.length) {
      const [{ data: roles }, { data: affs }, { data: resellers }] = await Promise.all([
        supabaseAdmin.from("user_roles").select("user_id").in("user_id", userIds).in("role", ["admin", "reseller"]),
        supabaseAdmin.from("affiliates").select("user_id").in("user_id", userIds),
        supabaseAdmin.from("resellers").select("user_id").in("user_id", userIds),
      ]);
      for (const r of [...(roles ?? []), ...(affs ?? []), ...(resellers ?? [])]) protectedIds.add((r as any).user_id);
    }
    protectedIds.add(context.userId);
    let deleted = 0; const failed: string[] = [];
    for (const c of candidates as any[]) {
      if (c.user_id && protectedIds.has(c.user_id)) continue;
      const { error: delErr } = await supabaseAdmin.from("clients").delete().eq("id", c.id);
      if (delErr) { failed.push(c.email); continue; }
      if (c.user_id) {
        const { data: other } = await supabaseAdmin.from("clients").select("id").eq("user_id", c.user_id).limit(1);
        if (!other?.length) { const { error: uErr } = await supabaseAdmin.auth.admin.deleteUser(c.user_id); if (uErr) failed.push(c.email); }
      }
      deleted++;
    }
    // Contas de login sem cadastro de cliente e sem nenhuma chave.
    const { data: allClients } = await supabaseAdmin.from("clients").select("user_id").not("user_id", "is", null);
    const { data: keyOwners } = await supabaseAdmin.from("api_keys").select("user_id").not("user_id", "is", null);
    const [{ data: roles2 }, { data: affs2 }, { data: res2 }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id").in("role", ["admin", "reseller"]),
      supabaseAdmin.from("affiliates").select("user_id"),
      supabaseAdmin.from("resellers").select("user_id"),
    ]);
    const keep = new Set<string>([context.userId, ...[...(allClients ?? []), ...(keyOwners ?? []), ...(roles2 ?? []), ...(affs2 ?? []), ...(res2 ?? [])].map((r: any) => r.user_id)]);
    for (let page = 1; page < 50; page++) {
      const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (listErr || !list?.users.length) break;
      for (const u of list.users) {
        if (keep.has(u.id)) continue;
        const { error: uErr } = await supabaseAdmin.auth.admin.deleteUser(u.id);
        if (uErr) failed.push(u.email ?? u.id); else deleted++;
      }
      if (list.users.length < 200) break;
    }
    await audit(context, "client.purge_keyless", "client", null, { deleted, failed });
    return { deleted, failed };
  });

/** IPs distintos que usaram uma chave nos últimos 7 dias (detecta compartilhamento/revenda irregular). */
export const adminKeyIps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ keyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: result, error } = await context.supabase.rpc("admin_client_key_ips", { _key_id: data.keyId });
    if (error) throw new Error(error.message);
    return result as unknown as { ip_limit: number; ips: { ip: string; requests: number; first_seen: string; last_seen: string }[] };
  });

/** Altera quantos IPs distintos (7 dias) a chave pode usar. Se a chave estava bloqueada pelo limite de IP e agora cabe no novo limite, ela é reativada. */
export const adminSetKeyIpLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ keyId: z.string().uuid(), ipLimit: z.number().int().min(1).max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: key, error } = await context.supabase.from("api_keys").update({ ip_limit: data.ipLimit })
      .eq("id", data.keyId).select("id, status").maybeSingle();
    if (error) throw new Error(error.message);
    if (!key) throw new Error("Chave não encontrada");
    let reactivated = false;
    if (key.status === "blocked") {
      const [{ data: count }, { data: ipBlock }] = await Promise.all([
        context.supabase.rpc("key_ip_count", { _key_id: data.keyId }),
        context.supabase.from("request_logs").select("id").eq("api_key_id", data.keyId).like("error", "bloqueio automático%").limit(1),
      ]);
      if (ipBlock?.length && (count ?? 0) <= 2) {
        await context.supabase.from("api_keys").update({ status: "active" }).eq("id", data.keyId).eq("status", "blocked");
        reactivated = true;
      }
    }
    await audit(context, "key.ip_limit", "api_key", data.keyId, { ip_limit: data.ipLimit, reactivated });
    return { ok: true, reactivated };
  });

export const adminSetKeyStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), status: z.enum(["active", "blocked", "revoked"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await context.supabase.from("api_keys").update({ status: data.status }).eq("id", data.id);
    await audit(context, `key.${data.status}`, "api_key", data.id);
    return { ok: true };
  });

export const adminRegenerateKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ clientId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: old } = await context.supabase.from("api_keys").select("*").eq("client_id", data.clientId)
      .neq("status", "revoked").order("created_at", { ascending: false }).limit(1).maybeSingle();
    requireTokenLimit({ token_limit: old?.token_limit, daily_token_limit: old?.daily_token_limit });
    await context.supabase.from("api_keys").update({ status: "revoked" }).eq("client_id", data.clientId).neq("status", "revoked");
    const k = await issueKey(context, data.clientId, {
      token_limit: old?.token_limit ?? null, daily_token_limit: old?.daily_token_limit ?? null, expires_at: old?.expires_at ?? null, rpm_limit: old?.rpm_limit ?? 60, plano: old?.plano ?? null, model_family: asFamily(old?.model_family),
    });
    if (old) await context.supabase.from("api_keys").update({ tokens_used: old.tokens_used }).eq("id", k.id);
    await audit(context, "key.regenerate", "client", data.clientId);
    return { apiKey: k.key };
  });

export const adminRenewKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ clientId: z.string().uuid(), days: z.number().int().min(0).max(3650), addTokens: z.number().int().min(0) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: k } = await context.supabase.from("api_keys").select("*").eq("client_id", data.clientId)
      .neq("status", "revoked").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!k) throw new Error("Cliente sem chave");
    const base = k.expires_at && new Date(k.expires_at) > new Date() ? new Date(k.expires_at) : new Date();
    const patch: any = { status: "active" };
    if (data.days > 0) patch["expires_at"] = new Date(base.getTime() + data.days * 86400000).toISOString();
    if (data.addTokens > 0) patch["token_limit"] = (k.token_limit ?? k.tokens_used) + data.addTokens;
    await context.supabase.from("api_keys").update(patch).eq("id", k.id);
    await audit(context, "key.renew", "client", data.clientId, data);
    return { ok: true };
  });

export const adminFindClientByKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ key: z.string().trim().min(8).max(512) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const keyHash = await sha256Hex(data.key);
    const { data: key, error } = await context.supabase.from("api_keys")
      .select("id, client_id").eq("key_hash", keyHash).maybeSingle();
    if (error) throw new Error(error.message);
    return { clientId: (key?.client_id as string | null | undefined) ?? null, keyId: (key?.id as string | null | undefined) ?? null };
  });

export const adminGenerateKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    clientId: z.string().uuid(),
    token_limit: z.number().int().positive().nullable(),
    plan_id: z.string().uuid().nullable().optional(),
    days: z.number().int().min(0).max(3650),
    rpm_limit: z.number().int().min(1).max(10000).default(60),
    plano: z.string().max(120).nullable().default(null),
    family: familyField,
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const plan = data.plan_id ? (await context.supabase.from("plans").select("*").eq("id", data.plan_id).eq("active", true).maybeSingle()).data : null;
    if (data.plan_id && !plan) throw new Error("Plano indisponível.");
    const k = await issueKey(context, data.clientId, {
      token_limit: data.token_limit ?? plan?.token_limit ?? null,
      daily_token_limit: plan?.daily_token_limit ?? null,
      expires_at: data.days > 0 ? new Date(Date.now() + data.days * 86400000).toISOString() : null,
      rpm_limit: data.rpm_limit, plano: plan?.name ?? data.plano, model_family: data.family,
    });
    await audit(context, "key.generate", "client", data.clientId, { token_limit: data.token_limit, days: data.days });
    return { apiKey: k.key };
  });
