import { assertAdminAccess } from './admin-access';

type EntryClient = Parameters<typeof assertAdminAccess>[0];

export async function recordAdminEntrance(db: EntryClient, userId: string, entryId: string) {
  await assertAdminAccess(db, userId);
  const { error } = await db.rpc('record_admin_entrance', { _entry_id: entryId });
  if (error) throw new Error('Não foi possível registrar o acesso ao Admin.');
  return { ok: true };
}