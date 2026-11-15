// Cobrança de cache: tokens de entrada lidos do cache do fornecedor contam só uma fração
// no consumo da chave. Gravação de cache, entrada normal e saída continuam cheias.
export const CACHE_READ_RATE = 0.1;

type RawUsage = {
  prompt_tokens?: number; completion_tokens?: number; total_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number | null; created_cache_tokens?: number | null } | null;
  cache_read_input_tokens?: number; cache_creation_input_tokens?: number;
} | null | undefined;

export type BilledUsage = {
  prompt_tokens: number; completion_tokens: number; total_tokens: number;
  cached_tokens: number; cache_write_tokens: number; cache_discount_tokens: number; raw_total_tokens: number;
};

const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

export function billedUsage(u: RawUsage): BilledUsage {
  const prompt = n(u?.prompt_tokens), completion = n(u?.completion_tokens);
  const rawTotal = n(u?.total_tokens) || prompt + completion;
  const cached = Math.min(prompt, n(u?.prompt_tokens_details?.cached_tokens) || n(u?.cache_read_input_tokens));
  const write = Math.min(prompt - cached, n(u?.prompt_tokens_details?.created_cache_tokens) || n(u?.cache_creation_input_tokens));
  const discount = cached - Math.ceil(cached * CACHE_READ_RATE);
  return {
    prompt_tokens: prompt - discount, completion_tokens: completion, total_tokens: Math.max(0, rawTotal - discount),
    cached_tokens: cached, cache_write_tokens: write, cache_discount_tokens: discount, raw_total_tokens: rawTotal,
  };
}

/** Uso no formato Anthropic: input_tokens não inclui leitura nem gravação de cache. */
export function anthropicUsage(u: RawUsage) {
  const b = billedUsage(u);
  const prompt = n(u?.prompt_tokens);
  return {
    input_tokens: Math.max(0, prompt - b.cached_tokens - b.cache_write_tokens),
    cache_creation_input_tokens: b.cache_write_tokens,
    cache_read_input_tokens: b.cached_tokens,
    output_tokens: b.completion_tokens,
  };
}
