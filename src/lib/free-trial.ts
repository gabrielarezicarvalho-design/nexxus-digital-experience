/** Regras do teste grátis: 5 milhões de tokens; cada revenda pode gerar no máximo 20 testes (excluir não devolve vaga). */
export const TRIAL_TOKENS = 5_000_000;
export const TRIAL_PLAN_NAME = "Teste grátis";
export const RESELLER_TRIAL_LIMIT = 20;
export const TRIAL_AUDIT_ACTION = "reseller.trial_key";

/** Revendas autorizadas a gerar testes ilimitados por 30 minutos (fila comum dos fornecedores). */
export const HOUR_TRIAL_RESELLERS = ["diegopiantkoski@gmail.com"];
export const HOUR_TRIAL_MS = 30 * 60 * 1000;
export const HOUR_TRIAL_PLAN_NAME = "Teste grátis 30min";
/** Testes não ficam presos a um fornecedor: seguem a fila comum. */
export const TRIAL_PROVIDER: string | null = null;
export const HOUR_TRIAL_AUDIT_ACTION = "reseller.hour_trial_key";
export function hourTrialLimits(createdAt: number) {
  return { token_limit: null, daily_token_limit: null, forced_provider: TRIAL_PROVIDER, expires_at: new Date(createdAt + HOUR_TRIAL_MS).toISOString() };
}
export function canGenerateHourTrial(email: string | null | undefined) {
  return !!email && HOUR_TRIAL_RESELLERS.includes(email.trim().toLowerCase());
}

/** Somente a revenda com teste de 30 minutos pode gerar chaves (painel ou API de revenda). */
export const RESELLER_ISSUANCE_DENIED = "Geração de chaves desativada para esta revenda. Entre em contato com a Nexa Cloud.";
export function canIssueResellerKeys(email: string | null | undefined) {
  return canGenerateHourTrial(email);
}

export function trialsRemaining(used: number) {
  return Math.max(0, RESELLER_TRIAL_LIMIT - used);
}
