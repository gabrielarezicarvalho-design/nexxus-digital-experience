// Família do plano comprado: decide quais modelos a chave pode listar e usar.
export const MODEL_FAMILIES = ["claude", "openai", "combo"] as const;
export type ModelFamily = (typeof MODEL_FAMILIES)[number];

export const FAMILY_LABELS: Record<ModelFamily, string> = { claude: "Claude", openai: "GPT", combo: "Combo Claude + GPT" };

export function asFamily(value: unknown): ModelFamily {
  return MODEL_FAMILIES.includes(value as ModelFamily) ? (value as ModelFamily) : "claude";
}

export function modelFamily(name: string): "claude" | "openai" {
  return /^(?:[a-z0-9-]+\/)?(?:gpt|codex|o\d)(?:[-.]|$)/i.test(name) ? "openai" : "claude";
}

export function familyAllows(family: ModelFamily, model: string) {
  return family === "combo" || modelFamily(model) === family;
}

export function filterByFamily(family: ModelFamily, names: string[]) {
  return names.filter((name) => familyAllows(family, name));
}

// Combo = Claude + GPT com desconto e acréscimo fixo sobre o preço calculado.
export const COMBO_DISCOUNT = 0.1;
export const COMBO_SURCHARGE_CENTS = 1000;

export function familyPriceCents(family: ModelFamily, baseCents: number) {
  return family === "combo" ? Math.round(baseCents * 2 * (1 - COMBO_DISCOUNT)) + COMBO_SURCHARGE_CENTS : baseCents;
}
