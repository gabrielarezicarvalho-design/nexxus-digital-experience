import { hasOneMillionContext, isContextSizeError } from './long-conversation-notice';

// Limite de contexto anunciado por plano: 1M nos planos com 1M, 256K nos demais.
export const DEFAULT_CONTEXT_TOKENS = 256_000;
export const ONE_MILLION_CONTEXT_TOKENS = 1_000_000;
// Bloqueio antes de enviar só com folga clara: a estimativa precisa passar 20% do limite.
export const PRE_SEND_BLOCK_MARGIN = 1.2;

export function planContextLimit(key: Parameters<typeof hasOneMillionContext>[0]): number {
  return hasOneMillionContext(key) ? ONE_MILLION_CONTEXT_TOKENS : DEFAULT_CONTEXT_TOKENS;
}

/** Texto que o tokenizador comprime muito (espaços e símbolos repetidos) conta como um caractere. */
function textChars(text: string): number {
  return text.replace(/\s+/g, ' ').replace(/([^\w\s])\1+/g, '$1').length;
}

/**
 * Estimativa conservadora dos tokens de entrada (~4 caracteres por token), sem contar imagens
 * e documentos em base64, para nunca bloquear um pedido por um anexo binário.
 */
export function estimatePromptTokens(body: unknown): number {
  let chars = 0;
  const walk = (value: unknown, key: string, parent: Record<string, unknown> | null) => {
    if (typeof value === 'string') {
      if (value.startsWith('data:')) return;
      if (key === 'data' && parent && (parent['type'] === 'base64' || typeof parent['media_type'] === 'string')) return;
      chars += textChars(value);
      return;
    }
    if (Array.isArray(value)) { for (const item of value) walk(item, key, parent); return; }
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      for (const [k, v] of Object.entries(obj)) {
        if (k === 'model' || k === 'stream' || k === 'stream_options') continue;
        walk(v, k, obj);
      }
    }
  };
  walk(body, '', null);
  return Math.ceil(chars / 4);
}

/** O pedido passa com folga clara do contexto do plano: responder na hora, sem chamar fornecedor. */
export function shouldBlockBeforeSend(estimatedTokens: number, contextLimit: number): boolean {
  return estimatedTokens > contextLimit * PRE_SEND_BLOCK_MARGIN;
}

/** Um 502 é de conversa grande quando a estimativa passou do contexto do plano ou algum fornecedor recusou pelo tamanho. */
export function isLongConversation502(estimatedTokens: number, contextLimit: number, failures: { cause?: string }[] = [], raw = ''): boolean {
  return estimatedTokens > contextLimit || isContextSizeError(raw) || failures.some((f) => isContextSizeError(f.cause ?? ''));
}
