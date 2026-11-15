import { providerModelAllowed } from "./provider-catalog";
import { apiModelList } from "./api-model-list";
import { astraAliasAvailable, ASTRA_ALIAS } from "./astra-alias";

export type AssistantAccount = { name: string; active: boolean; paused: boolean; priority: number; created_at: string; available_models: string[] | null };
export type AssistantModel = { name: string; display_name: string | null; internal_id: string | null; provider: string; enabled: boolean; catalog_approved: boolean };

export function assistantAccount(accounts: AssistantAccount[], forcedProvider?: string | null) {
  const active = accounts.filter(a => a.active && !a.paused);
  const account = forcedProvider ? active.find(a => a.name === forcedProvider)
    : active.sort((a, b) => a.priority - b.priority || a.created_at.localeCompare(b.created_at))[0];
  if (!account) throw new Error("Modelos temporariamente indisponíveis.");
  return account;
}

export function assistantModels(accounts: AssistantAccount | AssistantAccount[], catalog: AssistantModel[], allowed?: string[]) {
  const active = (Array.isArray(accounts) ? accounts : [accounts]).filter(a => a.active && !a.paused);
  const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const eligible = catalog.filter(m => m.enabled && m.catalog_approved && active.some(account => {
    const internal = m.internal_id || m.name;
    return (m.provider === account.name && providerModelAllowed(account.name, internal)
      && (account.available_models ?? []).some(name => normalize(name) === normalize(internal)))
      || (m.name === ASTRA_ALIAS && astraAliasAvailable(account.name, account.available_models ?? []));
  }) && (!allowed || allowed.some(name => normalize(name) === normalize(m.name))));
  const ids = apiModelList(eligible.map(m => m.name), eligible.map(m => m.name));
  return ids.map(id => {
    const row = eligible.find(m => m.name === id);
    return { id, label: row?.display_name || id };
  })
    .sort((a, b) => Number(b.id.includes("opus")) - Number(a.id.includes("opus")) || a.label.localeCompare(b.label));
}