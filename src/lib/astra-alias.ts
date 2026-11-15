export const ASTRA_ALIAS = 'gpt-6-astra';
export const ASTRA_TARGET = 'gpt-6-astra';
export const ASTRA_LABEL = 'Astra — combo do fornecedor';
export function astraAliasAvailable(provider: string, models: readonly string[]) {
  return provider === 'Anthropic Revenda' && models.includes(ASTRA_TARGET);
}
export function apiModelLabel(id: string) { return id === ASTRA_ALIAS ? ASTRA_LABEL : id; }