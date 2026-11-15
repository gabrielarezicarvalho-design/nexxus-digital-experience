import { test, expect, mock } from "bun:test";
import { subtoapiRequest, subtoapiCompletion, fetchSubtoapi, isSubtoapiTier, subtoapiTier } from "./subtoapi.server";

test("only the three approved tiers are SubtoAPI models", () => {
  for (const tier of ["fast", "balanced", "best"]) expect(isSubtoapiTier(tier)).toBe(true);
  expect(isSubtoapiTier("claude-opus-4.8")).toBe(false);
  for (const tier of ["fast", "balanced", "best"]) expect(subtoapiTier(`claude-${tier}`)).toBe(tier);
});

test("request preserves the selected tier, output limit and tools", () => {
  const request = subtoapiRequest({ model: "balanced", max_tokens: 64, stream: true, messages: [{ role: "system", content: "Rules" }, { role: "user", content: "oi" }], tools: [{ function: { name: "read", parameters: { type: "object" } } }] });
  expect(request).toEqual({ model: "balanced", max_tokens: 64, stream: false, system: "Rules", messages: [{ role: "user", content: [{ type: "text", text: "oi" }] }], tools: [{ name: "read", description: undefined, input_schema: { type: "object" } }] });
});

test("completion retains public tier and counts cache tokens", () => {
  const result = subtoapiCompletion({ content: [{ type: "text", text: "Oi" }], usage: { input_tokens: 23, output_tokens: 78, cache_read_tokens: 10 } }, "best");
  expect(result.model).toBe("best");
  expect(result.choices[0].message.content).toBe("Oi");
  expect(result.usage).toEqual({ prompt_tokens: 33, completion_tokens: 78, total_tokens: 111 });
});

test("streaming clients get SSE built from a complete upstream response", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = mock(async (url: unknown, init?: RequestInit) => {
    expect(String(url)).toBe("https://api.subtoapi.app/v1/messages");
    expect(JSON.parse(String(init?.body)).model).toBe("fast");
    expect(JSON.parse(String(init?.body)).stream).toBe(false);
    return Response.json({ content: [{ type: "text", text: "Oi" }], usage: { input_tokens: 23, output_tokens: 78 } });
  }) as typeof fetch;
  try {
    const response = await fetchSubtoapi("https://api.subtoapi.app/v1", "test-only", { model: "fast", messages: [{ role: "user", content: "oi" }], stream: true });
    const text = await response.text();
    expect(text.includes('"content":"Oi"')).toBe(true);
    expect(text.includes('"total_tokens":101')).toBe(true);
    expect(text.includes('[DONE]')).toBe(true);
  } finally { globalThis.fetch = original; }
});

test("permission errors preserve status and do not retry", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = mock(async () => { calls++; return Response.json({ message: "Access denied" }, { status: 403 }); }) as typeof fetch;
  try {
    const response = await fetchSubtoapi("https://api.subtoapi.app/v1", "test-only", { model: "best", messages: [] });
    expect(response.status).toBe(403);
    expect((await response.json()).error.message).toBe("Access denied");
    expect(calls).toBe(1);
  } finally { globalThis.fetch = original; }
});