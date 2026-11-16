import { expect, test } from 'bun:test';
import { clientKeyModelNames, clientModelNames } from './client-models.server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { MONTHLY_PLAN_MODELS, MONTHLY_PLAN_FAMILY } from './plan-models';

function mockDb(email = 'fpaschoali@gmail.com', availableModels = ['claude-opus-4.8', 'claude-sonnet-5', 'gpt-4o-mini'], catalog = ['cloud-opus-5.1', 'gpt-6-astra'], providerCatalog: string[] = []) {
  const calls: string[] = [];
  const db = { async rpc(name: string) { calls.push(`rpc:${name}`); return { data: catalog, error: null }; }, from(table: string) {
    calls.push(table);
    const query = {
      select() { return query; },
      eq(column: string, value: unknown) { calls.push(`${column}:${value}`); return query; },
      async maybeSingle() { return { data: table === 'clients' ? { email } : { available_models: availableModels }, error: null }; },
      then(resolve: (value: unknown) => unknown) { return Promise.resolve({ data: table === 'models' ? providerCatalog.map(name => ({ name })) : [{ name: 'cloud-opus-5.1' }], error: null }).then(resolve); },
    };
    return query;
  } } as unknown as SupabaseClient<Database>;
  return { db, calls };
}
test('cliente dedicado à FreeModel recebe os modelos próprios, não o catálogo global', async () => {
  const { db, calls } = mockDb();
  expect(await clientModelNames(db, 'FreeModel', null, 'combo')).toEqual(['claude-opus-4.8', 'claude-sonnet-5', 'gpt-4o-mini']);
  expect(calls).toEqual(['provider_accounts', 'name:FreeModel', 'active:true', 'paused:false', 'models', 'provider:FreeModel', 'enabled:true', 'catalog_approved:true']);
});
test('demais clientes continuam recebendo somente o catálogo global habilitado', async () => {
  const { db, calls } = mockDb();
  expect(await clientModelNames(db)).toEqual(['cloud-opus-5.1']);
  expect(calls).toEqual(['rpc:client_public_model_names']);
});
test('catálogo do painel inclui Claude e GPT sem ler a tabela administrativa', async () => {
  const { db, calls } = mockDb();
  expect(await clientModelNames(db, null, null, 'combo')).toEqual(['cloud-opus-5.1', 'gpt-6-astra']);
  expect(calls).toEqual(['rpc:client_public_model_names']);
});
test('fpaschoali@gmail.com pode listar e solicitar somente Claude da FreeModel', async () => {
  const { db } = mockDb();
  const names = await clientModelNames(db, 'FreeModel', 'felipe-id');
  expect(names).toEqual(['claude-opus-4.8', 'claude-sonnet-5']);
  expect(names.includes('gpt-4o-mini')).toBe(false);
});
test('restrição do Felipe não muda outros clientes dedicados à FreeModel', async () => {
  const { db } = mockDb('outro@example.com');
  expect(await clientModelNames(db, 'FreeModel', 'outro-id', 'combo')).toEqual(['claude-opus-4.8', 'claude-sonnet-5', 'gpt-4o-mini']);
});test('Felipe na GhostCLI também pode pedir claude-opus-5.5, que vai para o Opus 5.5 dela', async () => {
  const { db } = mockDb();
  const ghost = { ...db, from(t: string) { const q = (db as any).from(t); const ms = q.maybeSingle; q.maybeSingle = async () => t === 'clients' ? ms() : { data: { available_models: ['claude-opus-5-5', 'claude-fable-5.1'] }, error: null }; return q; } } as unknown as SupabaseClient<Database>;
  expect(await clientModelNames(ghost, 'GhostCLI', 'felipe-id')).toEqual(['claude-opus-5-5', 'claude-fable-5.1', 'claude-opus-5.5']);
  const { forcedHop } = await import('./upstream.server');
  expect(forcedHop({ name: 'GhostCLI', available_models: ['claude-opus-5-5'] } as any, 'claude-opus-5.5', 'claude-opus-5-5').upstreamModel).toBe('claude-opus-5-5');
});

test('chave GPT de cliente dedicado recebe só GPT; chave Claude só Claude', async () => {
  const { db } = mockDb('outro@exemplo.com');
  expect(await clientModelNames(db, 'FreeModel', 'outro-id', 'openai')).toEqual(['gpt-4o-mini']);
  expect(await clientModelNames(db, 'FreeModel', 'outro-id', 'claude')).toEqual(['claude-opus-4.8', 'claude-sonnet-5']);
});

test('Invision lista somente os três modelos públicos configurados, sem IDs internos', async () => {
  const { db } = mockDb('suporte@nexapro.site', [
    'openai/gpt-6-luna-invision', 'anthropic/claude-haiku-5.5',
    'deepseek/deepseek-v4-flash', 'anthropic/claude-opus-5', 'qwen/qwen3.8-max',
  ]);
  expect(await clientModelNames(db, 'Invision')).toEqual([
    'claude-opus-5-5', 'claude-sonnet-5', 'claude-fable-5.1',
  ]);
});

test('Invision não anuncia alias sem destino disponível nem permite família cruzada', async () => {
  const { db } = mockDb('suporte@nexapro.site', ['anthropic/claude-haiku-5.5']);
  expect(await clientModelNames(db, 'Invision')).toEqual(['claude-sonnet-5']);
  expect(await clientModelNames(db, 'Invision', null, 'openai')).toEqual([]);
});

const apiCatalog = ['claude-opus-5-5', 'claude-sonnet-5', 'claude-fable-5.1', 'gpt-6-astra', 'gpt-5.6-luna'];

test('lista API de chave Claude não inclui GPT; catálogo global continua completo', async () => {
  const { db } = mockDb('cliente@example.com', [], apiCatalog);
  expect(await clientKeyModelNames(db, { client_id: null, model_family: 'claude' })).toEqual(apiCatalog.slice(0, 3));
  expect((await db.rpc('client_public_model_names')).data).toEqual(apiCatalog);
});

test('lista API Pro inclui somente Opus 5.5 e Sonnet 5', async () => {
  const { db } = mockDb('cliente@example.com', [], apiCatalog);
  expect(await clientKeyModelNames(db, { client_id: null, model_family: 'claude', allowed_models: ['opus55', 'sonnet5'] })).toEqual(['claude-opus-5-5', 'claude-sonnet-5']);
});

test('lista API Enterprise inclui Astra mas não Luna', async () => {
  const { db } = mockDb('cliente@example.com', [], apiCatalog);
  expect(await clientKeyModelNames(db, { client_id: null, model_family: 'combo', allowed_models: ['opus55', 'sonnet5', 'fable51', 'astra'] })).toEqual(apiCatalog.slice(0, 4));
});

test('chaves irmãs mantêm listas independentes e prioridade do fornecedor da chave', async () => {
  const { db, calls } = mockDb('cliente@example.com', apiCatalog);
  const common = { client_id: 'cliente', clients: { forced_provider: 'FreeModel' } };
  expect(await clientKeyModelNames(db, { ...common, forced_provider: 'Lauren API', model_family: 'claude', allowed_models: ['opus55'] })).toEqual(['claude-opus-5-5']);
  expect(await clientKeyModelNames(db, { ...common, model_family: 'openai' })).toEqual(['gpt-6-astra', 'gpt-5.6-luna']);
  expect(calls.includes('name:Lauren API')).toBe(true);
  expect(calls.includes('name:FreeModel')).toBe(true);
});

test('restrição vazia não anuncia modelos na aba API', async () => {
  const { db } = mockDb('cliente@example.com', [], apiCatalog);
  expect(await clientKeyModelNames(db, { client_id: null, model_family: 'combo', allowed_models: [] })).toEqual([]);
});

test('Haiku 4.5 aprovado fica disponível no pacote Claude e no Max, mas não no Pro nem GPT', async () => {
  const { db } = mockDb('cliente@example.com', [], [...apiCatalog, 'claude-haiku-4-5']);
  expect((await clientModelNames(db, null, null, 'claude')).includes('claude-haiku-4-5')).toBe(true);
  expect((await clientKeyModelNames(db, { client_id: null, model_family: 'claude', allowed_models: ['claude'] })).includes('claude-haiku-4-5')).toBe(true);
  expect((await clientModelNames(db, null, null, 'claude', ['opus', 'sonnet'])).includes('claude-haiku-4-5')).toBe(false);
  expect((await clientModelNames(db, null, null, 'openai')).includes('claude-haiku-4-5')).toBe(false);
});
test('Fable 5.2 aprovado respeita os planos e a família da chave', async () => {
  const { db } = mockDb('cliente@example.com', [], [...apiCatalog, 'claude-fable-5-2']);
  for (const allowed_models of [null, ['claude'], ['claude', 'gpt', 'glm', 'gemini', 'deepseek']]) {
    expect((await clientKeyModelNames(db, { client_id: null, model_family: 'claude', allowed_models })).includes('claude-fable-5-2')).toBe(true);
  }
  expect((await clientKeyModelNames(db, { client_id: null, model_family: 'claude', allowed_models: ['opus', 'sonnet'] })).includes('claude-fable-5-2')).toBe(false);
  expect((await clientKeyModelNames(db, { client_id: null, model_family: 'openai' })).includes('claude-fable-5-2')).toBe(false);
});

const monthlyCatalog = ['claude-haiku-5-5', 'claude-sonnet-5-5', 'glm-5.3-flash', 'claude-opus-5-5', 'claude-fable-5-2', 'gpt-6-astra', 'gpt-5.6-luna', 'gemini-4-argon', 'glm-nexa-novidade'];
for (const [code, expected] of [
  ['cc_monthly_pro', ['claude-haiku-5-5', 'claude-sonnet-5-5']],
  ['cc_monthly_max', ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5', 'claude-fable-5-2']],
  ['cc_monthly_enterprise', ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5', 'claude-fable-5-2', 'gpt-6-astra', 'gpt-5.6-luna', 'gemini-4-argon']],
  ['cc_monthly_teams', monthlyCatalog],
] as const) {
  test(`${code}: API instructions list only the subscribed models`, async () => {
    const { db } = mockDb('cliente@example.com', [], monthlyCatalog);
    expect(await clientKeyModelNames(db, { client_id: null, model_family: MONTHLY_PLAN_FAMILY[code] ?? 'claude', allowed_models: [...MONTHLY_PLAN_MODELS[code]] })).toEqual([...expected]);
  });
}

test('chave fixa num fornecedor recebe todos os modelos dele, inclusive os nomes do catálogo ligados a ele', async () => {
  const { db } = mockDb('x@y.com', ['qwen-coder', 'qwen7b'], [], ['nexaclean-pro', 'qwen-coder']);
  expect(await clientModelNames(db, 'Free.ai', null, 'combo')).toEqual(['qwen-coder', 'qwen7b', 'nexaclean-pro']);
});
