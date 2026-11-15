import { test, expect, mock, beforeEach, afterEach } from "bun:test";

const originalSetTimeout = globalThis.setTimeout;
let delays: number[] = [];
beforeEach(() => {
  delays = [];
  globalThis.setTimeout = ((handler: TimerHandler, delay?: number, ...args: unknown[]) => {
    delays.push(delay ?? 0);
    return originalSetTimeout(handler, 0, ...args);
  }) as typeof setTimeout;
});
afterEach(() => { globalThis.setTimeout = originalSetTimeout; });

const accounts = [
  { name: "RadoxAI", base_url: "https://radox.test/v1", api_secret_name: "TEST_RADOX_KEY" },
  { name: "CodeCraft API", base_url: "https://codecraft.test/v1", api_secret_name: "TEST_CODECRAFT_KEY" },
  { name: "Clean APIs", base_url: "https://clean.test/v1", api_secret_name: "TEST_CLEAN_KEY" },
];
let cleanUsage: { key_index: number; rotation_disabled: boolean }[] = [];

mock.module("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        maybeSingle: async () => ({ data: null }),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: table === "provider_accounts" ? accounts : table === "provider_key_usage" ? cleanUsage : [] }).then(resolve),
      };
      return query;
    },
    rpc: async () => ({ error: null }),
  },
}));

test("RadoxAI is primary: a request starts there and succeeds without touching reserves", async () => {
  const { fetchUpstream } = await import("./upstream.server");
  const originalFetch = globalThis.fetch;
  process.env['TEST_CODECRAFT_KEY'] = "test-only";
  process.env['TEST_RADOX_KEY'] = "test-only";
  process.env['TEST_CLEAN_KEY'] = "test-only";
  const calls: string[] = [];
  globalThis.fetch = mock(async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return Response.json({ model: "claude-sonnet-5", choices: [{ message: { content: "ok" } }] });
  }) as typeof fetch;
  try {
    expect((await fetchUpstream({ model: "claude-sonnet-5" })).res.status).toBe(200);
    expect(calls).toEqual(["https://radox.test/v1/chat/completions"]);
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of ['TEST_CODECRAFT_KEY', 'TEST_RADOX_KEY', 'TEST_CLEAN_KEY']) delete process.env[name];
  }
});

test("When RadoxAI is down, CodeCraft serves and the next request returns to RadoxAI", async () => {
  const { fetchUpstream } = await import("./upstream.server");
  const originalFetch = globalThis.fetch;
  process.env['TEST_RADOX_KEY'] = "test-only";
  process.env['TEST_CODECRAFT_KEY'] = "test-only";
  process.env['TEST_CLEAN_KEY'] = "test-only";
  const calls: string[] = [];
  let codecraftCalls = 0;
  globalThis.fetch = mock(async (input: RequestInfo | URL) => {
    calls.push(String(input));
    if (String(input).includes("radox.test")) {
      codecraftCalls++;
      return codecraftCalls === 1
        ? Response.json({ error: { message: "maintenance" } }, { status: 503 })
        : Response.json({ model: "claude-sonnet-5", choices: [{ message: { content: "ok" } }] });
    }
    return Response.json({ model: "claude-sonnet-5", choices: [{ message: { content: "ok" } }] });
  }) as typeof fetch;
  try {
    expect((await fetchUpstream({ model: "claude-sonnet-5" })).res.status).toBe(200);
    expect((await fetchUpstream({ model: "claude-sonnet-5" })).res.status).toBe(200);
    expect(calls).toEqual([
      "https://radox.test/v1/chat/completions",
      "https://codecraft.test/v1/chat/completions",
      "https://radox.test/v1/chat/completions",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of ['TEST_RADOX_KEY', 'TEST_CODECRAFT_KEY', 'TEST_CLEAN_KEY']) delete process.env[name];
  }
});

test("When RadoxAI and CodeCraft are both down, Clean serves as last reserve", async () => {
  const { fetchUpstream } = await import("./upstream.server");
  const originalFetch = globalThis.fetch;
  process.env['TEST_RADOX_KEY'] = "test-only";
  process.env['TEST_CODECRAFT_KEY'] = "test-only";
  process.env['TEST_CLEAN_KEY'] = "test-only";
  const calls: string[] = [];
  globalThis.fetch = mock(async (input: RequestInfo | URL) => {
    calls.push(String(input));
    if (String(input).includes("clean.test")) {
      return Response.json({ model: "claude-sonnet-5", choices: [{ message: { content: "ok" } }] });
    }
    return Response.json({ error: { message: "maintenance" } }, { status: 503 });
  }) as typeof fetch;
  try {
    expect((await fetchUpstream({ model: "claude-sonnet-5" })).res.status).toBe(200);
    expect(calls).toEqual([
      "https://radox.test/v1/chat/completions",
      "https://codecraft.test/v1/chat/completions",
      "https://clean.test/v1/chat/completions",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of ['TEST_RADOX_KEY', 'TEST_CODECRAFT_KEY', 'TEST_CLEAN_KEY']) delete process.env[name];
  }
});

test("A reserve's success never promotes it to primary", async () => {
  const { fetchUpstream } = await import("./upstream.server");
  const originalFetch = globalThis.fetch;
  process.env['TEST_RADOX_KEY'] = "test-only";
  process.env['TEST_CODECRAFT_KEY'] = "test-only";
  process.env['TEST_CLEAN_KEY'] = "test-only";
  const calls: string[] = [];
  let codecraftCalls = 0;
  globalThis.fetch = mock(async (input: RequestInfo | URL) => {
    calls.push(String(input));
    if (String(input).includes("radox.test")) {
      codecraftCalls++;
      return codecraftCalls === 1
        ? Response.json({ error: { message: "maintenance" } }, { status: 503 })
        : Response.json({ model: "claude-sonnet-5", choices: [{ message: { content: "ok" } }] });
    }
    return Response.json({ model: "claude-sonnet-5", choices: [{ message: { content: "ok" } }] });
  }) as typeof fetch;
  try {
    expect((await fetchUpstream({ model: "claude-sonnet-5" })).res.status).toBe(200);
    expect((await fetchUpstream({ model: "claude-sonnet-5" })).res.status).toBe(200);
    expect(calls[2]).toBe("https://radox.test/v1/chat/completions");
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of ['TEST_RADOX_KEY', 'TEST_CODECRAFT_KEY', 'TEST_CLEAN_KEY']) delete process.env[name];
  }
});

test("Clean waits three seconds and retries the same request once before returning success", async () => {
  const { fetchUpstream } = await import("./upstream.server");
  const originalFetch = globalThis.fetch;
  process.env['TEST_RADOX_KEY'] = "test-only";
  process.env['TEST_CODECRAFT_KEY'] = "test-only";
  process.env['TEST_CLEAN_KEY'] = "test-only";
  const calls: { url: string; body: unknown }[] = [];
  let cleanCalls = 0;
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), body: JSON.parse(String(init?.body)) });
    if (String(input).includes("radox.test") || String(input).includes("codecraft.test")) {
      return Response.json({ error: { message: "maintenance" } }, { status: 503 });
    }
    cleanCalls++;
    if (cleanCalls === 1) return Response.json({ error: { message: "Token rate limit exceeded. Please slow down or upgrade your plan." } }, { status: 429 });
    return Response.json({ model: "claude-sonnet-5", choices: [{ message: { content: "ok" } }] });
  }) as typeof fetch;
  try {
    const body = { model: "claude-sonnet-5", messages: [{ role: "user", content: "oi" }] };
    expect((await fetchUpstream(body)).res.status).toBe(200);
    expect(calls.map(c => c.url)).toEqual([
      "https://radox.test/v1/chat/completions",
      "https://codecraft.test/v1/chat/completions",
      "https://clean.test/v1/chat/completions",
      "https://clean.test/v1/chat/completions",
    ]);
    expect(delays).toEqual([3000]);
    expect(calls.every(c => JSON.stringify(c.body) === JSON.stringify(body))).toBe(true);
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of ['TEST_RADOX_KEY', 'TEST_CODECRAFT_KEY', 'TEST_CLEAN_KEY']) delete process.env[name];
  }
});

test("A minute-rate 429 on RadoxAI fails over to CodeCraft once", async () => {
  const { fetchUpstream } = await import("./upstream.server");
  const originalFetch = globalThis.fetch;
  process.env['TEST_CLEAN_KEY'] = "test-only";
  process.env['TEST_CODECRAFT_KEY'] = "test-only";
  process.env['TEST_RADOX_KEY'] = "test-only";
  const calls: string[] = [];
  globalThis.fetch = mock(async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return String(input).includes("radox.test")
      ? Response.json({ error: { code: "rate_limit_exceeded", message: "Rate limit exceeded. Please slow down." } }, { status: 429 })
      : Response.json({ choices: [{ message: { content: "ok" } }] });
  }) as typeof fetch;
  try {
    expect((await fetchUpstream({ model: "claude-sonnet-5" })).res.status).toBe(200);
    expect(calls).toEqual([
      "https://radox.test/v1/chat/completions",
      "https://codecraft.test/v1/chat/completions",
    ]);
    expect(delays).toEqual([]);
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of ['TEST_CLEAN_KEY', 'TEST_CODECRAFT_KEY', 'TEST_RADOX_KEY']) delete process.env[name];
  }
});

test("Every upstream HTTP error tries the next provider without changing the request", async () => {
  const { fetchUpstream } = await import("./upstream.server");
  const originalFetch = globalThis.fetch;
  for (const name of ['TEST_CLEAN_KEY', 'TEST_CODECRAFT_KEY', 'TEST_RADOX_KEY']) process.env[name] = "test-only";
  const body = { model: "claude-sonnet-5", messages: [{ role: "user", content: "oi" }] };
  const calls: { url: string; body: unknown }[] = [];
  let status = 400;
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), body: JSON.parse(String(init?.body)) });
    return String(input).includes("radox.test")
      ? Response.json({ error: { message: "provider rejected the request" } }, { status })
      : Response.json({ model: "claude-sonnet-5", choices: [{ message: { content: "ok" } }] });
  }) as typeof fetch;
  try {
    for (status of [400, 401, 403, 404, 408, 409, 422, 429, 500, 502, 503, 524]) {
      calls.length = 0;
      const result = await fetchUpstream(body);
      expect(result.res.status).toBe(200);
      expect(result.provider).toBe("CodeCraft API");
      expect(calls.map(call => call.url)).toEqual([
        "https://radox.test/v1/chat/completions",
        "https://codecraft.test/v1/chat/completions",
      ]);
      expect(calls.every(call => JSON.stringify(call.body) === JSON.stringify(body))).toBe(true);
    }
    expect(delays).toEqual([]);
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of ['TEST_CLEAN_KEY', 'TEST_CODECRAFT_KEY', 'TEST_RADOX_KEY']) delete process.env[name];
  }
});

test("Clean never retries 429 authentication restrictions", async () => {
  const { fetchUpstream } = await import("./upstream.server");
  const originalFetch = globalThis.fetch;
  process.env['TEST_CLEAN_KEY'] = "test-only";
  let calls = 0;
  try {
    for (const message of ["Too many failed authentication attempts", "Invalid credentials"]) {
      globalThis.fetch = mock(async () => {
        calls++;
        return Response.json({ error: { message } }, { status: 429 });
      }) as typeof fetch;
      expect((await fetchUpstream({ model: "claude-sonnet-5" })).res.status).toBe(429);
    }
    expect(calls).toBe(2);
    expect(delays).toEqual([]);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env['TEST_CLEAN_KEY'];
  }
});

test("Cancelling during Clean backoff prevents the retry and reserve requests", async () => {
  const { fetchUpstream } = await import("./upstream.server");
  const originalFetch = globalThis.fetch;
  process.env['TEST_CLEAN_KEY'] = "test-only";
  const controller = new AbortController();
  let calls = 0;
  globalThis.fetch = mock(async () => {
    calls++;
    originalSetTimeout(() => controller.abort(new Error("client cancelled")), 0);
    return new Response("Token rate limit exceeded", { status: 429 });
  }) as typeof fetch;
  try {
    let failure: unknown;
    try { await fetchUpstream({ model: "claude-sonnet-5" }, controller.signal); }
    catch (error) { failure = error; }
    expect(failure instanceof Error ? failure.message : null).toBe("client cancelled");
    expect(calls).toBe(1);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env['TEST_CLEAN_KEY'];
  }
});

test("Clean skips persistently excluded keys before sending any request", async () => {
  const { fetchUpstream } = await import("./upstream.server");
  const originalFetch = globalThis.fetch;
  process.env['TEST_CODECRAFT_KEY'] = "test-only";
  process.env['TEST_RADOX_KEY'] = "test-only";
  process.env['TEST_CLEAN_KEY'] = "excluded-test-only";
  process.env['TEST_CLEAN_KEY_1'] = "available-test-only";
  cleanUsage = [{ key_index: 0, rotation_disabled: true }];
  let cleanCalls = 0;
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!String(input).includes("clean.test")) return new Response("maintenance", { status: 503 });
    cleanCalls++;
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer available-test-only");
    return Response.json({ choices: [{ message: { content: "ok" } }] });
  }) as typeof fetch;
  try {
    expect((await fetchUpstream({ model: "claude-sonnet-5" })).res.status).toBe(200);
    expect(cleanCalls).toBe(1);
  } finally {
    globalThis.fetch = originalFetch;
    cleanUsage = [];
    for (const name of ['TEST_CODECRAFT_KEY', 'TEST_RADOX_KEY', 'TEST_CLEAN_KEY', 'TEST_CLEAN_KEY_1']) delete process.env[name];
  }
});

for (const status of [401, 402]) {
  test(`Clean removes a ${status} rejection immediately and never retries it on the next request`, async () => {
    const { fetchUpstream } = await import("./upstream.server");
    const originalFetch = globalThis.fetch;
    const rejectedIndex = status === 401 ? 2 : 3;
    process.env['TEST_CODECRAFT_KEY'] = "test-only";
    process.env['TEST_RADOX_KEY'] = "test-only";
    process.env[`TEST_CLEAN_KEY_${rejectedIndex}`] = "reject-test-only";
    process.env['TEST_CLEAN_KEY_9'] = "available-test-only";
    let rejectedCalls = 0;
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!String(input).includes("clean.test")) return new Response("maintenance", { status: 503 });
      if (new Headers(init?.headers).get("Authorization") === "Bearer reject-test-only") {
        rejectedCalls++;
        return new Response(status === 401 ? "invalid credentials" : "insufficient balance", { status });
      }
      return Response.json({ choices: [{ message: { content: "ok" } }] });
    }) as typeof fetch;
    try {
      // Exhaust the rotation positions so both keys have been considered.
      for (let i = 0; i < 3; i++) expect((await fetchUpstream({ model: "claude-sonnet-5" })).res.status).toBe(200);
      expect(rejectedCalls).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
      for (const name of ['TEST_CODECRAFT_KEY', 'TEST_RADOX_KEY', `TEST_CLEAN_KEY_${rejectedIndex}`, 'TEST_CLEAN_KEY_9']) delete process.env[name];
    }
  });
}

test("The reported token-rate 429 traverses RadoxAI and CodeCraft to Clean without changing the request", async () => {
  const { fetchUpstream } = await import("./upstream.server");
  const originalFetch = globalThis.fetch;
  for (const name of ['TEST_CODECRAFT_KEY', 'TEST_RADOX_KEY', 'TEST_CLEAN_KEY']) process.env[name] = "test-only";
  const calls: { url: string; body: unknown }[] = [];
  const body = { model: "claude-sonnet-5", messages: [{ role: "user", content: "oi" }], stream: true };
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), body: JSON.parse(String(init?.body)) });
    return String(input).includes("clean.test")
      ? new Response('data: {"choices":[]}\n\n', { headers: { "Content-Type": "text/event-stream" } })
      : Response.json({ error: { code: "rate_limit_exceeded", message: "Token rate limit exceeded. Please slow down or upgrade your plan." } }, { status: 429 });
  }) as typeof fetch;
  try {
    const result = await fetchUpstream(body);
    expect(result.res.status).toBe(200);
    expect(await result.res.text()).toBe('data: {"choices":[]}\n\n');
    expect(calls.map(call => call.url)).toEqual(accounts.map(account => `${account.base_url}/chat/completions`));
    expect(calls.every(call => JSON.stringify(call.body) === JSON.stringify(body))).toBe(true);
    expect(delays).toEqual([]);
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of ['TEST_CODECRAFT_KEY', 'TEST_RADOX_KEY', 'TEST_CLEAN_KEY']) delete process.env[name];
  }
});

test("Unstructured provider 429 also fails over, with bounded retries when all providers are limited", async () => {
  const { fetchUpstream } = await import("./upstream.server");
  const originalFetch = globalThis.fetch;
  for (const name of ['TEST_CODECRAFT_KEY', 'TEST_RADOX_KEY', 'TEST_CLEAN_KEY']) process.env[name] = "test-only";
  const calls: string[] = [];
  globalThis.fetch = mock(async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return new Response("", { status: 429 });
  }) as typeof fetch;
  try {
    expect((await fetchUpstream({ model: "claude-sonnet-5" })).res.status).toBe(429);
    expect(calls).toEqual([
      "https://radox.test/v1/chat/completions",
      "https://codecraft.test/v1/chat/completions",
      "https://clean.test/v1/chat/completions",
      "https://clean.test/v1/chat/completions",
    ]);
    expect(delays).toEqual([3000]);
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of ['TEST_CODECRAFT_KEY', 'TEST_RADOX_KEY', 'TEST_CLEAN_KEY']) delete process.env[name];
  }
});

test("Only temporary 429 responses qualify for Clean's delayed retry", async () => {
  const { isMinuteRateLimit } = await import("./upstream.server");
  for (const reason of ["Too many failed authentication attempts", "API key inválida", "insufficient balance", "crédito esgotado", "cota excedida", "account suspended"]) {
    expect(isMinuteRateLimit(429, reason)).toBe(false);
  }
  expect(isMinuteRateLimit(429, "")).toBe(true);
  expect(isMinuteRateLimit(429, "Request throttled")).toBe(true);
  expect(isMinuteRateLimit(403, "Token rate limit exceeded")).toBe(false);
});
