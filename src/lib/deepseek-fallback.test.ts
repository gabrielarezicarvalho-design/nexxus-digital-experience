import { test } from "node:test";
import assert from "node:assert/strict";
import { fallbackOrder, isQuotaError } from "./deepseek-fallback";

test("do pro tenta depois o pro-max", () => {
  assert.deepEqual(fallbackOrder("deepseek-v4-pro-0813"), ["deepseek-v4-pro-0813", "deepseek-v4-pro-max", "deepseek-v4-flash-0731"]);
});
test("modelos que não são DeepSeek não trocam", () => {
  assert.deepEqual(fallbackOrder("claude-sonnet-5"), ["claude-sonnet-5"]);
});
test("reconhece falta de crédito", () => {
  assert.equal(isQuotaError(402, ""), true);
  assert.equal(isQuotaError(429, '{"error":{"code":"upstream_quota"}}'), true);
  assert.equal(isQuotaError(500, "internal error"), false);
  assert.equal(isQuotaError(200, "quota"), false);
});
