import { expect, mock, test } from "bun:test";

let logged: { status: number; provider: string | null; error: string | null }[] = [];
let invalidBody = true;

mock.module("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: async (name: string) => (name === "key_ip_count" ? { data: 1 } : { data: 0 }),
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        gte: () => query,
        maybeSingle: async () => ({
          data: table === "api_keys" ? {
            id: "test-key", client_id: "test-client", status: "active", reseller_blocked: false,
            token_limit: null, daily_token_limit: null, tokens_used: 0, expires_at: null,
            rpm_limit: 60, model_family: "combo", forced_provider: "Anthropic Revenda",
            allowed_models: ["claude-fable-5-2"], spam_guard: false,
            clients: { status: "active", forced_provider: null },
          } : null,
        }),
        insert: async (row: { status_code: number; provider?: string | null; error?: string | null }) => {
          logged.push({ status: row.status_code, provider: row.provider ?? null, error: row.error ?? null });
          return { error: null };
        },
      };
      return query;
    },
  },
}));

mock.module("@/lib/client-models.server", () => ({
  clientModelNames: async () => ["claude-fable-5-2"],
}));

mock.module("@/lib/upstream.server", () => ({
  maskUpstreamModel: (json: unknown) => json,
  fetchUpstream: async () => ({
    res: new Response(
      invalidBody ? '{"choices":[{"message":{"content":"ok"}}],"usage":{"total_tokens":5}}garbage'
        : '{"choices":[{"message":{"content":"ok"}}],"usage":{"total_tokens":5}}',
      { status: 200, headers: { "content-type": "application/json" } },
    ),
    upstreamModel: "claude-fable-5-2",
    provider: "Anthropic Revenda",
    onUsage: async () => {},
  }),
}));

const call = async () => {
  const route = (await import("../routes/api/public/v1/chat/completions")).Route;
  const handler = (route.options as any).server.handlers.POST;
  const response: Response = await handler({
    request: new Request("http://localhost:8080/api/public/v1/chat/completions", {
      method: "POST",
      headers: { authorization: "Bearer test-key", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-fable-5-2", messages: [{ role: "user", content: "oi" }] }),
    }),
  });
  return { status: response.status, json: await response.json().catch(() => null) };
};

test("corpo inválido do fornecedor vira 502 registrado com o fornecedor, sem derrubar a rota", async () => {
  const previous = process.env["CODECRAFT_API_KEY"];
  process.env["CODECRAFT_API_KEY"] = "test-only";
  try {
    invalidBody = true;
    logged = [];
    const result = await call();
    expect(result.status).toBe(502);
    expect(result.json?.error?.message).toBe("Resposta inválida do provedor");
    expect(logged.length).toBe(1);
    expect(logged[0]?.status).toBe(502);
    expect(logged[0]?.provider).toBe("Anthropic Revenda");
    expect(logged[0]?.error).toBe("Resposta inválida do provedor");
  } finally {
    if (previous === undefined) delete process.env["CODECRAFT_API_KEY"];
    else process.env["CODECRAFT_API_KEY"] = previous;
  }
});

test("corpo válido do fornecedor continua passando com o modelo pedido", async () => {
  const previous = process.env["CODECRAFT_API_KEY"];
  process.env["CODECRAFT_API_KEY"] = "test-only";
  try {
    invalidBody = false;
    logged = [];
    const result = await call();
    expect(result.status).toBe(200);
    expect(result.json?.model).toBe("claude-fable-5-2");
    expect(logged.length).toBe(1);
    expect(logged[0]?.status).toBe(200);
    expect(logged[0]?.provider).toBe("Anthropic Revenda");
  } finally {
    if (previous === undefined) delete process.env["CODECRAFT_API_KEY"];
    else process.env["CODECRAFT_API_KEY"] = previous;
  }
});
