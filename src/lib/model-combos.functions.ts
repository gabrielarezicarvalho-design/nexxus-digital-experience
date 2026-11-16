import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { comboNameProblem } from "./model-combos";
import type { ProviderFailure } from "./upstream-diagnostics";

type AdminContext = { supabase: any; userId: string };
export const COMBO_CATALOG_PROVIDER = "Nexa Combo";

async function assertAdmin(context: AdminContext) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Acesso negado");
}

const comboInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().toLowerCase(),
  display_name: z.string().trim().max(80).optional().default(""),
  description: z.string().trim().max(300).optional().default(""),
  strategy: z.enum(["fallback", "round_robin"]),
  enabled: z.boolean(),
  items: z.array(z.object({ provider: z.string().trim().min(1).max(120), model: z.string().trim().min(1).max(200) })).min(1, "Adicione pelo menos um modelo.").max(20),
});

export const adminSaveCombo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => comboInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const problem = comboNameProblem(data.name);
    if (problem) throw new Error(problem);
    const providers = [...new Set(data.items.map((i) => i.provider))];
    const { data: accounts, error: accErr } = await context.supabase.from("provider_accounts").select("name").in("name", providers);
    if (accErr) throw new Error(accErr.message);
    const known = new Set(((accounts ?? []) as { name: string }[]).map((a) => a.name));
    const missing = providers.filter((p) => !known.has(p));
    if (missing.length) throw new Error(`Fornecedor não cadastrado: ${missing.join(", ")}`);

    const row = { name: data.name, display_name: data.display_name || data.name, description: data.description || null, strategy: data.strategy, enabled: data.enabled, updated_at: new Date().toISOString() };
    let id = data.id;
    let previousName: string | null = null;
    if (id) {
      const { data: prev } = await context.supabase.from("model_combos").select("name").eq("id", id).maybeSingle();
      previousName = prev?.name ?? null;
      const { error } = await context.supabase.from("model_combos").update(row).eq("id", id);
      if (error) throw new Error(error.message.includes("model_combos_name_key") ? "Já existe um combo com esse nome." : error.message);
    } else {
      const { data: created, error } = await context.supabase.from("model_combos").insert(row).select("id").single();
      if (error) throw new Error(error.message.includes("model_combos_name_key") ? "Já existe um combo com esse nome." : error.message);
      id = created.id as string;
    }
    const { error: delErr } = await context.supabase.from("model_combo_items").delete().eq("combo_id", id);
    if (delErr) throw new Error(delErr.message);
    const { error: itemsErr } = await context.supabase.from("model_combo_items").insert(data.items.map((item, position) => ({ combo_id: id, position, ...item })));
    if (itemsErr) throw new Error(itemsErr.message);

    // Catálogo: o combo aparece para os clientes com o nome dele.
    if (previousName && previousName !== data.name) await context.supabase.from("models").delete().eq("provider", COMBO_CATALOG_PROVIDER).eq("name", previousName);
    const { error: catErr } = await context.supabase.from("models").upsert({
      name: data.name, display_name: data.display_name || data.name, provider: COMBO_CATALOG_PROVIDER, internal_id: null,
      enabled: data.enabled, catalog_approved: data.enabled, description: data.description || null,
    }, { onConflict: "name,provider" });
    if (catErr) throw new Error(catErr.message);
    await context.supabase.from("audit_logs").insert({ actor_id: context.userId, action: data.id ? "combo.update" : "combo.create", entity: "model_combo", entity_id: id, details: { name: data.name, items: data.items.length, strategy: data.strategy } });
    return { id };
  });

export const adminDeleteCombo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: combo } = await context.supabase.from("model_combos").select("name").eq("id", data.id).maybeSingle();
    const { error } = await context.supabase.from("model_combos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (combo) await context.supabase.from("models").delete().eq("provider", COMBO_CATALOG_PROVIDER).eq("name", combo.name);
    await context.supabase.from("audit_logs").insert({ actor_id: context.userId, action: "combo.delete", entity: "model_combo", entity_id: data.id, details: { name: combo?.name ?? null } });
    return { ok: true };
  });

/** Testa o combo de verdade: manda uma pergunta curta pelo mesmo caminho dos clientes e mostra quem respondeu. */
export const adminTestCombo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ name: z.string().trim().min(3).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { fetchUpstream } = await import("./upstream.server");
    const started = Date.now();
    const failures: ProviderFailure[] = [];
    try {
      const up = await fetchUpstream({ model: data.name, max_tokens: 20, stream: false, messages: [{ role: "user", content: "Responda apenas: ok" }] }, AbortSignal.timeout(90_000), null, failures);
      const text = await up.res.text();
      let reply = "";
      try { reply = JSON.parse(text)?.choices?.[0]?.message?.content ?? ""; } catch { reply = ""; }
      return { ok: up.res.ok, status: up.res.status, provider: up.provider, model: up.upstreamModel, ms: Date.now() - started, reply: String(reply).slice(0, 200), failures: failures.map(({ provider, model, status, latencyMs }) => ({ provider, model, status, latencyMs })) };
    } catch (e) {
      return { ok: false, status: 0, provider: null, model: null, ms: Date.now() - started, reply: e instanceof Error ? e.message : "Falha", failures: failures.map(({ provider, model, status, latencyMs }) => ({ provider, model, status, latencyMs })) };
    }
  });
