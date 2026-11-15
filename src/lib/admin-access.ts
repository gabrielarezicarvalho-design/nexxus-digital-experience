import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type RoleClient = Pick<SupabaseClient<Database>, 'rpc'>;

// Never infer privileges from email, metadata, storage, or a cached UI flag.
export async function hasAdminAccess(db: RoleClient, userId: string): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await db.rpc('has_role', { _user_id: userId, _role: 'admin' });
  return !error && data === true;
}

export async function assertAdminAccess(db: RoleClient, userId: string): Promise<void> {
  if (!await hasAdminAccess(db, userId)) throw new Error('Acesso negado');
}