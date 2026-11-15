import { expect, mock, test } from "bun:test";

const key = { id: "active-client-key", client_id: "client", status: "active", reseller_blocked: false, token_limit: 50000000, tokens_used: 0, expires_at: null, rpm_limit: 60, model_family: "combo", forced_provider: null as string | null, clients: { status: "active", forced_provider: null as string | null } };
let rpmCount = 0;
let clientEmail = 'outro@example.com';
let updates = 0;
const logs: number[] = [];
const diagnostics: { status_code: number; error: string | null; provider?: string }[] = [];
let ghostOwner = false;
let ghostInternalId = 'claude-sonnet-5';
const providers = [
  { name: "RadoxAI", base_url: "https://primary.test/v1", api_secret_name: "TEST_PRIMARY" },
  { name: "CodeCraft API", base_url: "https://reserve.test/v1", api_secret_name: "TEST_RESERVE" },
  { name: "FreeModel", base_url: "https://freemodel.test/v1", api_secret_name: "TEST_RESERVE", available_models: ["gpt-4o-mini"] },
];
const lauren = { name: "Lauren API", base_url: "https://api.ialauren.com/v1", api_secret_name: "UDC_LAUREN_API_API_KEY", available_models: ["claude-opus-5-5"] };
mock.module("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const query = {
        select: () => query, eq: () => query, gte: () => query, order: () => query,
        update: () => { updates++; return query; },
        insert: async (row: { status_code: number; error: string | null }) => { logs.push(row.status_code); diagnostics.push(row); return { error: null }; },
        maybeSingle: async () => ({ data: table === "api_keys" ? key : table === "clients" ? { email: clientEmail } : table === "provider_accounts" ? { available_models: ['gpt-4o-mini', 'claude-sonnet-5'] } : table === "models" ? { id: "model", ...(ghostOwner ? { provider: 'GhostCLI', internal_id: ghostInternalId } : {}) } : null }),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: table === "provider_accounts" ? providers : table === "models" ? [{ name: "claude-sonnet-5" }] : [], count: rpmCount }).then(resolve),
      };
      return query;
    },
    rpc: async (name: string) => ({ data: name === 'client_public_model_names' ? ['claude-sonnet-5'] : name === 'check_key_rpm' ? [{ blocked: rpmCount >= 60, throttled: false, effective_rpm: 60, attempts: rpmCount, until_at: null }] : 1, error: null }),
  },
}));

test("Lauren stays pinned on failure and is excluded from Ghost global reserves", async () => {
  const originalFetch = globalThis.fetch;
  const names = ["UDC_LAUREN_API_API_KEY", "LOVABLE_API_KEY", "TEST_PRIMARY"];
  const saved = names.map(name => process.env[name]);
  names.forEach(name => { process.env[name] = "test-only"; });
  providers.unshift({ name: "GhostCLI", base_url: "https://ghost.test/v1", api_secret_name: "TEST_PRIMARY", available_models: ["claude-opus-5-5"] }, lauren);
  ghostOwner = true; ghostInternalId = "claude-opus-5-5";
  const calls: string[] = [];
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push(String(input));
    if (String(input).includes("udc_lauren_api")) {
      expect(new Headers(init?.headers).get("X-Connection-Api-Key")).toBe("test-only");
      expect(JSON.parse(String(init?.body)).model).toBe("claude-opus-5-5");
    }
    return new Response("unavailable", { status: 502 });
  }) as typeof fetch;
  try {
    const { fetchUpstream } = await import("./upstream.server");
    expect((await fetchUpstream({ model: "claude-opus-5-5" }, undefined, "Lauren API")).provider).toBe("Lauren API");
    expect(calls).toEqual(["https://connector-gateway.lovable.dev/udc_lauren_api/v1/chat/completions"]);
    calls.length = 0;
    await fetchUpstream({ model: "claude-opus-5-5" });
    expect(calls).toEqual(["https://ghost.test/v1/chat/completions", "https://primary.test/v1/chat/completions"]);
  } finally {
    providers.shift(); providers.shift(); ghostOwner = false; ghostInternalId = "claude-sonnet-5";
    globalThis.fetch = originalFetch;
    names.forEach((name, i) => { const value = saved[i]; if (value === undefined) delete process.env[name]; else process.env[name] = value; });
  }
});

test("Both API protocols fail over provider 429 without changing client status and still enforce client RPM", async () => {
  const originalFetch = globalThis.fetch;
  const names = ["CODECRAFT_API_KEY", "TEST_PRIMARY", "TEST_RESERVE"];
  const saved = names.map(name => process.env[name]);
  names.forEach(name => { process.env[name] = "test-only"; });
  const calls: string[] = [];
  globalThis.fetch = mock(async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return String(input).includes("primary.test")
      ? Response.json({ error: { code: "rate_limit_exceeded", message: "Token rate limit exceeded" } }, { status: 429 })
      : Response.json({ model: "claude-sonnet-5", choices: [{ message: { content: "ok" }, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } });
  }) as typeof fetch;
  try {
    const routes = [
      (await import("../routes/api/public/v1/chat/completions")).Route,
      (await import("../routes/api/public/v1/messages")).Route,
    ];
    for (const route of routes) {
      const handler = (route.options as any).server.handlers.POST;
      const request = () => new Request("http://localhost:8080/api/public/v1/messages", {
        method: "POST", headers: { authorization: "Bearer test-client-key", "content-type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 8, messages: [{ role: "user", content: "oi" }], stream: false }),
      });
      rpmCount = 0;
      calls.length = 0;
      const response: Response = await handler({ request: request() });
      expect(response.status).toBe(200);
      expect(JSON.stringify(await response.json()).includes('"ok"')).toBe(true);
      expect(calls).toEqual(["https://primary.test/v1/chat/completions", "https://reserve.test/v1/chat/completions"]);
      expect(updates).toBe(0);
      expect(key.status).toBe("active");
      rpmCount = 60;
      calls.length = 0;
      const limited: Response = await handler({ request: request() });
      expect(limited.status).toBe(429);
      expect(calls).toEqual([]);
      expect(updates).toBe(0);
    }
    expect(logs).toEqual([200, 429, 200, 429]);
  } finally {
    globalThis.fetch = originalFetch;
    names.forEach((name, index) => {
      const value = saved[index];
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    });
  }
});

test('Ghost 502 is recovered by an exact reserve in both protocols with one log and unchanged public model', async () => {
  const originalFetch = globalThis.fetch;
  const savedNames = ['CODECRAFT_API_KEY', 'TEST_PRIMARY', 'TEST_RESERVE'];
  const saved = savedNames.map((name) => process.env[name]);
  savedNames.forEach((name) => { process.env[name] = 'test-only'; });
  providers.unshift({ name: 'GhostCLI', base_url: 'https://ghost.test/v1', api_secret_name: 'TEST_PRIMARY', available_models: ['claude-sonnet-5'] });
  ghostOwner = true;
  rpmCount = 0;
  const calls: string[] = [];
  let streaming = false;
  globalThis.fetch = mock(async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return String(input).includes('ghost.test') ? new Response('error code: 502', { status: 502 })
      : streaming ? new Response('data: {"model": "internal-pool-model","choices":[{"delta":{"content":"oi"},"finish_reason":"stop"}],"usage":{"total_tokens":2}}\n\ndata: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } })
      : Response.json({ model: 'internal-pool-model', choices: [{ message: { content: 'oi' }, finish_reason: 'stop' }], usage: { total_tokens: 2 } });
  }) as typeof fetch;
  try {
    for (const route of [(await import('../routes/api/public/v1/messages')).Route, (await import('../routes/api/public/v1/chat/completions')).Route]) {
     for (const stream of [false, true]) {
      streaming = stream;
      calls.length = 0; diagnostics.length = 0;
      const response = await (route.options as any).server.handlers.POST({ request: new Request('http://localhost:8080/api/public/v1/messages', {
        method: 'POST', headers: { authorization: 'Bearer test-client-key', 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-5', messages: [{ role: 'user', content: 'oi' }], max_tokens: 8, stream }),
      }) });
      expect(response.status).toBe(200);
      if (stream) {
        const output = await response.text();
        expect(output.includes('internal-pool-model')).toBe(false);
        expect(output.includes('claude-sonnet-5')).toBe(true);
        expect(output.includes('oi')).toBe(true);
      } else expect((await response.json()).model).toBe('claude-sonnet-5');
      expect(calls).toEqual(['https://ghost.test/v1/chat/completions', 'https://primary.test/v1/chat/completions']);
      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0]?.status_code).toBe(200);
      const failure = JSON.parse(diagnostics[0]?.error || '{}').attempts[0];
      expect([failure.provider, failure.status, failure.cause]).toEqual(['GhostCLI', 502, 'error code: 502']);
     }
    }
    key.clients.forced_provider = 'GhostCLI';
    calls.length = 0;
    const { fetchUpstream } = await import('./upstream.server');
    expect((await fetchUpstream({ model: 'claude-sonnet-5' }, undefined, 'GhostCLI')).res.status).toBe(502);
    expect(calls).toEqual(['https://ghost.test/v1/chat/completions']);
    key.clients.forced_provider = null;
    calls.length = 0;
    const failures: import('./upstream-diagnostics').ProviderFailure[] = [];
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      if (String(input).includes('ghost.test')) throw new Error('connection reset');
      return new Response('reserve unavailable', { status: 502 });
    }) as typeof fetch;
    const exhausted = await fetchUpstream({ model: 'claude-sonnet-5' }, undefined, null, failures);
    expect(exhausted.res.status).toBe(502);
    expect(calls).toEqual(['https://ghost.test/v1/chat/completions', 'https://primary.test/v1/chat/completions', 'https://reserve.test/v1/chat/completions']);
    expect(failures.map((failure) => [failure.provider, failure.status, failure.cause])).toEqual([
      ['GhostCLI', 502, 'Error: connection reset'], ['RadoxAI', 502, 'reserve unavailable'], ['CodeCraft API', 502, 'reserve unavailable'],
    ]);
  } finally {
    providers.shift(); ghostOwner = false; key.clients.forced_provider = null;
    globalThis.fetch = originalFetch;
    savedNames.forEach((name, index) => { const value = saved[index]; if (value === undefined) delete process.env[name]; else process.env[name] = value; });
  }
});

test('Ghost Opus and Fable fail over to reserves under equivalent names, public name unchanged', async () => {
  const originalFetch = globalThis.fetch;
  const savedNames = ['TEST_PRIMARY', 'TEST_RESERVE'];
  const saved = savedNames.map((name) => process.env[name]);
  savedNames.forEach((name) => { process.env[name] = 'test-only'; });
  providers.unshift(
    { name: 'GhostCLI', base_url: 'https://ghost.test/v1', api_secret_name: 'TEST_PRIMARY', available_models: ['claude-opus-5-5', 'claude-fable-5.1'] },
    { name: 'Reserva Teste', base_url: 'https://revenda.test/v1', api_secret_name: 'TEST_RESERVE', available_models: ['claude-opus-5', 'claude-fable-5', 'claude-sonnet-5'] },
  );
  ghostOwner = true;
  const sent: { url: string; model: string }[] = [];
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    sent.push({ url: String(input), model: JSON.parse(String(init?.body)).model });
    return String(input).includes('ghost.test')
      ? new Response('error code: 502', { status: 502 })
      : Response.json({ model: JSON.parse(String(init?.body)).model, choices: [{ message: { content: 'oi' }, finish_reason: 'stop' }], usage: { total_tokens: 2 } });
  }) as typeof fetch;
  try {
    const { fetchUpstream } = await import('./upstream.server');
    for (const [publicModel, ghostModel, reserveModel] of [
      ['claude-opus-5-5', 'claude-opus-5-5', 'claude-opus-5'],
      ['claude-fable-5.1', 'claude-fable-5.1', 'claude-fable-5'],
    ] as const) {
      ghostInternalId = ghostModel;
      sent.length = 0;
      const failures: import('./upstream-diagnostics').ProviderFailure[] = [];
      const upstream = await fetchUpstream({ model: publicModel }, undefined, null, failures);
      expect(upstream.res.status).toBe(200);
      expect(upstream.provider).toBe('Reserva Teste');
      expect(sent).toEqual([
        { url: 'https://ghost.test/v1/chat/completions', model: ghostModel },
        { url: 'https://revenda.test/v1/chat/completions', model: reserveModel },
      ]);
      expect(failures.map((failure) => [failure.provider, failure.status])).toEqual([['GhostCLI', 502]]);
    }
  } finally {
    providers.shift(); providers.shift();
    ghostOwner = false; ghostInternalId = 'claude-sonnet-5';
    globalThis.fetch = originalFetch;
    savedNames.forEach((name, index) => { const value = saved[index]; if (value === undefined) delete process.env[name]; else process.env[name] = value; });
  }
});

test('Key-level Lauren assignment wins in both protocols and listing without changing account routing', async () => {
  const originalFetch = globalThis.fetch;
  const names = ['CODECRAFT_API_KEY', 'UDC_LAUREN_API_API_KEY', 'LOVABLE_API_KEY'];
  const saved = names.map(name => process.env[name]);
  names.forEach(name => { process.env[name] = 'test-only'; });
  providers.unshift(lauren);
  key.forced_provider = 'Lauren API';
  key.clients.forced_provider = 'FreeModel';
  rpmCount = 0;
  const sent: string[] = [];
  globalThis.fetch = mock(async (input: RequestInfo | URL) => {
    sent.push(String(input));
    return Response.json({ choices: [{ message: { content: 'ok' } }], usage: { total_tokens: 2 } });
  }) as typeof fetch;
  try {
    for (const route of [(await import('../routes/api/public/v1/messages')).Route, (await import('../routes/api/public/v1/chat/completions')).Route]) {
      const response = await (route.options as any).server.handlers.POST({ request: new Request('http://localhost:8080/api/public/v1/messages', {
        method: 'POST', headers: { authorization: 'Bearer test-client-key', 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-5', messages: [{ role: 'user', content: 'oi' }], max_tokens: 8 }),
      }) });
      expect(response.status).toBe(200);
    }
    expect(sent).toEqual(Array(2).fill('https://connector-gateway.lovable.dev/udc_lauren_api/v1/chat/completions'));
    const route = (await import('../routes/api/public/v1/models')).Route;
    const response = await (route.options as any).server.handlers.GET({ request: new Request('http://localhost:8080/api/public/v1/models', { headers: { authorization: 'Bearer test-client-key' } }) });
    expect(response.status).toBe(200);
    expect((await response.json()).data.map((m: { id: string }) => m.id)).toEqual(['gpt-4o-mini', 'claude-sonnet-5']);
    expect(key.clients.forced_provider).toBe('FreeModel');
  } finally {
    providers.shift(); key.forced_provider = null; key.clients.forced_provider = null;
    globalThis.fetch = originalFetch;
    names.forEach((name, i) => { const value = saved[i]; if (value === undefined) delete process.env[name]; else process.env[name] = value; });
  }
});

test('Both protocols accept FreeModel model IDs absent from the public catalog for dedicated clients', async () => {
  const originalFetch = globalThis.fetch;
  const saved = process.env['TEST_RESERVE'];
  const savedMaster = process.env['CODECRAFT_API_KEY'];
  process.env['TEST_RESERVE'] = 'test-only';
  process.env['CODECRAFT_API_KEY'] = 'test-only';
  key.clients.forced_provider = 'FreeModel';
  rpmCount = 0;
  const sent: string[] = [];
  globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body)).model);
    return Response.json({ choices: [{ message: { content: 'oi' } }], usage: { total_tokens: 2 } });
  }) as typeof fetch;
  try {
    for (const route of [(await import('../routes/api/public/v1/messages')).Route, (await import('../routes/api/public/v1/chat/completions')).Route]) {
      const handler = (route.options as any).server.handlers.POST;
      const response = await handler({ request: new Request('http://localhost:8080/api/public/v1/messages', {
        method: 'POST', headers: { authorization: 'Bearer test-client-key', 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 8, messages: [{ role: 'user', content: 'oi' }] }),
      }) });
      expect(response.status).toBe(200);
    }
    expect(sent).toEqual(['gpt-4o-mini', 'gpt-4o-mini']);
    clientEmail = 'fpaschoali@gmail.com';
    sent.length = 0;
    for (const route of [(await import('../routes/api/public/v1/messages')).Route, (await import('../routes/api/public/v1/chat/completions')).Route]) {
      const handler = (route.options as any).server.handlers.POST;
      for (const model of ['gpt-4o-mini', 'claude-sonnet-5']) {
        const response = await handler({ request: new Request('http://localhost:8080/api/public/v1/messages', {
          method: 'POST', headers: { authorization: 'Bearer test-client-key', 'content-type': 'application/json' },
          body: JSON.stringify({ model, max_tokens: 8, messages: [{ role: 'user', content: 'oi' }] }),
        }) });
        expect(response.status).toBe(200);
      }
    }
    // gpt-4o-mini fora da lista Claude do cliente vira o modelo Claude dele, nunca o GPT.
    expect(sent).toEqual(['claude-sonnet-5', 'claude-sonnet-5', 'claude-sonnet-5', 'claude-sonnet-5']);
  } finally {
    clientEmail = 'outro@example.com';
    key.clients.forced_provider = null;
    globalThis.fetch = originalFetch;
    if (saved === undefined) delete process.env['TEST_RESERVE']; else process.env['TEST_RESERVE'] = saved;
    if (savedMaster === undefined) delete process.env['CODECRAFT_API_KEY']; else process.env['CODECRAFT_API_KEY'] = savedMaster;
  }
});