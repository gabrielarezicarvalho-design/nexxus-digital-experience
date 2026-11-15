import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { CacheUsage, ClientCall, ClientUsage } from './client-usage';
import { clientPlanValue } from './client-plan-value';
import { clientQuota } from './client-quota';
import { adjustedPlanPrices } from './client-plan-pricing';
import type { ModelPriceCatalog } from './client-model-pricing';
import { keyBurstLimit } from './monthly-burst';

export type HourlyStatus = { limit: number; used: number; resetsAt: string | null; paused: boolean };

export const getClientDashboard = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase;
    const { data: identity, error: identityError } = await db.auth.getUser();
    if (identityError || !identity.user) throw new Error('Entre novamente para acessar sua conta.');
    const email = identity.user.email ?? '';
    const { data: clients, error: clientsError } = await db.from('clients').select('id,name,plan_id,forced_provider').or(`user_id.eq.${context.userId},email.ilike.${email.replace(/[\\%_,()]/g, '')}`);
    if (clientsError) throw new Error('Não foi possível carregar seus planos.');
    const ids = (clients ?? []).map(c => c.id);
    const emailEscaped = email.replace(/[\\%_,()]/g, '');
    const keysQuery = db.from('api_keys').select('id,api_key,client_id,plano,status,token_limit,daily_token_limit,tokens_used,requests_count,expires_at,created_at,last_used_at,model_family,allowed_models,forced_provider,burst_token_limit,burst_window_minutes,burst_exempt').order('created_at', { ascending: false });
    const filtered = ids.length ? keysQuery.or(`user_id.eq.${context.userId},client_id.in.(${ids.join(',')})`) : keysQuery.eq('user_id', context.userId);
    const paymentsQuery = db.from('payments').select('id,api_key_id,plan_code,amount_cents,status,created_at,approved_at,upgrade_key_id').order('created_at', { ascending: false }).limit(50);
    const ownPayments = ids.length ? paymentsQuery.or(`client_id.in.(${ids.join(',')}),email.ilike.${emailEscaped}`) : paymentsQuery.ilike('email', emailEscaped);
    const [keys, profile, usage, payments, calls] = await Promise.all([
      filtered,
      db.from('profiles').select('display_name,created_at').eq('id', context.userId).maybeSingle(),
      db.rpc('get_client_usage_summary'),
      ownPayments,
      db.rpc('get_client_recent_calls'),
    ]);
    if (keys.error || profile.error || usage.error || payments.error || calls.error) throw new Error('Não foi possível carregar seu consumo. Tente novamente.');
    const [catalog, priceRows] = await Promise.all([
      db.from('plans').select('id,code,name,price_cents,kind,token_limit,duration_days'),
      db.from('client_model_prices').select('model_id,input_usd_per_million,output_usd_per_million,usd_to_brl,estimated'),
    ]);
    if (catalog.error) throw new Error('Não foi possível carregar os valores dos planos.');
    if (priceRows.error || !priceRows.data?.length) throw new Error('Não foi possível carregar os preços dos modelos.');
    const basePrices: ModelPriceCatalog = Object.fromEntries(priceRows.data.map(p => [p.model_id, { input: Number(p.input_usd_per_million), output: Number(p.output_usd_per_million), inputBrl: Number(p.input_usd_per_million) * Number(p.usd_to_brl), outputBrl: Number(p.output_usd_per_million) * Number(p.usd_to_brl), estimated: p.estimated }]));
    const planName = (code: string) => catalog.data?.find(c => c.code === code)?.name ?? code;
    const withNames = (payments.data ?? []).map(p => ({ ...p, plan_name: p.plan_code === 'daily_reset' ? 'Reset de limite diário' : `${p.upgrade_key_id ? 'Recarga · ' : ''}${planName(p.plan_code)}` }));
    const planIds = (clients ?? []).flatMap(c => c.plan_id ? [c.plan_id] : []);
    const plans = planIds.length ? await db.from('plans').select('id,name,price_cents,kind,token_limit,duration_days').in('id', planIds) : { data: [], error: null };
    if (plans.error) throw new Error('Não foi possível carregar seu plano.');
    const { clientKeyModelNames } = await import('./client-models.server');
    const { keyProvider } = await import('./key-provider');
    const modelNamesByKey = Object.fromEntries(await Promise.all((keys.data ?? []).map(async key => {
      const ownedKey = { ...key, clients: clients?.find(client => client.id === key.client_id) };
      // Only owned keys may read private dedicated-provider configuration.
      const modelDb = keyProvider(ownedKey) ? (await import('@/integrations/supabase/client.server')).supabaseAdmin : db;
      return [key.id, await clientKeyModelNames(modelDb, ownedKey)] as const;
    })));
    // Display catalog is global; dedicated routing and generation lists remain separate.
    const { data: catalogModelNames, error: catalogModelsError } = await db.rpc('client_public_model_names');
    if (catalogModelsError) throw new Error('Não foi possível carregar o catálogo de modelos.');
    // Label shows only the plan of the client's latest key (keys come ordered by created_at desc).
    const latestKeyPlan = (keys.data ?? []).find(k => k.plano)?.plano ?? '';
    const latestApprovedPlan = withNames.find(p => p.status === 'approved')?.plan_name ?? '';
    const planLabel = latestKeyPlan
      || (plans.data?.length ? plans.data.map(p => p.name).join(' · ') : '')
      || latestApprovedPlan
      || 'Conta NEXA';
    const latestKey = keys.data?.[0];
    const planValueCents = clientPlanValue(latestKey, catalog.data ?? [], clients ?? [], payments.data ?? []);
    let latestKeyTodayUsed = 0;
    if (latestKey && latestKey.token_limit == null && (latestKey.daily_token_limit ?? 0) > 0) {
      // This service-only aggregate is restricted to the key already read through owner RLS.
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const today = await supabaseAdmin.rpc('key_tokens_today', { _key_id: latestKey.id });
      if (today.error) throw new Error('Não foi possível carregar seu consumo diário.');
      latestKeyTodayUsed = Number(today.data ?? 0);
    }
    const keyPricing = await Promise.all((keys.data ?? []).map(async key => {
      const daily = key.token_limit == null && (key.daily_token_limit ?? 0) > 0;
      const aggregate = await db.rpc('get_client_key_pricing_usage', { _key_id: key.id, _daily: daily });
      if (aggregate.error) throw new Error('Não foi possível carregar os preços do seu plano.');
      const ownUsage = aggregate.data as unknown as Pick<ClientUsage, 'by_model' | 'daily' | 'daily_by_model'> & { calls: ClientCall[]; cache?: CacheUsage };
      const used = daily ? ownUsage.by_model.reduce((s, row) => s + row.tokens, 0) : key.tokens_used;
      const quota = clientQuota(key, used);
      const value = clientPlanValue(key, catalog.data ?? [], clients ?? [], payments.data ?? []);
      const { familyAllows, asFamily } = await import('./model-family');
      const allowed = (catalogModelNames ?? []).filter(id => familyAllows(asFamily(key.model_family), id));
      return [key.id, { prices: adjustedPlanPrices(basePrices, value, quota, ownUsage.by_model, allowed), usage: ownUsage, planCents: value, quota }] as const;
    }));
    // Hourly ceiling status, only for keys already read through owner RLS.
    const hourlyKeys = (keys.data ?? []).filter(k => keyBurstLimit(k));
    const hourlyByKey: Record<string, HourlyStatus> = {};
    if (hourlyKeys.length) {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      await Promise.all(hourlyKeys.map(async k => {
        const r = await supabaseAdmin.rpc('key_hourly_burst_status', { _key_id: k.id });
        const row = Array.isArray(r.data) ? r.data[0] : r.data;
        if (!r.error && row) hourlyByKey[k.id] = { limit: Number(row.burst_limit), used: Number(row.used), resetsAt: row.resets_at ?? null, paused: !!row.paused };
      }));
    }
    const publicKeys = (keys.data ?? []).map(({ forced_provider: _privateProvider, ...key }) => key);
    return { keys: publicKeys, latestKeyTodayUsed, profile: profile.data, plans: plans.data ?? [], planValueCents, planLabel, clientName: clients?.[0]?.name ?? '', usage: usage.data as unknown as ClientUsage, calls: (calls.data ?? []) as unknown as ClientCall[], email, createdAt: identity.user.created_at, payments: withNames, modelNamesByKey, catalogModelNames: catalogModelNames ?? [], basePrices, pricingByKey: Object.fromEntries(keyPricing), hourlyByKey };
  });