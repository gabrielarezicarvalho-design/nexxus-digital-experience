import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const registerPush = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ token: z.string().min(20).max(4096) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc('register_push_device', { p_token: data.token });
    if (error) throw new Error('Não foi possível cadastrar este celular.');
    return { id };
  });

export const removePush = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('push_devices').delete().eq('id', data.id).eq('user_id', context.userId);
    if (error) throw new Error('Não foi possível desativar os alertas.');
    return { ok: true };
  });