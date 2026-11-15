import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { canBuyDailyReset } from './daily-limit-reset';
import { asFamily } from './model-family';

export const createDailyResetPix = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ keyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const identity = await context.supabase.auth.getUser();
    const user = identity.data.user;
    if (identity.error || !user?.email) throw new Error('Entre novamente para resetar o limite.');
    const { data: key, error } = await context.supabase.from('api_keys').select('id,user_id,client_id,status,token_limit,daily_token_limit,expires_at,model_family,reseller_id').eq('id', data.keyId).maybeSingle();
    if (error || !key || key.reseller_id || !canBuyDailyReset(key)) throw new Error('O reset está disponível somente para chaves de planos mensais ativos.');
    // Admin RLS may expose other keys; require explicit customer ownership too.
    const client = key.client_id ? await context.supabase.from('clients').select('user_id,email').eq('id', key.client_id).maybeSingle() : null;
    const owns = key.user_id === context.userId || client?.data?.user_id === context.userId || client?.data?.email.toLowerCase() === user.email.toLowerCase();
    if (!owns) throw new Error('Esta chave não pertence à sua conta.');
    const profile = await context.supabase.from('profiles').select('display_name').eq('id', context.userId).maybeSingle();
    const { createDailyResetPix: create } = await import('./mercadopago.server');
    return create(key.id, key.client_id, profile.data?.display_name || 'Cliente NEXA', user.email, new URL(getRequest().url).origin, asFamily(key.model_family));
  });

export const checkDailyResetPix = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), keyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // Ownership: the caller must be able to read the key the payment resets.
    const key = await context.supabase.from('api_keys').select('id').eq('id', data.keyId).maybeSingle();
    if (key.error || !key.data) throw new Error('Pagamento não encontrado.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const payment = await supabaseAdmin.from('payments').select('id').eq('id', data.id).eq('reset_key_id', data.keyId).maybeSingle();
    if (payment.error || !payment.data) throw new Error('Pagamento não encontrado.');
    const { checkByRowId } = await import('./mercadopago.server');
    return { status: await checkByRowId(data.id) };
  });
