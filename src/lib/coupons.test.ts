import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { couponDiscountCents, couponProblem, normalizeCouponCode } from "./coupons";

const base = { code: "X", percent_off: null, amount_off_cents: null, active: true, expires_at: null, max_uses: null };

describe("cupons", () => {
  it("desconto percentual", () => assert.equal(couponDiscountCents({ percent_off: 10, amount_off_cents: null }, 16490), 1649));
  it("desconto fixo", () => assert.equal(couponDiscountCents({ percent_off: null, amount_off_cents: 2000 }, 8990), 2000));
  it("nunca deixa o PIX abaixo de R$ 1,00", () => assert.equal(couponDiscountCents({ percent_off: null, amount_off_cents: 99999 }, 8990), 8890));
  it("cupom expirado é recusado", () => assert.notEqual(couponProblem({ ...base, percent_off: 5, expires_at: "2020-01-01T00:00:00Z" }, 0), null));
  it("limite de usos atingido é recusado", () => assert.notEqual(couponProblem({ ...base, percent_off: 5, max_uses: 3 }, 3), null));
  it("cupom desativado é recusado", () => assert.notEqual(couponProblem({ ...base, percent_off: 5, active: false }, 0), null));
  it("normaliza o código", () => assert.equal(normalizeCouponCode(" nexa 10 "), "NEXA10"));
});
