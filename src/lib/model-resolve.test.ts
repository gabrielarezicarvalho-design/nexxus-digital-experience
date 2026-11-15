import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveModel } from './model-resolve';

const ENABLED = ['claude-sonnet-5', 'claude-opus-5.5', 'claude-opus-4.8', 'claude-fable-5.1'];

test('pedidos com o nome exato recebem exatamente aquele modelo', () => {
  assert.equal(resolveModel('claude-opus-4.8', ENABLED), 'claude-opus-4.8');
  assert.equal(resolveModel('claude-fable-5.1', ENABLED), 'claude-fable-5.1');
  assert.equal(resolveModel('claude-sonnet-5', ENABLED), 'claude-sonnet-5');
});

test('nome da família escolhe o modelo mais novo dessa família', () => {
  assert.equal(resolveModel('claude-opus', ENABLED), 'claude-opus-4.8');
  assert.equal(resolveModel('claude-sonnet-4-5', ENABLED), 'claude-sonnet-5');
  assert.equal(resolveModel('claude-fable', ENABLED), 'claude-fable-5.1');
});

test('nome sem família cai no opus, nunca em ordem aleatória', () => {
  assert.equal(resolveModel('claude', ENABLED), 'claude-opus-4.8');
  assert.equal(resolveModel('gpt-4', ENABLED), 'claude-opus-4.8');
});

test('a ordem devolvida pelo banco não muda a escolha', () => {
  const reversed = [...ENABLED].reverse();
  assert.equal(resolveModel('claude', reversed), resolveModel('claude', ENABLED));
  assert.equal(resolveModel('opus', reversed), resolveModel('opus', ENABLED));
});

test('lista vazia não escolhe modelo', () => {
  assert.equal(resolveModel('claude-opus-4.8', []), undefined);
});

import { pickKeyModel } from './model-resolve';
import { filterPlanModels, MONTHLY_PLAN_MODELS } from './plan-models';

const CATALOG = ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5', 'claude-fable-5-1', 'claude-fable-5-2', 'glm-5.3-flash', 'gpt-6-luna', 'gpt-6-sol', 'gpt-6-astra'];

test('Max pedindo claude-sonnet-5 usa o Sonnet do plano em vez de dar erro', () => {
  const names = filterPlanModels(MONTHLY_PLAN_MODELS.cc_monthly_max, CATALOG);
  assert.deepEqual(pickKeyModel('claude-sonnet-5', names), { model: 'claude-sonnet-5-5', substituted: true });
});

test('Pro pedindo Opus nunca recebe modelo fora do plano Pro', () => {
  const names = filterPlanModels(MONTHLY_PLAN_MODELS.cc_monthly_pro, CATALOG);
  const picked = pickKeyModel('claude-opus-5-5', names);
  assert.ok(picked && names.includes(picked.model));
  assert.notEqual(picked?.model, 'claude-opus-5-5');
});

test('plano GPT pedindo Claude recebe um modelo GPT do plano', () => {
  const names = filterPlanModels(MONTHLY_PLAN_MODELS.cc_monthly_gpt_pro, CATALOG);
  assert.ok(['gpt-6-luna', 'gpt-6-sol'].includes(pickKeyModel('claude-sonnet-5', names)?.model ?? ''));
});

test('nome exato do plano é usado sem troca', () => {
  assert.deepEqual(pickKeyModel('x', CATALOG, 'claude-opus-5-5'), { model: 'claude-opus-5-5', substituted: false });
});
