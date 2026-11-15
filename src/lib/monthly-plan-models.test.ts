import { expect, test } from 'bun:test';
import { filterPlanModels, planAllowsModel, MONTHLY_PLAN_MODELS, MONTHLY_PLAN_FAMILY } from './plan-models';
import { apiModelList } from './api-model-list';
import { asFamily, filterByFamily } from './model-family';
const catalog = ['claude-sonnet-5-5', 'glm-5.3-flash', 'claude-haiku-5-5', 'claude-opus-5-5', 'claude-fable-5-1', 'gpt-6-astra', 'gemini-4-argon', 'claude-fable-5-2', 'claude-sonnet-5', 'claude-fable-5-20', 'gpt-5.6-luna'];
test('Pro somente Sonnet 5.5 e Haiku 5.5, sem GLM (descontinuado)', () => {
  expect(filterPlanModels(MONTHLY_PLAN_MODELS.cc_monthly_pro, filterByFamily(asFamily(MONTHLY_PLAN_FAMILY['cc_monthly_pro']), catalog))).toEqual(['claude-sonnet-5-5', 'claude-haiku-5-5']);
  expect(planAllowsModel(MONTHLY_PLAN_MODELS.cc_monthly_pro, 'glm-5.3-flash')).toBe(false);
});
test('Max lista e autoriza todos os Claude, sem GPT, Gemini ou GLM', () => {
  const expected = catalog.filter(name => name.startsWith('claude-'));
  expect(filterPlanModels(MONTHLY_PLAN_MODELS.cc_monthly_max, catalog)).toEqual(expected);
  expect(apiModelList(expected, catalog, MONTHLY_PLAN_MODELS.cc_monthly_max)).toEqual(expected);
  expect(planAllowsModel(MONTHLY_PLAN_MODELS.cc_monthly_max, 'gpt-6-astra')).toBe(false);
});
test('Enterprise todos os Claude e GPT e Gemini 4 Argon, sem GLM', () => {
  const available = [...catalog, 'glm-nexa-novidade', 'deepseek-v4-flash', 'gemini-3-pro'];
  expect(filterPlanModels(MONTHLY_PLAN_MODELS.cc_monthly_enterprise, filterByFamily(asFamily(MONTHLY_PLAN_FAMILY['cc_monthly_enterprise']), available))).toEqual(catalog.filter(name => !name.startsWith('glm-')));
  expect(planAllowsModel(MONTHLY_PLAN_MODELS.cc_monthly_enterprise, 'glm-nexa-novidade')).toBe(false);
  expect(planAllowsModel(MONTHLY_PLAN_MODELS.cc_monthly_enterprise, 'glm-5.3-flash')).toBe(false);
});
test('Teams todos os modelos aprovados incluindo Fable 5.2 e novas famílias', () => {
  const available = [...catalog, 'glm-nexa-novidade', 'deepseek-v4-flash'];
  const names = filterPlanModels(MONTHLY_PLAN_MODELS.cc_monthly_teams, filterByFamily(asFamily(MONTHLY_PLAN_FAMILY['cc_monthly_teams']), available));
  expect(names).toEqual(available);
  expect(apiModelList(names, available, MONTHLY_PLAN_MODELS.cc_monthly_teams)).toEqual(available);
  expect(planAllowsModel(MONTHLY_PLAN_MODELS.cc_monthly_teams, 'claude-fable-5-2')).toBe(true);
});
