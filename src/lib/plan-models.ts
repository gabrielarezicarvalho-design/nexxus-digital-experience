// Monthly subscriptions restrict a key to the models of its plan.
// allowed_models holds normalized keywords (e.g. "opus55"); null means no plan restriction.
import { planExclusiveModel } from './plan-exclusive-models';

const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');

export function planAllowsModel(allowed: readonly string[] | null | undefined, model: string) {
  const n = norm(model);
  // Plan-exclusive models need an explicit entry; '*' and unrestricted keys never include them.
  if (planExclusiveModel(model)) return Boolean(allowed?.some((k) => norm(k) === n));
  if (!allowed) return true;
  return allowed.some((k) => k === '*' || (/^(claude-|gpt-|glm-|gemini-)/i.test(k) ? n === norm(k) : n.includes(norm(k))));
}

export function filterPlanModels(allowed: readonly string[] | null | undefined, names: string[]) {
  return names.filter((name) => planAllowsModel(allowed, name));
}

export const MONTHLY_PLAN_CODES = {
  pro: 'cc_monthly_pro', max: 'cc_monthly_max', enterprise: 'cc_monthly_enterprise', teams: 'cc_monthly_teams',
} as const;

export const GPT_MONTHLY_PLAN_CODES = {
  pro: 'cc_monthly_gpt_pro', max: 'cc_monthly_gpt_max', enterprise: 'cc_monthly_gpt_enterprise', teams: 'cc_monthly_gpt_teams',
} as const;

export const MONTHLY_PLAN_MODELS = {
  cc_monthly_pro: ['claude-sonnet-5-5', 'claude-haiku-5-5', 'deepseek-v4.1-flash'],
  cc_monthly_max: ['claude'],
  cc_monthly_enterprise: ['claude', 'gpt', 'gemini-4-argon'],
  cc_monthly_teams: ['*'],
  cc_monthly_gpt_pro: ['gpt-6-luna', 'gpt-6-sol'],
  cc_monthly_gpt_max: ['gpt-6-luna', 'gpt-6-sol', 'gpt-6.1-terra', 'gpt-6.1-sol'],
  cc_monthly_gpt_enterprise: ['gpt-6-luna', 'gpt-6-sol', 'gpt-6.1-terra', 'gpt-6.1-sol', 'gpt-6-astra'],
  cc_monthly_gpt_teams: ['gpt'],
} as const;

// Enterprise needs both families for Astra and Gemini; GPT monthly plans are GPT-only.
export const MONTHLY_PLAN_FAMILY: Record<string, 'claude' | 'openai' | 'combo'> = {
  cc_monthly_pro: 'claude', cc_monthly_max: 'claude', cc_monthly_enterprise: 'combo', cc_monthly_teams: 'combo',
  cc_monthly_gpt_pro: 'openai', cc_monthly_gpt_max: 'openai', cc_monthly_gpt_enterprise: 'openai', cc_monthly_gpt_teams: 'openai',
};

export const SPAM_WINDOW_MS = 10_000;
