import { expect, mock, test } from 'bun:test';

const accounts = [
  { name: 'Nexxus Pro', base_url: 'https://nexxus.test/v1', api_secret_name: 'TEST_HOURLY_NEXXUS', available_models: ['claude-sonnet-5'] },
  { name: 'Invision', base_url: 'https://reserve.test/v1', api_secret_name: 'TEST_HOURLY_RESERVE', available_models: ['claude-sonnet-5'] },
];
let cooldowns: { provider: string; model: string; until: string }[] = [];
mock.module('@/integrations/supabase/client.server', () => ({ supabaseAdmin: {
  from: (table: string) => {
    const query = {
      select: () => query, eq: () => query, order: () => query, in: () => query, gt: () => query,
      maybeSingle: async () => ({ data: table === 'models' ? { provider: 'Nexxus Pro', internal_id: 'claude-sonnet-5' } : null }),
      upsert: async (row: { provider: string; model: string; until: string }) => { cooldowns.push(row); return { error: null }; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: table === 'provider_accounts' ? accounts : table === 'provider_model_cooldowns' ? cooldowns.filter(row => Date.parse(row.until) > Date.now()) : [] }).then(resolve),
    };
    return query;
  }, rpc: async () => ({ error: null }),
} }));

test('real router flow skips Nexxus immediately, persists a provider-wide pause and restores after reset', async () => {
  const { fetchUpstream } = await import('./upstream.server');
  const original = globalThis.fetch;
  process.env['TEST_HOURLY_NEXXUS'] = 'fixture';
  process.env['TEST_HOURLY_NEXXUS_1'] = 'fixture-secondary';
  process.env['TEST_HOURLY_RESERVE'] = 'fixture';
  const calls: string[] = [];
  let limited = true;
  globalThis.fetch = mock(async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return limited && String(input).includes('nexxus.test')
      ? Response.json({ error: { message: 'Hourly input token quota exceeded' } }, { status: 429, headers: { 'Retry-After': '3600' } })
      : Response.json({ choices: [{ message: { content: '4' } }] });
  }) as typeof fetch;
  try {
    const failures: import('./upstream-diagnostics').ProviderFailure[] = [];
    const result = await fetchUpstream({ model: 'claude-sonnet-5', messages: [{ role: 'user', content: '2+2' }] }, undefined, undefined, failures);
    expect(result.provider).toBe('Invision');
    expect((await result.res.json()).choices[0].message.content).toBe('4');
    expect(calls).toEqual(['https://nexxus.test/v1/chat/completions', 'https://reserve.test/v1/chat/completions']);
    expect(cooldowns[0]?.model).toBe('*');
    expect(Date.parse(cooldowns[0]?.until ?? '') - Date.now() > 3_590_000).toBe(true);
    expect(failures[0]?.status).toBe(429);
    calls.length = 0;
    expect((await fetchUpstream({ model: 'claude-sonnet-5' })).provider).toBe('Invision');
    expect(calls).toEqual(['https://reserve.test/v1/chat/completions']);
    // A single dedicated client cannot escape to a provider not assigned to it.
    calls.length = 0;
    let blocked: unknown;
    try { await fetchUpstream({ model: 'claude-sonnet-5' }, undefined, 'Nexxus Pro'); } catch (error) { blocked = error; }
    expect(blocked instanceof Error && blocked.message.includes('limite horário')).toBe(true);
    expect(calls).toEqual([]);
    cooldowns = cooldowns.map(row => ({ ...row, until: new Date(Date.now() - 1).toISOString() }));
    limited = false;
    expect((await fetchUpstream({ model: 'claude-sonnet-5' })).provider).toBe('Nexxus Pro');
  } finally {
    globalThis.fetch = original;
    for (const name of ['TEST_HOURLY_NEXXUS', 'TEST_HOURLY_NEXXUS_1', 'TEST_HOURLY_RESERVE']) delete process.env[name];
  }
});