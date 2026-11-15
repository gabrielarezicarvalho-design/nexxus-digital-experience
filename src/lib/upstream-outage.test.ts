import { test } from "node:test";
import assert from "node:assert/strict";
import { isOutage, isMinuteRateLimit } from "./upstream.server";

test("manutenção 503 aciona a Clean", () => assert.equal(isOutage(503), true));
test("timeout 524 aciona a Clean", () => assert.equal(isOutage(524), true));
test("modelo sumido 404 aciona a Clean", () => assert.equal(isOutage(404), true));
test("400 não é classificado como queda, embora o roteador também tente a reserva", () => assert.equal(isOutage(400), false));
test("limite por minuto 429 não aciona a Clean", () => assert.equal(isOutage(429), false));

test("429 de tokens por minuto permite trocar de fornecedor", () => {
  assert.equal(isMinuteRateLimit(429, '{"error":{"code":"rate_limit_exceeded","message":"Token rate limit exceeded. Please slow down or upgrade your plan."}}'), true);
});
test("429 de pedidos por minuto permite trocar de fornecedor", () => {
  assert.equal(isMinuteRateLimit(429, 'Requests per minute limit exceeded'), true);
});
test("429 de autenticação não permite trocar de fornecedor", () => {
  assert.equal(isMinuteRateLimit(429, 'Too many failed authentication attempts. Slow down.'), false);
});
test("429 de saldo não permite trocar de fornecedor", () => {
  assert.equal(isMinuteRateLimit(429, 'Insufficient balance'), false);
});
test("erros 400 e 401 não viram limites por minuto", () => {
  assert.equal(isMinuteRateLimit(400, 'Token rate limit exceeded'), false);
  assert.equal(isMinuteRateLimit(401, 'Token rate limit exceeded'), false);
});
