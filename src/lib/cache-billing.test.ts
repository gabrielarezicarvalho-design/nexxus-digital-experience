import { test as it, expect } from "bun:test";
import { billedUsage, anthropicUsage } from "./cache-billing";

it("cache lido conta 10% no consumo", () => {
  const b = billedUsage({ prompt_tokens: 8564, completion_tokens: 10, total_tokens: 8574, prompt_tokens_details: { cached_tokens: 7680, created_cache_tokens: 0 } });
  expect(b.cached_tokens).toBe(7680);
  expect(b.prompt_tokens).toBe(884 + 768);
  expect(b.total_tokens).toBe(884 + 768 + 10);
  expect(b.raw_total_tokens).toBe(8574);
});

it("gravação de cache e entrada normal continuam cheias", () => {
  const b = billedUsage({ prompt_tokens: 8564, completion_tokens: 10, total_tokens: 8574, prompt_tokens_details: { cached_tokens: 0, created_cache_tokens: 7680 } });
  expect(b.total_tokens).toBe(8574);
  expect(b.cache_discount_tokens).toBe(0);
});

it("sem informação de cache nada muda", () => {
  expect(billedUsage({ prompt_tokens: 100, completion_tokens: 50 }).total_tokens).toBe(150);
  expect(billedUsage(null).total_tokens).toBe(0);
});

it("cache maior que a entrada é limitado à entrada", () => {
  expect(billedUsage({ prompt_tokens: 100, completion_tokens: 0, prompt_tokens_details: { cached_tokens: 500 } }).total_tokens).toBe(10);
});

it("formato Anthropic separa cache da entrada", () => {
  expect(anthropicUsage({ prompt_tokens: 8564, completion_tokens: 10, prompt_tokens_details: { cached_tokens: 7680 } })).toEqual({ input_tokens: 884, cache_creation_input_tokens: 0, cache_read_input_tokens: 7680, output_tokens: 10 });
});
