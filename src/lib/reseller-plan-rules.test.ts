import { test } from "node:test";
import assert from "node:assert/strict";
import { canUseResellerPlan, RESELLER_PLAN_MAX_TOKENS, resellerPlanInput } from "./reseller-plan-rules";

test("revendedor só usa plano personalizado da própria revenda", () => {
  assert.equal(canUseResellerPlan({ reseller_id: "revenda-a", active: true }, "revenda-a"), true);
  assert.equal(canUseResellerPlan({ reseller_id: "revenda-a", active: true }, "revenda-b"), false);
});
test("plano personalizado desativado não gera novas chaves", () => {
  assert.equal(canUseResellerPlan({ reseller_id: "revenda-a", active: false }, "revenda-a"), false);
});
test("plano por tokens mantém quantidade e não tem validade", () => {
  const plan = resellerPlanInput.parse({ name: "Cliente", kind: "tokens", token_limit: 5_000_000, duration_days: null });
  assert.equal(plan.token_limit, 5_000_000);
  assert.equal(plan.duration_days, null);
  assert.equal(resellerPlanInput.safeParse({ ...plan, duration_days: 7 }).success, false);
});
test("revendedor não pode criar plano ilimitado por dias", () => {
  assert.equal(resellerPlanInput.safeParse({ name: "Cliente", kind: "days", token_limit: null, duration_days: 7 }).success, false);
});
test("planos de revenda não passam do maior pacote do site", () => {
  const base = { name: "Plano", kind: "tokens" as const, duration_days: null };
  assert.equal(resellerPlanInput.safeParse({ ...base, token_limit: RESELLER_PLAN_MAX_TOKENS }).success, true);
  assert.equal(resellerPlanInput.safeParse({ ...base, token_limit: RESELLER_PLAN_MAX_TOKENS + 1 }).success, false);
  assert.equal(resellerPlanInput.safeParse({ ...base, token_limit: 1_000_000_000_000 }).success, false);
});
