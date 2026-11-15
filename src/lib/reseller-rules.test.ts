import { test } from "node:test";
import assert from "node:assert/strict";
import { canGenerate, payToGenerateCents, resellerBalance, resellerEstimates, shouldBlock, ESTIMATED_SALE_CENTS } from "./reseller-rules";

test("faturamento estimado conta cada chave como vendida a 59,90", () => {
  assert.equal(ESTIMATED_SALE_CENTS, 5990);
  const uma = resellerEstimates([{ reseller_cost_cents: 2990 }]);
  assert.equal(uma.revenue, 5990);
  assert.equal(uma.profit, 3000); // 59,90 - 29,90 = 30,00 por venda
  const duas = resellerEstimates([{ reseller_cost_cents: 2990 }, { reseller_cost_cents: 2990 }]);
  assert.equal(duas.revenue, 11980);
  assert.equal(duas.profit, 6000); // duas vendas = 60,00 de lucro
});

test("saldo pendente = chaves geradas menos repasses pagos", () => {
  assert.deepEqual(resellerBalance([2990, 2990], [2990]), { generated: 5980, paid: 2990, pending: 2990, credit: 0 });
});
test("bloqueia ao atingir o limite", () => {
  assert.equal(shouldBlock(10000, 10000), true);
  assert.equal(shouldBlock(9999, 10000), false);
});
test("pré-pago: só gera chave com saldo pago cobrindo o custo", () => {
  assert.equal(canGenerate(resellerBalance([], [2990]), 2990), true);
  assert.equal(canGenerate(resellerBalance([], [2989]), 2990), false);
  assert.equal(canGenerate(resellerBalance([], []), 2990), false);
});
test("dívida antiga continua cobrada antes de gerar", () => {
  const bal = resellerBalance([5000], [0]);
  assert.equal(canGenerate(bal, 2990), false);
  assert.equal(payToGenerateCents(bal, 2990), 7990);
  assert.equal(payToGenerateCents(resellerBalance([], [1000]), 2990), 1990);
});
