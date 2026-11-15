export type CatalogModel = { name: string; internal_id: string | null; provider: string; enabled: boolean };

export const ANTHROPIC_REVENDA_COMBOS = [
  "claude-opus-4-8", "claude-opus-5-5", "claude-fable-5-1", "claude-fable-5-2", "gemini-4-argon",
  "gpt-6-astra", "gpt-6-sol", "gpt-6.1-sol", "gpt-6-luna",
  "gpt-6.1-terra", "claude-sonnet-5-5", "claude-haiku-5-5", "claude-haiku-4-5",
  "suporte-queda",
] as const;

// Provider combo names are transport aliases, not a claim about their pool.
export function anthropicRevendaCombo(account: { name: string; available_models?: string[] | null }, model: string): string | null {
  if (account.name !== "Anthropic Revenda") return null;
  const aliases: Record<string, string> = {
    "claude-opus-5": "claude-opus-5-5",
    "claude-fable-5": "claude-fable-5-1",
    "claude-fable-5.5": "claude-fable-5-1",
    "claude-fable-5-5": "claude-fable-5-1",
  };
  const spelling = (id: string) => id.toLowerCase().replace(/[._]/g, "-");
  const combo = aliases[model] ?? ANTHROPIC_REVENDA_COMBOS.find(id => spelling(id) === spelling(model));
  if (combo && account.available_models?.includes(combo)) return combo;
  // Haiku 4.5 (including dated IDs) uses the dedicated 4-5 combo when listed, else the supplier's Haiku combo.
  const base = spelling(model).replace(/-\d{8}$/, "");
  if (base === "claude-haiku-4-5") return ["claude-haiku-4-5", "claude-haiku-5-5"].find(id => account.available_models?.includes(id)) ?? null;
  // Claude Code's default Sonnet/Opus 4.x IDs (approved by the owner) use the current Sonnet/Opus 5.5 combos when listed.
  const legacy = /^claude-(sonnet|opus)-4(-\d+)?$/.exec(base);
  const target = legacy ? `claude-${legacy[1]}-5-5` : null;
  return target && account.available_models?.includes(target) ? target : null;
}

export function providerModelAllowed(provider: string, model: string) {
  return provider !== "Anthropic Revenda" || ANTHROPIC_REVENDA_COMBOS.some((combo) => combo === model);
}

export function providerCatalogModels(provider: string, models: string[]) {
  const unique = [...new Set(models)];
  if (provider === "Anthropic Revenda") return unique.filter((model) => providerModelAllowed(provider, model));
  return unique;
}

export function missingProviderModels(provider: string, providerId: string, discovered: string[], existing: CatalogModel[]) {
  const owned = new Set(existing.filter((model) => model.provider === provider).map((model) => model.internal_id || model.name));
  return providerCatalogModels(provider, discovered).filter((model) => !owned.has(model)).map((model) => ({
    name: `reserve-${providerId}-${model}`,
    display_name: model,
    internal_id: model,
    provider,
    enabled: false,
    catalog_approved: false,
  }));
}
// Tokens Token: public combos answered by the supplier's euatendo combos (transport aliases only).
export const TOKENS_TOKEN_COMBOS: Record<string, string> = {
  "claude-opus-4-8": "euatendo-promax",
  "claude-opus-5-5": "euatendo-promax",
  "claude-fable-5-1": "euatendo-promax",
  "claude-fable-5-2": "euatendo-promax",
  "claude-sonnet-5-5": "euatendo-claude",
  "claude-haiku-5-5": "euatendo-claude",
  // Haiku 4.5 (Claude Code's default background model) uses the supplier's real Haiku 4.5 under its prime/ prefix.
  "claude-haiku-4-5": "prime/claude-haiku-4-5",
  "claude-haiku-4-5-20251001": "prime/claude-haiku-4-5-20251001",
};

export function tokensTokenCombo(account: { name: string; available_models?: string[] | null }, model: string): string | null {
  if (account.name !== "Tokens Token") return null;
  const spelled = model.toLowerCase().replace(/[._]/g, "-");
  const combo = TOKENS_TOKEN_COMBOS[spelled];
  if (combo && account.available_models?.includes(combo)) return combo;
  // Other Claude IDs (e.g. Claude Code's claude-sonnet-4-6) use the supplier's real model under its prime/ prefix when listed.
  const prime = `prime/${spelled}`;
  return spelled.startsWith("claude-") && account.available_models?.includes(prime) ? prime : null;
}
