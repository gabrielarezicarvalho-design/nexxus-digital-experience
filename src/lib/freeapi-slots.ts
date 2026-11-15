export const FREEAPI_PROVIDER = "FreeAPI Anthropic Revenda";

export const FREEAPI_SLOTS = {
  sonnet: "claude-sonnet-4-5",
  opus: "claude-opus-4-5",
  haiku: "claude-haiku-4-5",
  automatic: "auto",
} as const;

// A FreeAPI só entende estes slots. O nome público continua intacto na resposta;
// esta conversão vale exclusivamente para o transporte do último fallback.
export function freeApiSlot(account: { name: string }, model: string): string | null {
  if (account.name !== FREEAPI_PROVIDER) return null;
  const id = model.toLowerCase().replace(/_/g, "-");
  if (/(^|[-.])opus([-.]|$)/.test(id)) return FREEAPI_SLOTS.opus;
  if (/(^|[-.])sonnet([-.]|$)/.test(id)) return FREEAPI_SLOTS.sonnet;
  if (/(^|[-.])(?:haiku|fable)([-.]|$)/.test(id)) return FREEAPI_SLOTS.haiku;
  return FREEAPI_SLOTS.automatic;
}
