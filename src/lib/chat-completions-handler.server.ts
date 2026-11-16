import { blockedKeyMessage, IP_LIMIT_BLOCK_MESSAGE } from "@/lib/key-block-message";
import { reserveLabel } from "@/lib/devhub-combos";
import { cancelAware } from "@/lib/client-cancel";
import { billedUsage } from "./cache-billing";
import { keyBurstLimit, keyBurstMessage } from '@/lib/monthly-burst';
import { sseToCompletion } from "@/lib/sse-completion";
import { isRepeatedRequest } from "./spam-guard.server";
import { checkKeyRpm, rpmRefusal } from "@/lib/mass-agent-guard";
import { clientIp, sha256Hex } from "@/lib/keys.server";
import { resellerPaymentBlockMessage } from "@/lib/key-block-message";
import { openAIExhaustedJson, openAIExhaustedStream } from "@/lib/tokens-exhausted-reply";

import { fetchUpstream, maskUpstreamModel, OUTAGE_COMBO } from "@/lib/upstream.server";
import { clientModelNames } from "@/lib/client-models.server";
import { matchModelName } from "@/lib/model-name-match";
import { pickKeyModel } from "@/lib/model-resolve";
import { asFamily } from "@/lib/model-family";
import { keyProvider } from '@/lib/key-provider';
import { client502Message, clientUpstreamError, contextTooLargeMessage, hasOneMillionContext } from '@/lib/long-conversation-notice';
import { estimatePromptTokens, isLongConversation502, planContextLimit, shouldBlockBeforeSend } from '@/lib/context-guard';
import { routingDiagnostic, type ProviderFailure } from '@/lib/upstream-diagnostics';

function err(status: number, message: string, type = "invalid_request_error") {
  return Response.json({ error: { message, type, code: status } }, { status });
}

export type ChatUsage = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
export interface ChatCompletionsAdapter {
  convertBody: (body: Record<string, unknown>) => Record<string, unknown>;
  convertJson: (json: unknown, model: string) => unknown;
  convertStream: (upstream: Response, model: string, upstreamModel: string, finish: (usage: ChatUsage | null, status: number, error?: string) => Promise<void>) => Response;
  upstreamError?: (status: number, message: string) => Response;
  acceptsApiKeyHeader?: boolean;
}

export async function handleChatCompletions(request: Request, adapter?: ChatCompletionsAdapter): Promise<Response> {
  const started = Date.now();
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  // VPS: o gate antigo exigia CODECRAFT_API_KEY mesmo sem esse fornecedor; cada fornecedor ativo valida a própria chave.

  const auth = request.headers.get("authorization") || (adapter?.acceptsApiKeyHeader ? request.headers.get('x-api-key') : '') || '';
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return err(401, "API key ausente", "authentication_error");

  const { data: key } = await db
    .from("api_keys")
    .select("id, client_id, status, reseller_blocked, plano, reseller_id, token_limit, daily_token_limit, tokens_used, expires_at, rpm_limit, model_family, forced_provider, allowed_models, spam_guard, burst_token_limit, burst_window_minutes, burst_pause_minutes, burst_exempt, clients(status, forced_provider)")
    .eq("key_hash", await sha256Hex(token))
    .maybeSingle();

  const ip = clientIp(request);
  const failures: ProviderFailure[] = [];
  const log = (rawStatus: number, rawExtra: Record<string, unknown> = {}) => { const [status_code, extra] = cancelAware(request, rawStatus, rawExtra); return (
    db.from("request_logs").insert({
      api_key_id: key?.id ?? null,
      client_id: key?.client_id ?? null,
      status_code,
      latency_ms: Date.now() - started,
      client_ip: ip,
      ...extra,
      error: routingDiagnostic(typeof extra['error'] === 'string' ? extra['error'] : undefined, failures),
    })); };

  if (!key) return err(401, "API key inválida", "authentication_error");
  const paymentBlockMessage = resellerPaymentBlockMessage(key);
  if (paymentBlockMessage) { await log(403, { error: "key blocked: reseller payment pending" }); return err(403, paymentBlockMessage, "permission_error"); }
  const client = key.clients as unknown as { status: string } | null;
  if (client && client.status !== "active") { await log(403, { error: "cliente bloqueado" }); return err(403, "Cliente bloqueado", "permission_error"); }
  const exhaustedReply = async () => {
    let b = await request.clone().json().catch(() => ({})) as Record<string, unknown>;
    if (adapter) { try { b = adapter.convertBody(b); } catch { /* usa padrão */ } }
    const m = String(b?.["model"] ?? "nexa");
    await log(429, { model: m, error: "limite de tokens" });
    if (b?.["stream"] === true) {
      const s = openAIExhaustedStream(m);
      return adapter ? adapter.convertStream(s, m, m, async () => {}) : s;
    }
    const json = openAIExhaustedJson(m);
    return Response.json(adapter ? adapter.convertJson(json, m) : json);
  };
  if (key.status === "exhausted") return exhaustedReply();
  if (key.status !== "active") { await log(403, { error: `key ${key.status}` }); return err(403, await blockedKeyMessage(db, key), "permission_error"); }
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    await db.from("api_keys").update({ status: "expired" }).eq("id", key.id);
    await log(403, { error: "key expirada" });
    return err(403, "API key expirada", "permission_error");
  }
  if (key.token_limit != null && key.tokens_used >= key.token_limit) {
    await db.from("api_keys").update({ status: "exhausted" }).eq("id", key.id);
    return exhaustedReply();
  }
  if (key.daily_token_limit != null) {
    const { data: today } = await db.rpc("key_tokens_today", { _key_id: key.id });
    if (Number(today ?? 0) >= key.daily_token_limit) { await log(429, { error: "limite diário de tokens" }); return err(429, "Limite de tokens diários do seu plano atingido. Aguarde até a próxima liberação.", "rate_limit_error"); }
  }
  if (keyBurstLimit(key)) {
    const { data: burst } = await db.rpc("check_monthly_burst", { _key_id: key.id });
    const b = Array.isArray(burst) ? burst[0] : burst;
    if (b?.blocked) { await log(429, { error: key.burst_token_limit != null ? "limite de tokens por janela da chave" : "limite de tokens por hora do plano mensal" }); return err(429, keyBurstMessage(key, b.paused_until), "rate_limit_error"); }
  }
  // Bloqueio automático: mais de 2 IPs distintos nos últimos 7 dias = compartilhamento da chave
  const { data: ipCount } = await db.rpc("key_ip_count", { _key_id: key.id });
  if ((ipCount ?? 0) > 2) {
    await db.from("api_keys").update({ status: "blocked" }).eq("id", key.id).eq("status", "active");
    await log(403, { error: "bloqueio automático: mais de 2 IPs em 7 dias" });
    return err(403, IP_LIMIT_BLOCK_MESSAGE, "permission_error");
  }
  const rpmBlock = rpmRefusal(await checkKeyRpm(db, key.id));
  if (rpmBlock) { await log(429, { error: rpmBlock.log }); return err(429, rpmBlock.message, "rate_limit_error"); }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return err(400, "JSON inválido"); }
  if (adapter) {
    try { body = adapter.convertBody(body); } catch { return err(400, "Entrada Responses inválida"); }
  }
  if (key.spam_guard && await isRepeatedRequest(db, key.id, body)) { await log(429, { error: "pedido repetido" }); return err(429, "Pedido repetido em poucos segundos. Aguarde e tente de novo.", "rate_limit_error"); }
  const asked = String(body["model"] ?? "");
  const forcedProvider = keyProvider(key);
  const names = await clientModelNames(db, forcedProvider, key.client_id, asFamily(key.model_family), key.allowed_models ?? null);
  // Modelo fora do plano/nome desconhecido: usa o equivalente mais próximo entre os modelos da chave.
  const picked = pickKeyModel(asked, names, matchModelName(asked, names));
  if (!picked) { await log(400, { model: asked, error: "nenhum modelo habilitado" }); return err(400, "Nenhum modelo disponível"); }
  const model = picked.model;
  body["model"] = model;

  const stream = body["stream"] === true;
  if (stream) body["stream_options"] = { ...(body["stream_options"] as object ?? {}), include_usage: true };

  // Conversa muito acima do contexto do plano: responde na hora, sem chamar fornecedor.
  const oneMillion = hasOneMillionContext(key);
  const contextLimit = planContextLimit(key);
  const estimatedTokens = estimatePromptTokens(body);
  if (shouldBlockBeforeSend(estimatedTokens, contextLimit)) {
    const message = contextTooLargeMessage(estimatedTokens, contextLimit, oneMillion);
    await log(400, { model, stream, error: `conversa acima do contexto do plano (estimativa ${estimatedTokens}, limite ${contextLimit})` });
    if (adapter?.upstreamError) return adapter.upstreamError(400, JSON.stringify({ error: { message, type: "invalid_request_error" } }));
    return err(400, message, "invalid_request_error");
  }

  let upstream: Response;
  let upstreamModel = model;
  let responseModel = model;
  let onUsage: (t: number, s: number, e?: string) => Promise<void> = async () => {};
  let provider: string | null = null;
  try {
    const routed = await fetchUpstream(body, request.signal, forcedProvider, failures);
    upstream = routed.res;
    upstreamModel = routed.upstreamModel;
    // The outage combo is labelled with its own name, never as the Claude/GPT model that was asked for.
    // A Claude request answered by the 9Router reserve is labelled as a non-Claude reserve (Gabriel, 15/11/2026).
    responseModel = upstreamModel === OUTAGE_COMBO ? OUTAGE_COMBO : reserveLabel(routed.provider, model) ?? model;
    onUsage = routed.onUsage;
    provider = routed.provider;
  } catch (e) {
    await log(502, { model, stream, error: String(e).slice(0, 500) });
    const message = client502Message(isLongConversation502(estimatedTokens, contextLimit, failures), oneMillion);
    return adapter?.upstreamError?.(502, message) ?? err(502, message, "server_error");
  }

  const finish = async (u: Parameters<typeof billedUsage>[0], status: number, error?: string) => {
    // Cache lido conta só uma fração no consumo da chave (cache-billing); o fornecedor recebe o uso bruto.
    const b = billedUsage(u);
    await log(status, { model, stream, prompt_tokens: b.prompt_tokens, completion_tokens: b.completion_tokens, total_tokens: b.total_tokens, cached_tokens: b.cached_tokens, cache_write_tokens: b.cache_write_tokens, cache_discount_tokens: b.cache_discount_tokens, error: error ?? null, provider });
    if (status < 400) await db.rpc("record_key_usage", { _key_id: key.id, _tokens: b.total_tokens });
    await onUsage(b.raw_total_tokens, cancelAware(request, status)[0], error);
  };

  if (!upstream.ok) {
    const text = await upstream.text();
    await finish(null, upstream.status, text.slice(0, 500));
    // O cliente nunca recebe o erro bruto do fornecedor; o log acima guarda o original.
    const safe = clientUpstreamError(upstream.status, text, oneMillion, isLongConversation502(estimatedTokens, contextLimit, failures, text));
    const type = safe.kind === "rate_limit" ? "rate_limit_error" : safe.kind === "invalid_request" ? "invalid_request_error" : "server_error";
    if (adapter?.upstreamError) return adapter.upstreamError(safe.status, JSON.stringify({ error: { message: safe.message, type } }));
    return err(safe.status, safe.message, type);
  }

  if (!stream) {
    const raw = await upstream.text().catch(() => "");
    let json: any = null;
    try { json = JSON.parse(raw); } catch { json = sseToCompletion(raw); }
    if (!json) {
      await finish(null, 502, "Resposta inválida do provedor");
      return adapter?.upstreamError?.(502, "Resposta inválida do provedor") ?? err(502, "Resposta inválida do provedor", "server_error");
    }
    if (typeof json === "object") (json as Record<string, unknown>)["model"] = responseModel;
    await finish(json?.usage ?? null, 200);
    return Response.json(adapter ? adapter.convertJson(json, responseModel) : json);
  }

  if (adapter) return adapter.convertStream(upstream, responseModel, upstreamModel, finish);

  // Streaming: repassa os chunks e captura o usage no final
  let usage: Parameters<typeof billedUsage>[0] = null;
  let buffer = "";
  const decoder = new TextDecoder();
  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctrl) {
      // Mask complete SSE lines, including model fields split across network chunks.
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        ctrl.enqueue(new TextEncoder().encode(maskUpstreamModel(line, upstreamModel, responseModel) + '\n'));
        const d = line.replace(/^data:\s*/, "").trim();
        if (!d || d === "[DONE]" || !line.startsWith("data:")) continue;
        try { const j = JSON.parse(d); if (j.usage) usage = j.usage; } catch { /* ignore */ }
      }
    },
    async flush(ctrl) {
      buffer += decoder.decode();
      if (buffer) ctrl.enqueue(new TextEncoder().encode(maskUpstreamModel(buffer, upstreamModel, responseModel)));
      await finish(usage, 200);
    },
  });
  if (!upstream.body) { await finish(null, 502, 'Resposta vazia do provedor'); return err(502, "Resposta vazia do provedor", "server_error"); }
  return new Response(upstream.body.pipeThrough(transform), {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
