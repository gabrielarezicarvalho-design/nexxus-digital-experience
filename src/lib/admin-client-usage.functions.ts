import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { assertAdminAccess } from './admin-access';
import type { ClientUsage } from './admin-client-usage';

export const getAdminClientUsage = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ clientId: z.string().uuid(), keyId: z.string().uuid().nullable().default(null) }).parse(input))
  .handler(async ({ data, context }): Promise<ClientUsage> => {
    await assertAdminAccess(context.supabase, context.userId);
    const { data: result, error } = await context.supabase.rpc('admin_client_usage_details', { _client_id: data.clientId, ...(data.keyId ? { _key_id: data.keyId } : {}) });
    if (error || !result) throw new Error('Não foi possível carregar o consumo do cliente.');
    return result as unknown as ClientUsage;
  });