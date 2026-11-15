import { test, expect, mock } from "bun:test";

// Ordem escolhida pelo dono: RadoxAI principal, Anthropic Revenda segunda.
const accounts = [
  { name: "RadoxAI", base_url: "https://radox.test/v1", api_secret_name: "TEST_RADOX_KEY", default_model: "claude-opus-4.8" },
  { name: "Anthropic Revenda", base_url: "https://revenda.test/v1", api_secret_name: "TEST_REVENDA_KEY", default_model: "claude" },
];
let internalModel = "claude";

mock.module("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        maybeSingle: async () => ({ data: table === "models" ? { provider: "Anthropic Revenda", internal_id: internalModel } : null }),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: table === "provider_accounts" ? accounts : [] }).then(resolve),
      };
      return query;
    },
    rpc: async () => ({ error: null }),
  },
}));

const keys = ["TEST_RADOX_KEY", "TEST_REVENDA_KEY"];

async function run(failRadox: boolean, requested = "claude", responseModel?: string) {
  const { fetchUpstream } = await import("./upstream.server");
  const original = globalThis.fetch;
  for (const name of keys) process.env[name] = "test-only";
  const sent: { url: string; model: string }[] = [];
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const model = String(JSON.parse(String(init?.body)).model);
    sent.push({ url, model });
    if (failRadox && url.includes("radox")) return Response.json({ error: "serviço em atualização" }, { status: 503 });
    return Response.json({ model: responseModel ?? model, choices: [{ message: { content: "oi" } }] });
  }) as typeof fetch;
  try {
    const result = await fetchUpstream({ model: requested, messages: [{ role: "user", content: "oi" }] });
    return { result, sent };
  } finally {
    globalThis.fetch = original;
    for (const name of keys) delete process.env[name];
  }
}

test("o pedido genérico vai primeiro à RadoxAI, com o modelo Claude dela", async () => {
  const { result, sent } = await run(false);
  expect(result.provider).toBe("RadoxAI");
  expect(result.upstreamModel).toBe("claude-opus-4.8");
  expect(sent).toEqual([{ url: "https://radox.test/v1/chat/completions", model: "claude-opus-4.8" }]);
});

test("se a RadoxAI cair, a Anthropic Revenda recebe o nome genérico", async () => {
  const { result, sent } = await run(true);
  expect(result.provider).toBe("Anthropic Revenda");
  expect(result.upstreamModel).toBe("claude");
  expect(sent).toEqual([
    { url: "https://radox.test/v1/chat/completions", model: "claude-opus-4.8" },
    { url: "https://revenda.test/v1/chat/completions", model: "claude" },
  ]);
});

test("fixar Anthropic Revenda atende claude imediatamente sem passar pela RadoxAI", async () => {
  accounts.reverse();
  try {
    const { result, sent } = await run(false);
    expect(result.provider).toBe("Anthropic Revenda");
    expect(result.upstreamModel).toBe("claude");
    expect(sent).toEqual([{ url: "https://revenda.test/v1/chat/completions", model: "claude" }]);
  } finally { accounts.reverse(); }
});

for (const combo of ["claude-opus-5", "claude-fable-5", "claude-sonnet-5"]) {
  test(`combo ${combo} vai somente à Anthropic Revenda com seu nome exato`, async () => {
    internalModel = combo;
    try {
      const { result, sent } = await run(false, `reserve-revenda-${combo}`);
      expect(result.provider).toBe("Anthropic Revenda");
      expect(result.upstreamModel).toBe(combo);
      expect(sent).toEqual([{ url: "https://revenda.test/v1/chat/completions", model: combo }]);
    } finally { internalModel = "claude"; }
  });
  test(`combo ${combo} aceita qualquer família respondendo no pool do 9Router`, async () => {
    internalModel = combo;
    try {
      for (const poolModel of ["ag/claude-opus-4-6-thinking", "ag/gpt-oss-120b-medium", "ag/gemini-3.8-flash-high", "nvidia/nemotron-3-ultra-550b-a55b"]) {
        const { result, sent } = await run(false, `reserve-revenda-${combo}`, poolModel);
        expect(result.res.status).toBe(200);
        expect(await result.res.json()).toEqual({ model: poolModel, choices: [{ message: { content: "oi" } }] });
        expect(sent).toEqual([{ url: "https://revenda.test/v1/chat/completions", model: combo }]);
      }
    } finally { internalModel = "claude"; }
  });
}
