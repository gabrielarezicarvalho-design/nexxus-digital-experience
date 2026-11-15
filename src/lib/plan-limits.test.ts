import { test } from "node:test";
import assert from "node:assert/strict";
import { hasTokenLimit, requireTokenLimit } from "./plan-limits";

test("novas ofertas sem limite são rejeitadas", () => {
  assert.throws(() => requireTokenLimit({ token_limit: null, daily_token_limit: null }), /limite/);
});
test("Mensal 5x aceita 50 milhões por dia sem limite total", () => {
  assert.equal(hasTokenLimit({ token_limit: null, daily_token_limit: 50_000_000 }), true);
});
test("Mensal 20x aceita 150 milhões por dia sem limite total", () => {
  assert.equal(hasTokenLimit({ token_limit: null, daily_token_limit: 150_000_000 }), true);
});