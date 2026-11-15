import { expect, test } from 'bun:test';
import { MONTHLY_PLAN_MODELS, filterPlanModels, planAllowsModel } from './plan-models';
import { pickKeyModel } from './model-resolve';

const catalog = ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5', 'deepseek-v4.1-flash', 'gpt-6-astra'];

test('Pro mensal tem acesso ao DeepSeek', () => {
  expect(filterPlanModels(MONTHLY_PLAN_MODELS.cc_monthly_pro, catalog)).toEqual(['claude-haiku-5-5', 'claude-sonnet-5-5', 'deepseek-v4.1-flash']);
});

test('DeepSeek não entra em Max, Teams (*) nem em chaves sem plano', () => {
  expect(planAllowsModel(MONTHLY_PLAN_MODELS.cc_monthly_max, 'deepseek-v4.1-flash')).toBe(false);
  expect(planAllowsModel(MONTHLY_PLAN_MODELS.cc_monthly_teams, 'deepseek-v4.1-flash')).toBe(false);
  expect(planAllowsModel(null, 'deepseek-v4.1-flash')).toBe(false);
  expect(planAllowsModel(null, 'claude-opus-5-5')).toBe(true);
});

test('Pro pedindo um Claude fora do plano nunca cai no DeepSeek', () => {
  const names = filterPlanModels(MONTHLY_PLAN_MODELS.cc_monthly_pro, catalog);
  expect(pickKeyModel('claude-opus-5-5', names)?.model === 'deepseek-v4.1-flash').toBe(false);
  expect(pickKeyModel('gpt-6-astra', names)?.model === 'deepseek-v4.1-flash').toBe(false);
});
