import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { filterByFamily, type ModelFamily } from './model-family';
import { invisionPublicModels } from './invision-models';
import { filterPlanModels } from './plan-models';
import { asFamily } from './model-family';
import { keyProvider } from './key-provider';
import { apiModelList } from './api-model-list';
import { ASTRA_ALIAS, astraAliasAvailable } from './astra-alias';

// Dashboard API instructions use the same key restrictions as generation.
export async function clientKeyModelNames(db: SupabaseClient<Database>, key: { client_id: string | null; model_family: string; allowed_models?: string[] | null; forced_provider?: string | null; clients?: unknown }) {
  const names = await clientModelNames(db, keyProvider(key), key.client_id, asFamily(key.model_family), key.allowed_models ?? null);
  const { data: catalog, error } = await db.rpc('client_public_model_names');
  if (error) throw new Error('Não foi possível carregar os modelos disponíveis.');
  return apiModelList(names, catalog ?? [], key.allowed_models);
}

// Call only after resolving the client from verified account/key ownership.
export async function clientModelNames(db: SupabaseClient<Database>, forcedProvider?: string | null, clientId?: string | null, family: ModelFamily = 'claude', allowed: string[] | null = null): Promise<string[]> {
  const names = await allClientModelNames(db, forcedProvider, clientId);
  // Vale para todos, inclusive clientes dedicados: chave GPT só GPT, Claude só Claude.
  return filterPlanModels(allowed, filterByFamily(family, names));
}

async function allClientModelNames(db: SupabaseClient<Database>, forcedProvider?: string | null, clientId?: string | null): Promise<string[]> {
  const list = forcedProvider ? forcedProvider.split(',').map(v => v.trim()).filter(Boolean) : [];
  if (list.length > 1) return [...new Set((await Promise.all(list.map(p => providerModelNames(db, p, clientId)))).flat())];
  return providerModelNames(db, forcedProvider, clientId);
}

async function providerModelNames(db: SupabaseClient<Database>, forcedProvider?: string | null, clientId?: string | null): Promise<string[]> {
  if (forcedProvider) {
    const { data, error } = await db.from('provider_accounts').select('available_models')
      .eq('name', forcedProvider).eq('active', true).eq('paused', false).maybeSingle();
    if (error) throw new Error('Não foi possível carregar os modelos disponíveis.');
    const names = [...new Set(data?.available_models ?? [])];
    if (astraAliasAvailable(forcedProvider, names)) names.push(ASTRA_ALIAS);
    if (forcedProvider === 'Invision') return invisionPublicModels(names);
    if (forcedProvider === 'FreeModel' && clientId) {
      const { data: client, error: clientError } = await db.from('clients').select('email').eq('id', clientId).maybeSingle();
      if (clientError || !client) throw new Error('Não foi possível carregar os modelos disponíveis.');
      if (client.email?.toLowerCase() === 'fpaschoali@gmail.com') return names.filter(name => /^claude(?:-|\/)/i.test(name));
    }
    if (forcedProvider === 'GhostCLI' && clientId && names.includes('claude-opus-5-5')) {
      const { data: client, error: clientError } = await db.from('clients').select('email').eq('id', clientId).maybeSingle();
      if (clientError || !client) throw new Error('Não foi possível carregar os modelos disponíveis.');
      // Dotted alias resolves through models.internal_id to the GhostCLI Opus 5.5 id.
      if (client.email?.toLowerCase() === 'fpaschoali@gmail.com') return [...names, 'claude-opus-5.5'];
    }
    return names;
  }
  // The catalog table is admin-only. This narrow RPC returns approved public IDs,
  // never private provider configuration or pricing.
  const { data, error } = await db.rpc('client_public_model_names');
  if (error) throw new Error('Não foi possível carregar os modelos disponíveis.');
  return data ?? [];
}