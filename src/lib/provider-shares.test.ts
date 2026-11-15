import { test } from 'node:test';
import assert from 'node:assert/strict';
import { providerShares } from './provider-shares';

test('card de Fornecedores mostra todos os fornecedores com a porcentagem de cada um', () => {
  const shares = providerShares([
    { provider: 'CodeCraft API', requests: 18138 },
    { provider: 'RadoxAI', requests: 6046 },
  ]);
  assert.equal(shares.length, 2);
  assert.equal(shares[0]!.name, 'CodeCraft API');
  assert.equal(shares[0]!.requests, 18138);
  assert.equal(Math.round(shares[0]!.pct * 10) / 10, 75);
  assert.equal(Math.round(shares[1]!.pct * 10) / 10, 25);
  assert.equal(shares[1]!.name, 'RadoxAI');
  // Segmentos do anel cobrem o círculo inteiro, cada fornecedor com o seu pedaço.
  assert.equal(shares[0]!.start, 0);
  assert.equal(shares[1]!.start, shares[0]!.end);
  assert.equal(shares.at(-1)!.end, 100);
  assert.notEqual(shares[0]!.color, shares[1]!.color);
});

test('nenhum pedido no período: card fica vazio em vez de dividir por zero', () => {
  assert.deepEqual(providerShares([]), []);
  assert.deepEqual(providerShares([{ provider: 'CodeCraft API', requests: 0 }]), []);
});
