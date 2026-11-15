import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createOpenAI } from "@ai-sdk/openai";
import { assistantModels } from "./assistant-models";
import { clientKeyModelNames, clientModelNames } from "./client-models.server";
import { keyProvider } from "./key-provider";
import { isDedicatedOnly, fetchUpstream } from "./upstream.server";
import { assistantClientFilter } from "./assistant-identity";

// Caller has verified the user session; resolve account ownership with user RLS first.
export async function assistantModelContext(db: SupabaseClient<Database>, userId: string, verifiedEmail?: string | null) {
  const { data: clients, error } = await db.from("clients").select("id,forced_provider")
    .or(assistantClientFilter(userId, verifiedEmail));
  if (error) throw new Error("Não foi possível carregar os modelos.");
  const dedicated = clients?.find(c => c.forced_provider);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [accounts, catalog] = await Promise.all([
    supabaseAdmin.from("provider_accounts").select("name,active,paused,priority,created_at,available_models,dedicated_only"),
    supabaseAdmin.from("models").select("name,display_name,internal_id,provider,enabled,catalog_approved"),
  ]);
  if (accounts.error || catalog.error) throw new Error("Não foi possível carregar os modelos.");
  const ids = (clients ?? []).map(client => client.id);
  const query = db.from("api_keys").select("client_id,model_family,allowed_models,forced_provider");
  const keys = await (ids.length ? query.or(`user_id.eq.${userId},client_id.in.(${ids.join(",")})`) : query.eq("user_id", userId));
  if (keys.error) throw new Error("Não foi possível carregar os modelos.");
  const routes = new Map<string, string | null>();
  for (const key of keys.data ?? []) {
    const ownedKey = { ...key, clients: clients?.find(client => client.id === key.client_id) };
    const forced = keyProvider(ownedKey);
    for (const name of await clientKeyModelNames(forced ? supabaseAdmin : db, ownedKey)) {
      if (!routes.has(name)) routes.set(name, forced ?? null);
    }
  }
  const forcedProvider = dedicated?.forced_provider ?? null;
  const allowed = keys.data?.length ? [...routes.keys()]
    : dedicated ? await clientModelNames(supabaseAdmin, forcedProvider, dedicated.id, "combo") : undefined;
  const providerNames = forcedProvider?.split(",").map(name => name.trim()) ?? [];
  const keyProviders = [...routes.values()].flatMap(value => value?.split(",").map(name => name.trim()) ?? []);
  const eligibleAccounts = (accounts.data ?? []).filter(account => providerNames.length || keyProviders.length
    ? providerNames.includes(account.name) || keyProviders.includes(account.name) || ([...routes.values()].includes(null) && !isDedicatedOnly(account))
    : !isDedicatedOnly(account));
  const models = assistantModels(eligibleAccounts, catalog.data ?? [], allowed);
  const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const model of models) {
    if (routes.has(model.id)) continue;
    const equivalent = [...routes.keys()].find(name => normalize(name) === normalize(model.id));
    if (equivalent) routes.set(model.id, routes.get(equivalent) ?? null);
  }
  return { models, routes, forcedProvider };
}

export function assistantLanguageModel(providerName: string | null, modelId: string) {
  // Reuse the existing Messages adapters, key rotation and VPS authorization; never expose credentials.
  const provider = createOpenAI({
    baseURL: "https://assistant.internal/v1",
    apiKey: "internal-router",
    fetch: async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      const upstream = await fetchUpstream({ ...body, model: modelId }, init?.signal ?? undefined, providerName);
      if (upstream.res.status >= 300 && upstream.res.status < 400) throw new Error("Conexão indisponível.");
      if (!upstream.res.ok) return Response.json({ error: { message: "O modelo está temporariamente indisponível." } }, { status: upstream.res.status });
      return upstream.res;
    },
  });
  return provider.chat(modelId);
}