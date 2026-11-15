import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { assertAdminAccess, hasAdminAccess } from './admin-access';
import { recordAdminEntrance } from './admin-entry';
import { z } from 'zod';

export const recordAdminAccess = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ entryId: z.string().uuid() }).parse(input))
  .handler(({ context, data }) => recordAdminEntrance(context.supabase, context.userId, data.entryId));

export const listAdminEntrances = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ page: z.number().int().min(0).max(100000) }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdminAccess(context.supabase, context.userId);
    const { data: rows, count, error } = await context.supabase.from('admin_access_events')
      .select('id,actor_id,actor_email,actor_name,entered_at', { count: 'exact' })
      .order('entered_at', { ascending: false }).order('id', { ascending: false })
      .range(data.page * 50, data.page * 50 + 49);
    if (error) throw new Error('Não foi possível carregar os acessos.');
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const getAdminAccess = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminAccess(context.supabase, context.userId);
    const bearer = getRequest().headers.get('authorization');
    if (!bearer?.startsWith('Bearer ')) throw new Error('Acesso negado');
    const { data, error } = await context.supabase.auth.getUser(bearer.slice(7));
    if (error || !data.user || data.user.id !== context.userId) throw new Error('Acesso negado');
    return { user: { id: data.user.id, email: data.user.email ?? '', user_metadata: data.user.user_metadata } };
  });

export const getOwnAdminVisibility = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => hasAdminAccess(context.supabase, context.userId));