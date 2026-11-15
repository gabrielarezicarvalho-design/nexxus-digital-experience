import { afterEach, describe, expect, mock, test } from 'bun:test';

const originalFetch = globalThis.fetch;
let rpcError: { message: string } | null = null;
let credited = false;
let balance = 30_000_000;
let calls: unknown[][] = [];
const payment = { id: '00000000-0000-4000-8000-000000000001', mp_payment_id: '123', upgrade_key_id: '00000000-0000-4000-8000-000000000002', upgrade_tokens: 100_000_000, amount_cents: 5990, email: 'test@example.invalid', plan_snapshot: { name: 'Recarga' } };
const rpc = mock(async (...args: unknown[]) => {
  calls.push(args);
  if (rpcError) return { data: null, error: rpcError };
  if (!credited) { credited = true; balance += payment.upgrade_tokens; }
  return { data: 'approved', error: null };
});
const from = mock((table: string) => {
  if (table !== 'payments') throw new Error(`Unexpected write/read: ${table}`);
  return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: payment }) }) }) };
});
mock.module('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from, rpc } }));
mock.module('./meta-capi.server', () => ({ sendMetaEvent: async () => {} }));
const { syncPayment } = await import('./mercadopago.server');

afterEach(() => { globalThis.fetch = originalFetch; rpcError = null; });
function upstream(amount = 59.9) {
  process.env['MERCADOPAGO_ACCESS_TOKEN'] = 'test-only';
  globalThis.fetch = mock(async () => Response.json({ id: 123, status: 'approved', transaction_amount: amount, currency_id: 'BRL', external_reference: payment.id })) as unknown as typeof fetch;
}
describe('PIX de tokens adicionais', () => {
  test('usa crédito atômico da mesma chave, nunca emissão de chave nova', async () => {
    upstream(); credited = false; balance = 30_000_000; calls = [];
    expect(await syncPayment('123')).toBe('approved');
    expect(calls[0]).toEqual(['fulfill_token_upgrade', { _payment_id: payment.id }]);
    expect(balance).toBe(130_000_000);
    expect(await syncPayment('123')).toBe('approved');
    expect(balance).toBe(130_000_000);
  });
  test('valor divergente não credita tokens', async () => {
    upstream(60); calls = [];
    expect(await syncPayment('123')).toBe('amount_mismatch');
    expect(calls.length).toBe(0);
  });
  test('falha no crédito não informa pagamento aprovado e permite nova tentativa', async () => {
    upstream(); rpcError = { message: 'test failure' }; credited = false; balance = 30_000_000;
    let failed = false;
    try { await syncPayment('123'); } catch (e) { failed = e instanceof Error && e.message.includes('Não foi possível creditar'); }
    expect(failed).toBe(true);
    expect(balance).toBe(30_000_000);
    rpcError = null;
    expect(await syncPayment('123')).toBe('approved');
    expect(balance).toBe(130_000_000);
  });
});