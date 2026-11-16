// Nexaclean: marca própria da Nexa para o modelo aberto do Free.ai (Qwen3-30B-A3B).
// Estes nomes vão só para o Free.ai e o Free.ai nunca entra na fila comum (dedicated_only),
// para que nenhum pedido de Claude caia nele e nenhum Nexaclean caia em outro fornecedor (Gabriel, 16/11/2026).
export const NEXACLEAN_PROVIDER = "Free.ai";
export const NEXACLEAN_UPSTREAM = "qwen-coder";
export const NEXACLEAN_MODELS = [
  "nexaclean-rapido",
  "nexaclean-pro",
  "nexaclean-plus",
  "nexaclean-ultra",
  "nexaclean-play",
  "nexaclean-max",
] as const;

const norm = (v: string) => v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

/** Nome canônico quando o pedido é um Nexaclean (aceita "Nexaclean Rápido", "nexaclean_pro" etc.). */
export function nexacleanModel(model: string): string | undefined {
  const n = norm(model);
  return NEXACLEAN_MODELS.find((id) => norm(id) === n);
}
