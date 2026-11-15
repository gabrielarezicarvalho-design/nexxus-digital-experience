// Troca automática entre modelos DeepSeek quando o fornecedor fica sem crédito para um deles.
export const DEEPSEEK_CHAIN = ["deepseek-v4-pro-0813", "deepseek-v4-pro-max", "deepseek-v4-flash-0731"];

// Ordem de tentativa: o modelo pedido primeiro, depois os outros DeepSeek. Outros modelos não trocam.
export function fallbackOrder(upstreamModel: string): string[] {
  if (!upstreamModel.toLowerCase().startsWith("deepseek")) return [upstreamModel];
  return [upstreamModel, ...DEEPSEEK_CHAIN.filter((m) => m !== upstreamModel)];
}

// Falta de crédito/cota do fornecedor (402, 429 ou mensagem de cota/crédito).
export function isQuotaError(status: number, bodyText: string): boolean {
  if (status === 402) return true;
  if (status < 400) return false;
  return /quota|credit|crédito|credito|insufficient|balance|saldo/i.test(bodyText);
}
