import { z } from "zod";

// Igual ao maior pacote do site; o banco recusa valores acima disso.
export const RESELLER_PLAN_MAX_TOKENS = 1_000_000_000;

export const resellerPlanInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(60),
  kind: z.literal("tokens"),
  token_limit: z.number().int().positive().max(RESELLER_PLAN_MAX_TOKENS).nullable(),
  duration_days: z.number().int().min(1).max(3650).nullable(),
}).superRefine((p, ctx) => {
  if (p.token_limit === null || p.duration_days !== null) {
    ctx.addIssue({ code: "custom", message: "Informe a quantidade de tokens, sem prazo." });
  }
});

export function canUseResellerPlan(plan: { reseller_id: string; active: boolean }, resellerId: string) {
  return plan.active && plan.reseller_id === resellerId;
}