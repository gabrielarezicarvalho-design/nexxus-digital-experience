export type PlanLimits = { token_limit?: number | null | undefined; daily_token_limit?: number | null | undefined };

export function hasTokenLimit(plan: PlanLimits) {
  return (plan.token_limit ?? 0) > 0 || (plan.daily_token_limit ?? 0) > 0;
}

export function requireTokenLimit(plan: PlanLimits) {
  if (!hasTokenLimit(plan)) throw new Error("Informe um limite total ou diário de tokens. Planos ilimitados não estão mais disponíveis.");
}