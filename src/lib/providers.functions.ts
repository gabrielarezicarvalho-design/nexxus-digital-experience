import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { missingProviderModels, providerCatalogModels } from "./provider-catalog";

type AdminContext = { supabase: any; userId: string };

async function assertAdmin(context: AdminContext) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Acesso negado");
}

const accountInput = z.object({
  name: z.string().trim().min(1).max(120),
  provider_type: z.enum(["CodeCraft API", "OpenAI", "Anthropic", "OpenRouter", "Personalizado"]),
  base_url: z.string().url().max(500),
  api_secret_name: z.string().trim().regex(/^[A-Z][A-Z0-9_]{2,99}$/, "Informe o nome do segredo, como CODECRAFT_API_KEY."),
  priority: z.number().int().min(0).max(10000),
});

const endpointFor = (baseUrl: string) => `${baseUrl.replace(/\/$/, "")}/models`;

async function testConnection(account: { name: string; base_url: string; api_secret_name: string }) {
  const { providerProxyHeaders, providerRequestBase } = await import("./provider-transport.server");
  const key = process.env[account.api_secret_name];
  if (!key) return { state: "unconfigured" as const, latencyMs: null, models: [] as string[] };
  const started = Date.now();
  try {
    const response = await fetch(endpointFor(providerRequestBase(account.base_url)), {
      headers: { Authorization: `Bearer ${key}`, ...providerProxyHeaders(account.base_url) },
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { state: "error" as const, latencyMs: Date.now() - started, models: [] as string[] };
    const payload = await response.json() as { data?: Array<{ id?: string }>; models?: Array<{ id?: string }> };
    const models = providerCatalogModels(account.name, (payload.data ?? payload.models ?? []).map((model) => model.id).filter((id): id is string => typeof id === "string" && Boolean(id)));
    return { state: "online" as const, latencyMs: Date.now() - started, models };
  } catch {
    return { state: "error" as const, latencyMs: Date.now() - started, models: [] as string[] };
  }
}

export const adminCreateProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => accountInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: account, error } = await context.supabase.from("provider_accounts").insert({
      ...data,
      active: true,
      paused: false,
      provider_plan: "api",
      available_models: [],
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: account.id as string };
  });

export const adminUpdateProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => accountInput.extend({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...changes } = data;
    const { error } = await context.supabase.from("provider_accounts").update(changes).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetProviderState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("provider_accounts").update({ active: data.active, paused: !data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("provider_accounts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminTestProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), updateModels: z.boolean().default(false) }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: account, error } = await context.supabase.from("provider_accounts")
      .select("name, base_url, api_secret_name").eq("id", data.id).single();
    if (error || !account) throw new Error("Fornecedor não encontrado");
    const result = await testConnection(account);
    if (data.updateModels && result.state === "online") {
      const { data: existing, error: catalogError } = await context.supabase.from("models")
        .select("name, internal_id, provider, enabled");
      if (catalogError) throw new Error(catalogError.message);
      const rows = missingProviderModels(account.name, data.id, result.models, existing ?? []);
      if (rows.length) {
        const { error: insertError } = await context.supabase.from("models")
          .upsert(rows, { onConflict: "name,provider", ignoreDuplicates: true });
        if (insertError) throw new Error(insertError.message);
      }
      const { error: updateError } = await context.supabase.from("provider_accounts")
        .update({ available_models: result.models }).eq("id", data.id);
      if (updateError) throw new Error(updateError.message);
    }
    return result;
  });

export const adminTestProviderInference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), model: z.string().trim().min(1).max(200) }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: account, error } = await context.supabase.from("provider_accounts")
      .select("name, base_url, api_secret_name, provider_type").eq("id", data.id).single();
    if (error || !account) throw new Error("Fornecedor não encontrado");
    const { inferenceRequest, inferencePayload, inferenceEmptyReplyError, sanitizeInferenceText } = await import("./provider-inference");
    const { providerChatUrl, providerProxyHeaders, providerRequestBase } = await import("./provider-transport.server");
    const { freeApiSlot } = await import("./freeapi-slots");
    const key = process.env[account.api_secret_name];
    const started = Date.now();
    const result = { ok: false, status: null as number | null, latencyMs: 0, model: data.model, reply: "", error: null as string | null };
    if (!key) return { ...result, error: "Credencial não configurada." };
    const sanitize = (value: string) => [key, process.env["NEXA_PROXY_ACCESS_TOKEN"] || "", process.env["LOVABLE_API_KEY"] || ""]
      .reduce((text, credential) => sanitizeInferenceText(text, credential), value);
    try {
      const probe = inferenceRequest(providerRequestBase(account.base_url), account.provider_type, freeApiSlot(account, data.model) ?? data.model);
      // Single direct request: never use routing, rotation, retries or client usage counters.
      const response = await fetch(probe.anthropic ? probe.url : providerChatUrl(account.base_url), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`,
          ...providerProxyHeaders(account.base_url),
          ...(probe.anthropic ? { "x-api-key": key, "anthropic-version": "2023-06-01" } : {}) },
        body: JSON.stringify(probe.body),
        redirect: probe.redirect,
        signal: AbortSignal.timeout(30000),
      });
      if (response.status >= 300 && response.status < 400) {
        await response.body?.cancel();
        return { ...result, status: response.status, latencyMs: Date.now() - started,
          error: "O fornecedor redirecionou o teste; confira a URL base cadastrada. Nenhuma credencial foi encaminhada." };
      }
      const text = await response.text();
      let payload: unknown;
      try { payload = JSON.parse(text); } catch { payload = null; }
      const parsed = inferencePayload(payload);
      const ok = response.ok && Boolean(parsed.reply.trim());
      return { ...result, ok, status: response.status, latencyMs: Date.now() - started,
        model: sanitize(parsed.model || data.model), reply: sanitize(parsed.reply),
        error: ok ? null : sanitize(parsed.error || (response.ok ? inferenceEmptyReplyError(payload) : `HTTP ${response.status}: ${payload ? "Pedido recusado pelo fornecedor." : "Resposta inválida do fornecedor."}`)) };
    } catch (cause) {
      return { ...result, latencyMs: Date.now() - started,
        error: cause instanceof Error && /timeout|abort/i.test(cause.name)
          ? "O fornecedor não respondeu em até 30 segundos."
          : "Não foi possível conectar ao fornecedor." };
    }
  });

export const adminMakePrimaryProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: account, error } = await context.supabase.from("provider_accounts")
      .select("name, base_url, api_secret_name").eq("id", data.id).single();
    if (error || !account) throw new Error("Fornecedor não encontrado");
    const discovered = await testConnection(account);
    if (discovered.state !== "online" || !discovered.models.length) {
      throw new Error("Não foi possível puxar os modelos; a seleção anterior foi mantida.");
    }
    const { data: result, error: selectionError } = await context.supabase.rpc("admin_select_primary_provider", {
      _provider_id: data.id, _available_models: discovered.models.slice(0, 500),
    });
    if (selectionError) throw new Error(selectionError.message);
    return result as { ok: boolean; provider: string; models: number };
  });

export const adminImportModels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ provider: z.string().min(1).max(120), models: z.array(z.string().min(1).max(200)).max(500) }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: existing } = await context.supabase.from("models").select("name").eq("provider", data.provider);
    const have = new Set(((existing ?? []) as { name: string }[]).map((m) => m.name));
    const slug = (data.provider.toLowerCase().split(/\s+/)[0] || "provider").replace(/[^a-z0-9]/g, "");
    const prefix = data.provider === "CodeCraft API" ? "" : `${slug}-`;
    const rows = providerCatalogModels(data.provider, data.models).map((m) => ({ name: prefix + m, display_name: prefix + m, internal_id: m, enabled: true, catalog_approved: true, provider: data.provider }))
      .filter((r) => !have.has(r.name));
    if (rows.length) {
      const { error } = await context.supabase.from("models").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { added: rows.length };
  });
