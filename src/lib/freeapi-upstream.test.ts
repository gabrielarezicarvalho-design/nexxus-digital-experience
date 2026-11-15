import { expect, mock, test } from "bun:test";

const providers = [
  { name: "Reserva Teste", base_url: "https://reserva.test/v1", api_secret_name: "TEST_RESERVA", available_models: ["claude-sonnet-5"] },
  { name: "Anthropic Revenda", base_url: "https://anthropic.test/v1", api_secret_name: "TEST_ANTHROPIC", available_models: [] },
  { name: "FreeAPI Anthropic Revenda", base_url: "https://freeapi.anthropicrevenda.site/v1", api_secret_name: "UDC_FREEAPI_ANTHROPIC_REVENDA_API_KEY", available_models: [] },
];

mock.module("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        in: () => query,
        gt: () => query,
        upsert: async () => ({ error: null }),
        maybeSingle: async () => ({ data: table === "models" ? { provider: "Reserva Teste", internal_id: "claude-sonnet-5" } : null }),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: table === "provider_accounts" ? providers : [] }).then(resolve),
      };
      return query;
    },
    rpc: async () => ({ data: null, error: null }),
  },
}));

test("clientes comuns não caem na FreeAPI", async () => {
  const originalFetch = globalThis.fetch;
  const names = ["TEST_RESERVA", "TEST_ANTHROPIC", "UDC_FREEAPI_ANTHROPIC_REVENDA_API_KEY", "LOVABLE_API_KEY"];
  const saved = names.map(name => process.env[name]);
  names.forEach(name => { process.env[name] = "test-only"; });
  const calls: { url: string; model: string }[] = [];
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const model = String(JSON.parse(String(init?.body)).model);
    calls.push({ url, model });
    if (!url.includes("udc_freeapi_anthropic_revenda")) return new Response("indisponível", { status: 502 });
    expect(new Headers(init?.headers).get("X-Connection-Api-Key")).toBe("test-only");
    return Response.json({ model: "zai-org/glm-5.3-flash", choices: [{ message: { content: "Oi!" } }] });
  }) as typeof fetch;
  try {
    const { fetchUpstream } = await import("./upstream.server");
    await fetchUpstream({ model: "claude-sonnet-5", messages: [{ role: "user", content: "oi" }] }).catch(() => null);
    expect(calls.some(call => call.url.includes("udc_freeapi"))).toBe(false);
  } finally {
    globalThis.fetch = originalFetch;
    names.forEach((name, index) => {
      const value = saved[index];
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    });
  }
});
