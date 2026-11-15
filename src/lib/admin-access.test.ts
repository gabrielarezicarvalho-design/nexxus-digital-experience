import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { assertAdminAccess, hasAdminAccess } from './admin-access';

type RoleClient = Parameters<typeof hasAdminAccess>[0];
const client = (data: unknown, error: unknown = null) => ({ rpc: async () => ({ data, error }) }) as unknown as RoleClient;

describe('admin authorization', () => {
  it('rejects callers without a logged-in identity without checking a role', async () => {
    const db = { rpc: () => assert.fail('anonymous role lookup') } as unknown as RoleClient;
    await assert.rejects(assertAdminAccess(db, ''), /Acesso negado/);
  });
  it('rejects a logged-in customer without the administrator role', async () => {
    await assert.rejects(assertAdminAccess(client(false), 'customer'), /Acesso negado/);
  });
  it('permits only an explicit server-verified administrator role for the caller', async () => {
    const db = { rpc: async (name: string, args: unknown) => {
      assert.equal(name, 'has_role');
      assert.deepEqual(args, { _user_id: 'administrator', _role: 'admin' });
      return { data: true, error: null };
    } } as unknown as RoleClient;
    await assertAdminAccess(db, 'administrator');
  });
  it('fails closed when role verification fails even with truthy data', async () => {
    await assert.rejects(assertAdminAccess(client(true, { message: 'unavailable' }), 'administrator'), /Acesso negado/);
    assert.equal(await hasAdminAccess(client('true'), 'administrator'), false);
  });
  it('checks the role again on every action and denies access after revocation', async () => {
    let allowed = true;
    let checks = 0;
    const db = { rpc: async () => { checks++; return { data: allowed, error: null }; } } as unknown as RoleClient;
    await assertAdminAccess(db, 'administrator');
    allowed = false;
    await assert.rejects(assertAdminAccess(db, 'administrator'), /Acesso negado/);
    assert.equal(checks, 2);
  });
});