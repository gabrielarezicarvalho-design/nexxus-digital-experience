import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { recordAdminEntrance } from './admin-entry';

type Client = Parameters<typeof recordAdminEntrance>[0];
describe('admin entrance recording', () => {
  it('never records an entrance for a non-administrator', async () => {
    const db = { rpc: async (name: string) => {
      assert.equal(name, 'has_role');
      return { data: false, error: null };
    } } as unknown as Client;
    await assert.rejects(recordAdminEntrance(db, 'customer', 'entry'), /Acesso negado/);
  });
  it('records an administrator entrance with a deduplication ID and no client supplied identity or time', async () => {
    const calls: string[] = [];
    const db = { rpc: async (name: string, args: unknown) => {
      calls.push(name);
      if (name === 'has_role') {
        assert.deepEqual(args, { _user_id: 'administrator', _role: 'admin' });
        return { data: true, error: null };
      }
      assert.deepEqual(args, { _entry_id: 'entry-id' });
      return { data: null, error: null };
    } } as unknown as Client;
    assert.deepEqual(await recordAdminEntrance(db, 'administrator', 'entry-id'), { ok: true });
    assert.deepEqual(calls, ['has_role', 'record_admin_entrance']);
  });
  it('reports a recording failure instead of claiming success', async () => {
    const db = { rpc: async (name: string) => name === 'has_role'
      ? { data: true, error: null } : { data: null, error: { message: 'unavailable' } } } as unknown as Client;
    await assert.rejects(recordAdminEntrance(db, 'administrator', 'entry'), /Não foi possível registrar/);
  });
});