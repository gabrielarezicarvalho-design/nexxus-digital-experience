import { test, expect, mock } from "bun:test";
let active = true;
mock.module("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  from: () => {
    const query = { select: () => query, eq: () => query, order: () => query, maybeSingle: async () => ({ data: { provider: "SubtoAPI", internal_id: "fast" } }), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: active ? [{ name: "SubtoAPI", base_url: "https://api.subtoapi.app/v1", api_secret_name: "TEST_SUBTO_KEY" }] : [] }).then(resolve) };
    return query;
  }, rpc: async () => ({ error: null }),
} }));

test("each approved tier routes to SubtoAPI with its own identifier", async () => {
  const { fetchUpstream } = await import("./upstream.server");
  const original = globalThis.fetch;
  process.env['TEST_SUBTO_KEY'] = "test-only";
  const sent: string[] = [];
  globalThis.fetch = mock(async (url: unknown, init?: RequestInit) => {
    expect(String(url)).toBe("https://api.subtoapi.app/v1/messages");
    const model = JSON.parse(String(init?.body)).model;
    sent.push(model);
    return Response.json({ model, content: [{ type: "text", text: "Oi" }], usage: { input_tokens: 23, output_tokens: 21 } });
  }) as typeof fetch;
  try {
    for (const model of ["fast", "balanced", "best"]) {
      const result = await fetchUpstream({ model, messages: [{ role: "user", content: "oi" }] });
      expect(result.provider).toBe("SubtoAPI");
      expect((await result.res.json()).model).toBe(model);
    }
    expect(sent).toEqual(["fast", "balanced", "best"]);
    active = false;
    let failed = false;
    try { await fetchUpstream({ model: "fast" }); } catch { failed = true; }
    expect(failed).toBe(true);
    expect(sent.length).toBe(3);
  } finally { active = true; globalThis.fetch = original; delete process.env['TEST_SUBTO_KEY']; }
});