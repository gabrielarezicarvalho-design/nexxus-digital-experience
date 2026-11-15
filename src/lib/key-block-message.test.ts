import { expect, test } from "bun:test";
import { resellerPaymentBlockMessage } from "./key-block-message";

test("chaves bloqueadas por repasse recebem aviso de regularização", () => {
  expect(resellerPaymentBlockMessage({ status: "blocked", reseller_blocked: true }) !== null).toBe(true);
});

test("bloqueios manuais ou por IP não recebem aviso de pagamento", () => {
  expect(resellerPaymentBlockMessage({ status: "blocked", reseller_blocked: false })).toBe(null);
  expect(resellerPaymentBlockMessage({ status: "blocked" })).toBe(null);
});

test("chaves ativas, expiradas e esgotadas preservam os avisos existentes", () => {
  for (const status of ["active", "expired", "exhausted"]) {
    expect(resellerPaymentBlockMessage({ status, reseller_blocked: true })).toBe(null);
  }
});