import { MONTHLY_PLAN_FAMILY } from "./plan-models";
import type { ModelFamily } from "./model-family";

// Mesma separação do site: Claude = pacotes de tokens + mensais Pro/Max/Enterprise/Teams;
// GPT = mensais GPT; Combo = Mensal 5x/20x.
const COMBO_TAB_CODES = ["cc_mensal_5x", "cc_mensal_20x"];

export function adminPlanTab(plan: { code: string | null; kind: string }): ModelFamily | null {
  const code = plan.code ?? "";
  if (COMBO_TAB_CODES.includes(code)) return "combo";
  if (code.startsWith("cc_monthly_gpt_")) return "openai";
  if (code.startsWith("cc_monthly_")) return "claude";
  if (plan.kind === "tokens") return "claude";
  return null;
}

/** Família da chave gerada: a mesma que a compra no site entrega. */
export function adminKeyFamily(tab: ModelFamily, code: string | null | undefined): ModelFamily {
  if (!code) return tab;
  if (COMBO_TAB_CODES.includes(code)) return "combo";
  return MONTHLY_PLAN_FAMILY[code] ?? tab;
}
