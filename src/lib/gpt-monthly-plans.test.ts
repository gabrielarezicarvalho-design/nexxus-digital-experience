import { expect, test } from 'bun:test';
import { MONTHLY_PLAN_FAMILY, MONTHLY_PLAN_MODELS, planAllowsModel } from './plan-models';
import { gptMonthlyPlanPreviews } from './monthly-plan-preview';
import { monthlyBurstLimit } from './monthly-burst';

const allows = (code: keyof typeof MONTHLY_PLAN_MODELS, model: string) => planAllowsModel(MONTHLY_PLAN_MODELS[code], model);

test('GPT Pro: only GPT 6 Luna and GPT 6 Sol (Anthropic Revenda combos)', () => {
  expect(allows('cc_monthly_gpt_pro', 'gpt-6-luna')).toBe(true);
  expect(allows('cc_monthly_gpt_pro', 'gpt-6-sol')).toBe(true);
  expect(allows('cc_monthly_gpt_pro', 'gpt-5.5')).toBe(false);
  expect(allows('cc_monthly_gpt_pro', 'gpt-6.1-terra')).toBe(false);
  expect(allows('cc_monthly_gpt_pro', 'gpt-6-astra')).toBe(false);
});

test('GPT Max adds Terra and Sol but not Astra', () => {
  expect(allows('cc_monthly_gpt_max', 'gpt-6.1-terra')).toBe(true);
  expect(allows('cc_monthly_gpt_max', 'gpt-6.1-sol')).toBe(true);
  expect(allows('cc_monthly_gpt_max', 'gpt-6-astra')).toBe(false);
});

test('GPT Enterprise adds Astra; GPT Teams has every GPT', () => {
  expect(allows('cc_monthly_gpt_enterprise', 'gpt-6-astra')).toBe(true);
  expect(allows('cc_monthly_gpt_teams', 'gpt-6-astra')).toBe(true);
  expect(allows('cc_monthly_gpt_teams', 'gpt-7-nova')).toBe(true);
});

test('GPT monthly plans never unlock Claude', () => {
  for (const code of ['cc_monthly_gpt_pro', 'cc_monthly_gpt_max', 'cc_monthly_gpt_enterprise', 'cc_monthly_gpt_teams'] as const) {
    expect(allows(code, 'claude-opus-5-5')).toBe(false);
    expect(MONTHLY_PLAN_FAMILY[code]).toBe('openai');
  }
});

test('GPT monthly prices: Pro 89.90, Max 164.90, Enterprise 180, Teams 289.90 reais', () => {
  expect(gptMonthlyPlanPreviews.map(p => p.priceCents)).toEqual([8990, 16490, 18000, 28990]);
});

test('GPT hourly limits mirror Claude: 100M / 100M / 200M / 250M', () => {
  expect(monthlyBurstLimit('GPT Pro')).toBe(100_000_000);
  expect(monthlyBurstLimit('GPT Max')).toBe(100_000_000);
  expect(monthlyBurstLimit('GPT Enterprise')).toBe(200_000_000);
  expect(monthlyBurstLimit('GPT Teams')).toBe(250_000_000);
});
