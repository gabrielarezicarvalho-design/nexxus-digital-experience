import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { canUpgradeTokens, isUpgradePackage } from './token-upgrade';
import { asFamily, familyPriceCents } from './model-family';
import { assertAdminAccess } from './admin-access';

export const getTokenUpgradePackages = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from('plans').select('code,name,token_limit,daily_token_limit,duration_days,price_cents').eq('active', true).eq('show_on_site', true).order('price_cents');
    if (error) throw new Error('Não foi possível carregar os pacotes.');
    return (data ?? []).filter(isUpgradePackage);
  });

export const createTokenUpgradePix = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ keyId: z.string().uuid(), plan: z.string().regex(/^cc_[a-z0-9_]+$/).max(40) }).parse(input))
  .handler(async ({ data, context }) => {
    const identity = await context.supabase.auth.getUser();
    const user = identity.data.user;
    if (identity.error || !user?.email) throw new Error('Entre novamente para recarregar.');
    const { data: key, error } = await context.supabase.from('api_keys').select('id,user_id,client_id,status,token_limit,daily_token_limit,expires_at,model_family').eq('id', data.keyId).maybeSingle();
    if (error || !key || !canUpgradeTokens(key)) throw new Error('Recarga disponível somente para chaves de pacotes válidas.');
    // Admin/reseller RLS may expose other keys; require explicit customer ownership too.
    const client = key.client_id ? await context.supabase.from('clients').select('user_id,email').eq('id', key.client_id).maybeSingle() : null;
    const owns = key.user_id === context.userId || client?.data?.user_id === context.userId || client?.data?.email.toLowerCase() === user.email.toLowerCase();
    if (!owns) throw new Error('Esta chave não pertence à sua conta.');
    const catalog = await context.supabase.from('plans').select('*').eq('code', data.plan).eq('active', true).eq('show_on_site', true).maybeSingle();
    if (catalog.error || !catalog.data || !isUpgradePackage(catalog.data)) throw new Error('Pacote indisponível para recarga.');
    const { createPix } = await import('./mercadopago.server');
    const profile = await context.supabase.from('profiles').select('display_name').eq('id', context.userId).maybeSingle();
    return createPix(data.plan, profile.data?.display_name || 'Cliente NEXA', user.email, new URL(getRequest().url).origin, asFamily(key.model_family), { keyId: key.id, userId: context.userId, clientId: key.client_id, tokens: Number(catalog.data.token_limit), price: familyPriceCents(asFamily(key.model_family), catalog.data.price_cents) });
  });

export const checkTokenUpgradePix = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const payment = await supabaseAdmin.from('payments').select('id').eq('id', data.id).eq('upgrade_user_id', context.userId).maybeSingle();
    if (payment.error || !payment.data) throw new Error('Recarga não encontrada.');
    const { checkByRowId } = await import('./mercadopago.server');
    return { status: await checkByRowId(data.id) };
  });

export const adminAddKeyTokens = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ keyId: z.string().uuid(), tokens: z.number().int().positive().max(1_000_000_000_000), requestId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdminAccess(context.supabase, context.userId);
    const result = await context.supabase.rpc('admin_add_key_tokens', { _key_id: data.keyId, _tokens: data.tokens, _request_id: data.requestId });
    if (result.error) throw new Error(result.error.message);
    return { tokenLimit: Number(result.data) };
  });