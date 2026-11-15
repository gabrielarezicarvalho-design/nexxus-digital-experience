import { expect, mock, test } from 'bun:test';
import { MONTHLY_PLAN_MODELS } from './plan-models';

mock.module('@/integrations/supabase/client.server', () => ({ supabaseAdmin: {
  from(table: string) {
    const q = {
      select: () => q, eq: () => q, gte: () => q,
      insert: async () => ({ error: null }),
      maybeSingle: async () => ({ data: table === 'api_keys' ? {
        id: 'pro-test', client_id: null, status: 'active', reseller_blocked: false,
        token_limit: 1000000, tokens_used: 0, rpm_limit: 50, expires_at: null,
        model_family: 'claude', allowed_models: [...MONTHLY_PLAN_MODELS.cc_monthly_pro],
        forced_provider: null, clients: null,
      } : null, error: null }),
      then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [], count: 0 }).then(resolve),
    };
    return q;
  },
  rpc: async (name: string) => ({ data: name === 'client_public_model_names'
    ? ['claude-haiku-5-5', 'claude-sonnet-5-5', 'glm-5.3-flash', 'claude-opus-5-5', 'gpt-6-astra'] : 0, error: null }),
} }));

test('Pro asking Opus or GPT never sends a model outside the Pro plan in either protocol', async () => {
  const routes = [(await import('../routes/api/public/v1/messages')).Route,
    (await import('../routes/api/public/v1/chat/completions')).Route];
  const original = globalThis.fetch;
  const sent: string[] = [];
  globalThis.fetch = mock(async (_i: RequestInfo | URL, init?: RequestInit) => { try { sent.push(JSON.parse(String(init?.body)).model); } catch { /* non-JSON */ } return Response.json({ choices: [{ message: { content: 'oi' } }], usage: { total_tokens: 2 } }); }) as typeof fetch;
  try {
    for (const route of routes) for (const model of ['claude-opus-5-5', 'gpt-6-astra']) {
      const handler = (route.options as unknown as { server: { handlers: { POST: (v: { request: Request }) => Promise<Response> } } }).server.handlers.POST;
      const res = await handler({ request: new Request('http://localhost:8080/api/public/v1/messages', {
        method: 'POST', headers: { authorization: 'Bearer test-only', 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 8, messages: [{ role: 'user', content: 'oi' }] }),
      }) });
      expect(res.status === 400).toBe(false);
    }
    expect(sent.length > 0).toBe(true);
    for (const model of sent) expect(['claude-haiku-5-5', 'claude-sonnet-5-5', 'glm-5.3-flash'].includes(model)).toBe(true);
  } finally { globalThis.fetch = original; }
});