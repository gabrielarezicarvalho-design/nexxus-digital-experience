import { test } from "node:test";
import assert from "node:assert/strict";
import { isConfiguredPromotionOpen, promotionSchema } from "./promotion-rules";

const offer = { enabled: true, starts_at: "2026-10-21T22:00:00.000Z", ends_at: "2026-10-22T22:00:00.000Z", name: "Oferta", title: "25 milhões", headline: "Oferta de tokens", description: "Sem prazo", badge: "PROMOÇÃO", button_label: "COMPRAR", token_limit: 25000000, price_cents: 990, rpm_limit: 60 };
test("administrador pode desligar e religar a oferta", () => {
  const now = Date.parse("2026-10-21T23:00:00Z");
  assert.equal(isConfiguredPromotionOpen(offer, now), true);
  assert.equal(isConfiguredPromotionOpen({ ...offer, enabled: false }, now), false);
  assert.equal(isConfiguredPromotionOpen({ ...offer, enabled: true }, now), true);
});
test("personalização preserva preço e quantidade escolhidos", () => {
  const result = promotionSchema.parse({ ...offer, price_cents: 1590, token_limit: 30000000 });
  assert.equal(result.price_cents, 1590);
  assert.equal(result.token_limit, 30000000);
  assert.equal(promotionSchema.safeParse({ ...offer, price_cents: 0 }).success, false);
  assert.equal(promotionSchema.safeParse({ ...offer, token_limit: -1 }).success, false);
});
test("prazo fixo vale para compra e não reinicia", () => {
  assert.equal(isConfiguredPromotionOpen(offer, Date.parse(offer.starts_at) - 1), false);
  assert.equal(isConfiguredPromotionOpen(offer, Date.parse(offer.starts_at)), true);
  assert.equal(isConfiguredPromotionOpen(offer, Date.parse(offer.ends_at)), false);
  assert.equal(promotionSchema.safeParse({ ...offer, ends_at: offer.starts_at }).success, false);
});