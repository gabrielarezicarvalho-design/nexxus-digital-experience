import { test } from "node:test";
import assert from "node:assert/strict";
import { TOKEN_PROMOTION, promotionSecondsRemaining, isTokenPromotionOpen } from "./token-promotion";

test("promoção oferece exatamente 25 milhões de tokens", () => {
  assert.equal(TOKEN_PROMOTION.tokenLimit, 25_000_000);
});
test("promoção custa R$ 9,90", () => {
  assert.equal(TOKEN_PROMOTION.priceCents, 990);
});
test("contador dura 24 horas e 15 minutos e termina sem reiniciar", () => {
  assert.equal(TOKEN_PROMOTION.countdownSeconds, 87300);
  const start = 1000;
  const deadline = start + TOKEN_PROMOTION.countdownSeconds * 1000;
  assert.equal(promotionSecondsRemaining(deadline, start), 87300);
  assert.equal(promotionSecondsRemaining(deadline, start + 60_000), 87240);
  assert.equal(promotionSecondsRemaining(deadline, deadline + 1000), 0);
});
test("compra só fica disponível durante as 24h15 da promoção", () => {
  const start = Date.parse(TOKEN_PROMOTION.startsAt);
  const end = Date.parse(TOKEN_PROMOTION.endsAt);
  assert.equal(end - start, 87_300_000);
  assert.equal(isTokenPromotionOpen(start - 1), false);
  assert.equal(isTokenPromotionOpen(start), true);
  assert.equal(isTokenPromotionOpen(end - 1), true);
  assert.equal(isTokenPromotionOpen(end), false);
});