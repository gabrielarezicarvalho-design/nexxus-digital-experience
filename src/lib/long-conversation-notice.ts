import { sanitizeProviderCause } from './upstream-diagnostics';

// Mensagem mostrada ao cliente quando o fornecedor falha por conversa grande demais.
export const LONG_CONVERSATION_MESSAGE =
  'Esta conversa atingiu o limite de 200k de tokens de uma conversa só. Compacte a conversa com /compact ou de um /clear ou crie uma conversa nova para continuar usando.';

// Planos com 1M de contexto recebem a orientação para liberar o 1M no terminal.
export const ONE_MILLION_CONTEXT_MESSAGE = 'Ative o seu 1M de contexto no terminal rodando o comando /autocompact 1000000';
const ONE_MILLION_MONTHLY_PLANS = new Set(['pro', 'max', 'enterprise', 'teams', 'gpt pro', 'gpt max', 'gpt enterprise', 'gpt teams']);

/** Pro/Max/Enterprise/Teams (Claude e GPT) e todos os pacotes por tokens (limite de tokens, sem prazo) têm 1M de contexto. */
export function hasOneMillionContext(key: { plano?: string | null; token_limit?: number | null; expires_at?: string | null }): boolean {
  if (ONE_MILLION_MONTHLY_PLANS.has(String(key.plano ?? '').trim().toLowerCase())) return true;
  return Number(key.token_limit ?? 0) > 0 && !key.expires_at;
}

export function longConversationMessage(oneMillion = false): string {
  return oneMillion ? ONE_MILLION_CONTEXT_MESSAGE : LONG_CONVERSATION_MESSAGE;
}

// Mensagem do 502 de conversa grande (pedido do Gabriel, 14/11/2026): só quando a conversa passou
// do contexto do plano ou um fornecedor recusou pelo tamanho; os demais 502 recebem TEMPORARY_502_MESSAGE.
export const ERROR_502_MESSAGE = 'Erro 502: sua conversa ficou grande demais para o modelo responder. Para continuar: rode /compact para resumir a conversa; se ainda falhar, rode /clear ou abra uma conversa nova e tente de novo.';
export const ERROR_502_1M_MESSAGE = 'Erro 502: sua conversa ficou grande demais para o modelo responder. Para continuar: rode /compact para resumir a conversa ou ative o seu 1M de contexto com /autocompact 1000000; se ainda falhar, rode /clear ou abra uma conversa nova e tente de novo.';
export const TEMPORARY_502_MESSAGE = 'Erro 502: falha temporária no servidor do modelo. Aguarde alguns instantes e tente de novo.';

export function error502Message(oneMillion = false): string {
  return oneMillion ? ERROR_502_1M_MESSAGE : ERROR_502_MESSAGE;
}

/** Resposta do 502 ao cliente: dica de compactar só quando a conversa é mesmo grande. */
export function client502Message(longConversation: boolean, oneMillion = false): string {
  return longConversation ? error502Message(oneMillion) : TEMPORARY_502_MESSAGE;
}

// Conversa muito acima do contexto do plano: respondida na hora, sem chamar fornecedor (HTTP 400, sem nova tentativa automática).
export function contextTooLargeMessage(estimatedTokens: number, contextLimit: number, oneMillion = false): string {
  const k = (n: number) => `${Math.round(n / 1000)}K`;
  const tip = oneMillion
    ? 'rode /compact para resumir a conversa ou ative o seu 1M de contexto com /autocompact 1000000; se ainda falhar, rode /clear ou abra uma conversa nova.'
    : 'rode /compact para resumir a conversa; se ainda falhar, rode /clear ou abra uma conversa nova.';
  return `Sua conversa tem cerca de ${k(estimatedTokens)} tokens, acima do limite de ${k(contextLimit)} de contexto do seu plano. Para continuar: ${tip}`;
}

// Mensagens limpas que substituem o erro bruto do fornecedor.
export const TEMPORARY_UPSTREAM_MESSAGE = 'Instabilidade temporária no servidor: reduza o histórico rodando /compact ou /clear e tente novamente em instantes.';
export const TEMPORARY_UPSTREAM_1M_MESSAGE = 'Instabilidade temporária no servidor: reduza o histórico rodando /compact ou /clear (ou ative o 1M de contexto com /autocompact 1000000) e tente novamente em instantes.';
const temporaryMessage = (oneMillion: boolean) => oneMillion ? TEMPORARY_UPSTREAM_1M_MESSAGE : TEMPORARY_UPSTREAM_MESSAGE;
export const BUSY_UPSTREAM_MESSAGE = 'Servidor com muitos pedidos no momento. Aguarde alguns segundos e tente novamente.';
// Todo HTTP 400 recusado pelo fornecedor mostra esta orientação (pedido do Gabriel, 13/11/2026).
export const BAD_REQUEST_400_MESSAGE = 'Mensagem longa: rode /clear ou ative o 1M de contexto através do comando /autocompact 1000000';
export const REJECTED_REQUEST_MESSAGE = 'O modelo recusou este pedido. Revise a mensagem ou os arquivos enviados e tente novamente.';

const CONTEXT_PATTERN = /reduce the length|context.?length|too long|maximum context|prompt is too long|tokens? exceed/i;
// Problemas da conta do fornecedor (saldo, crédito, credencial): nunca são culpa do cliente.
const PROVIDER_ACCOUNT_PATTERN = /insufficient|balance|saldo|quota|cota|credit|cr[eé]dito|billing|payment|pagamento|authenticat|autentica|credential|credencia|api.?key|unauthori[sz]ed|forbidden|permission|account|suspend/i;
// Pistas de identidade interna de fornecedor ou roteador que não podem chegar ao cliente.
const INTERNAL_IDENTITY_PATTERN = /anthropic-compatible|openai-compatible|openrouter|9router|devhub|nexxus|tokens.?token|freeapi|radox|codecraft|clean.?apis|subtoapi|invision|lauren|kodeo|freemodel|gateway|upstream|provider|fornecedor|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export type ClientUpstreamError = { status: number; message: string; kind: 'rate_limit' | 'server' | 'invalid_request' };

/** True when a supplier rejected the request for its size (e.g. "reduce the length of the messages"). */
export function isContextSizeError(raw = ''): boolean {
  return CONTEXT_PATTERN.test(raw);
}

export function clientUpstreamMessage(status: number, raw: string, fallback: string, oneMillion = false): string {
  if (isContextSizeError(raw)) return status === 502 ? error502Message(oneMillion) : longConversationMessage(oneMillion);
  return status === 502 ? TEMPORARY_502_MESSAGE : fallback;
}

function rawMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    const message = parsed?.error?.message ?? parsed?.message;
    if (typeof message === 'string') return message;
  } catch { /* texto puro */ }
  return raw;
}

/**
 * Converte a recusa bruta de um fornecedor na resposta mostrada ao cliente: nunca repassa
 * saldo do fornecedor, IDs internos, endereços ou credenciais. O log interno guarda o texto original.
 */
export function clientUpstreamError(status: number, raw: string, oneMillion = false, longConversation = false): ClientUpstreamError {
  if (status === 400 && !PROVIDER_ACCOUNT_PATTERN.test(raw)) return { status: 400, message: BAD_REQUEST_400_MESSAGE, kind: 'invalid_request' };
  if (status === 502) return { status, message: client502Message(longConversation || isContextSizeError(raw), oneMillion), kind: 'server' };
  if (isContextSizeError(raw)) return { status, message: longConversationMessage(oneMillion), kind: 'server' };
  if (status === 401 || status === 402 || status === 403 || PROVIDER_ACCOUNT_PATTERN.test(raw)) {
    return { status: 503, message: temporaryMessage(oneMillion), kind: 'server' };
  }
  if (status === 429) return { status: 429, message: BUSY_UPSTREAM_MESSAGE, kind: 'rate_limit' };
  if (status >= 400 && status < 500 && status !== 404 && status !== 408) {
    const message = sanitizeProviderCause(rawMessage(raw)).replace(/\s+/g, ' ').trim().slice(0, 300);
    const safe = message && !INTERNAL_IDENTITY_PATTERN.test(message) && !/\[[^\]]*omitid[oa]\]/.test(message);
    return { status, message: safe ? message : REJECTED_REQUEST_MESSAGE, kind: 'invalid_request' };
  }
  return { status: 503, message: temporaryMessage(oneMillion), kind: 'server' };
}

/**
 * Official wording that Claude Code recognises as a context overflow, so it compacts the
 * conversation and resends on its own. Used only by the Anthropic Messages protocol.
 */
export function promptTooLongMessage(estimatedTokens: number, contextLimit: number, oneMillion = false): string {
  const tokens = Math.max(Math.round(estimatedTokens), contextLimit + 1);
  // Gabriel (14/11/2026): the client reads our own guidance; the short official prefix only lets Claude Code compact by itself.
  const guidance = estimatedTokens > contextLimit
    ? contextTooLargeMessage(estimatedTokens, contextLimit, oneMillion)
    : error502Message(oneMillion).replace(/^Erro 502: s/, 'S');
  return `prompt is too long: ${tokens} tokens > ${contextLimit} maximum. ${guidance}`;
}
