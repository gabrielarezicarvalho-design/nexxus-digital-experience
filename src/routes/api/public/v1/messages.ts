import { blockedKeyMessage, IP_LIMIT_BLOCK_MESSAGE } from "@/lib/key-block-message";
import { reserveLabel } from "@/lib/devhub-combos";
import { cancelAware } from "@/lib/client-cancel";
import { anthropicUsage, billedUsage } from "@/lib/cache-billing";
import { checkKeyRpm, rpmRefusal } from "@/lib/mass-agent-guard";
import { keyBurstLimit, keyBurstMessage } from '@/lib/monthly-burst';
import { isRepeatedRequest } from "@/lib/spam-guard.server";
import { createFileRoute } from "@tanstack/react-router";
import { clientIp, sha256Hex } from "@/lib/keys.server";
import { pickKeyModel } from "@/lib/model-resolve";
import { matchModelName } from "@/lib/model-name-match";
import { clientModelNames } from "@/lib/client-models.server";
import { asFamily } from "@/lib/model-family";
import { keyProvider } from '@/lib/key-provider';
import { resellerPaymentBlockMessage } from "@/lib/key-block-message";
import { anthropicExhaustedJson, anthropicExhaustedStream } from "@/lib/tokens-exhausted-reply";

// Ponte Anthropic Messages (/v1/messages) -> OpenAI Chat Completions (CodeCraft)
import { fetchUpstream, OUTAGE_COMBO } from "@/lib/upstream.server";
import { client502Message, clientUpstreamError, hasOneMillionContext, promptTooLongMessage, type ClientUpstreamError } from '@/lib/long-conversation-notice';
import { estimatePromptTokens, isLongConversation502, planContextLimit, shouldBlockBeforeSend } from '@/lib/context-guard';
import { routingDiagnostic, type ProviderFailure } from '@/lib/upstream-diagnostics';

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-api-key, anthropic-version, anthropic-beta",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function anthropicErrorType(safe: ClientUpstreamError) {
  return safe.kind === "rate_limit" ? "rate_limit_error" : safe.kind === "invalid_request" ? "invalid_request_error" : "api_error";
}

function aerr(status: number, message: string, type = "invalid_request_error") {
  return Response.json({ type: "error", error: { type, message } }, { status, headers: CORS });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Block = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMsg = any;

function blocks(content: unknown): Block[] {
  if (typeof content === "string") return [{ type: "text", text: content }];
  return Array.isArray(content) ? (content as Block[]) : [];
}

function toolResultText(c: unknown): string {
  if (typeof c === "string") return c;
  return blocks(c).map((b) => (b.type === "text" ? b.text : JSON.stringify(b))).join("\n");
}

export function anthropicToOpenAI(body: AnyMsg, model: string) {
  const out: AnyMsg[] = [];
  if (body.system) {
    const sys = typeof body.system === "string" ? body.system : blocks(body.system).map((b) => b.text ?? "").join("\n");
    if (sys) out.push({ role: "system", content: sys });
  }
  for (const m of (body.messages ?? []) as AnyMsg[]) {
    const bs = blocks(m.content);
    if (m.role === "assistant") {
      const text = bs.filter((b) => b.type === "text").map((b) => b.text).join("");
      const calls = bs.filter((b) => b.type === "tool_use").map((b) => ({
        id: b.id, type: "function", function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) },
      }));
      const msg: AnyMsg = { role: "assistant", content: text || null };
      if (calls.length) msg.tool_calls = calls;
      out.push(msg);
    } else {
      for (const b of bs.filter((b) => b.type === "tool_result")) {
        out.push({ role: "tool", tool_call_id: b.tool_use_id, content: (b.is_error ? "[erro] " : "") + toolResultText(b.content) });
      }
      const parts: AnyMsg[] = [];
      for (const b of bs) {
        if (b.type === "text") parts.push({ type: "text", text: b.text });
        else if (b.type === "image") {
          const s = b.source ?? {};
          const url = s.type === "base64" ? `data:${s.media_type};base64,${s.data}` : s.url;
          if (url) parts.push({ type: "image_url", image_url: { url } });
        }
      }
      if (parts.length) {
        const onlyText = parts.every((p) => p.type === "text");
        out.push({ role: "user", content: onlyText ? parts.map((p) => p.text).join("\n") : parts });
      }
    }
  }
  const req: AnyMsg = { model, messages: out, stream: body.stream === true };
  if (body.max_tokens) req.max_tokens = body.max_tokens;
  if (body.temperature != null) req.temperature = body.temperature;
  if (body.top_p != null) req.top_p = body.top_p;
  if (Array.isArray(body.stop_sequences) && body.stop_sequences.length) req.stop = body.stop_sequences;
  const tools = ((body.tools ?? []) as AnyMsg[]).filter((t) => t.input_schema);
  if (tools.length) {
    req.tools = tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description ?? "", parameters: t.input_schema } }));
    const tc = body.tool_choice;
    if (tc?.type === "any") req.tool_choice = "required";
    else if (tc?.type === "tool") req.tool_choice = { type: "function", function: { name: tc.name } };
    else if (tc?.type === "none") req.tool_choice = "none";
  }
  if (req.stream) req.stream_options = { include_usage: true };
  return req;
}

function stopReason(f?: string | null) {
  if (f === "length") return "max_tokens";
  if (f === "tool_calls" || f === "function_call") return "tool_use";
  return "end_turn";
}

function parseArgs(s: string) {
  try { return s ? JSON.parse(s) : {}; } catch { return { _raw: s }; }
}

const msgId = () => "msg_" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);

export const Route = createFileRoute("/api/public/v1/messages")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const started = Date.now();
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  // VPS: o gate antigo exigia CODECRAFT_API_KEY mesmo sem esse fornecedor; cada fornecedor ativo valida a própria chave.

        const token = (request.headers.get("x-api-key") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "").trim();
        if (!token) return aerr(401, "API key ausente", "authentication_error");

        const { data: key } = await db
          .from("api_keys")
          .select("id, client_id, status, reseller_blocked, plano, reseller_id, token_limit, daily_token_limit, tokens_used, expires_at, rpm_limit, model_family, forced_provider, allowed_models, spam_guard, burst_token_limit, burst_window_minutes, burst_pause_minutes, burst_exempt, clients(status, forced_provider)")
          .eq("key_hash", await sha256Hex(token))
          .maybeSingle();

        const ip = clientIp(request);
        const failures: ProviderFailure[] = [];
        const log = (rawStatus: number, rawExtra: Record<string, unknown> = {}) => { const [status_code, extra] = cancelAware(request, rawStatus, rawExtra); return (
          db.from("request_logs").insert({ api_key_id: key?.id ?? null, client_id: key?.client_id ?? null, status_code, latency_ms: Date.now() - started, client_ip: ip, ...extra, error: routingDiagnostic(typeof extra['error'] === 'string' ? extra['error'] : undefined, failures) })); };

        if (!key) return aerr(401, "API key inválida", "authentication_error");
        const paymentBlockMessage = resellerPaymentBlockMessage(key);
        if (paymentBlockMessage) { await log(403, { error: "key blocked: reseller payment pending" }); return aerr(403, paymentBlockMessage, "permission_error"); }
        const client = key.clients as unknown as { status: string } | null;
        if (client && client.status !== "active") { await log(403, { error: "cliente bloqueado" }); return aerr(403, "Cliente bloqueado", "permission_error"); }
        const exhaustedReply = async () => {
          const b = await request.clone().json().catch(() => ({})) as AnyMsg;
          const m = String(b?.model ?? "claude");
          await log(429, { model: m, error: "limite de tokens" });
          return b?.stream === true ? anthropicExhaustedStream(m) : Response.json(anthropicExhaustedJson(m));
        };
        if (key.status === "exhausted") return exhaustedReply();
        if (key.status !== "active") { await log(403, { error: `key ${key.status}` }); return aerr(403, await blockedKeyMessage(db, key), "permission_error"); }
        if (key.expires_at && new Date(key.expires_at) < new Date()) {
          await db.from("api_keys").update({ status: "expired" }).eq("id", key.id);
          await log(403, { error: "key expirada" });
          return aerr(403, "API key expirada", "permission_error");
        }
        if (key.token_limit != null && key.tokens_used >= key.token_limit) {
          await db.from("api_keys").update({ status: "exhausted" }).eq("id", key.id);
          return exhaustedReply();
        }
        if (key.daily_token_limit != null) {
          const { data: today } = await db.rpc("key_tokens_today", { _key_id: key.id });
          if (Number(today ?? 0) >= key.daily_token_limit) { await log(429, { error: "limite diário de tokens" }); return aerr(429, "Limite de tokens diários do seu plano atingido. Aguarde até a próxima liberação.", "rate_limit_error"); }
        }
        if (keyBurstLimit(key)) {
          const { data: burst } = await db.rpc("check_monthly_burst", { _key_id: key.id });
          const b = Array.isArray(burst) ? burst[0] : burst;
          if (b?.blocked) { await log(429, { error: key.burst_token_limit != null ? "limite de tokens por janela da chave" : "limite de tokens por hora do plano mensal" }); return aerr(429, keyBurstMessage(key, b.paused_until), "rate_limit_error"); }
        }
        // Bloqueio automático: mais de 2 IPs distintos nos últimos 7 dias = compartilhamento da chave
        const { data: ipCount } = await db.rpc("key_ip_count", { _key_id: key.id });
        if ((ipCount ?? 0) > 2) {
          await db.from("api_keys").update({ status: "blocked" }).eq("id", key.id).eq("status", "active");
          await log(403, { error: "bloqueio automático: mais de 2 IPs em 7 dias" });
          return aerr(403, IP_LIMIT_BLOCK_MESSAGE, "permission_error");
        }
        const rpmBlock = rpmRefusal(await checkKeyRpm(db, key.id));
        if (rpmBlock) { await log(429, { error: rpmBlock.log }); return aerr(429, rpmBlock.message, "rate_limit_error"); }

        let body: AnyMsg;
        try { body = await request.json(); } catch { return aerr(400, "JSON inválido"); }
        if (key.spam_guard && await isRepeatedRequest(db, key.id, body)) { await log(429, { error: "pedido repetido" }); return aerr(429, "Pedido repetido em poucos segundos. Aguarde e tente de novo.", "rate_limit_error"); }
        const asked = String(body.model ?? "");

        // Resolve o modelo: exato, depois pela família (opus/sonnet/haiku/fable), depois o opus padrão
        const forcedProvider = keyProvider(key);
        const names = await clientModelNames(db, forcedProvider, key.client_id, asFamily(key.model_family), key.allowed_models ?? null);
        // Modelo fora do plano/nome desconhecido: usa o equivalente mais próximo entre os modelos da chave.
        const picked = pickKeyModel(asked, names, matchModelName(asked, names));
        if (!picked) { await log(400, { model: asked, error: "nenhum modelo habilitado" }); return aerr(400, "Nenhum modelo disponível"); }
        const model = picked.model;

        const oreq = anthropicToOpenAI(body, model);
        const stream = oreq.stream === true;

        // Conversa muito acima do contexto do plano: responde na hora, sem chamar fornecedor.
        const oneMillion = hasOneMillionContext(key);
        const contextLimit = planContextLimit(key);
        const estimatedTokens = estimatePromptTokens(oreq);
        if (shouldBlockBeforeSend(estimatedTokens, contextLimit)) {
          await log(400, { model, stream, error: `conversa acima do contexto do plano (estimativa ${estimatedTokens}, limite ${contextLimit})` });
          return aerr(400, promptTooLongMessage(estimatedTokens, contextLimit, oneMillion), "invalid_request_error");
        }
        const longConversation = (raw = '') => isLongConversation502(estimatedTokens, contextLimit, failures, raw);
        // Conversation too big: answer with the official overflow wording so Claude Code compacts and resends by itself.
        const tooLong = () => promptTooLongMessage(estimatedTokens, contextLimit, oneMillion);

        const upstreamP = fetchUpstream(oreq, request.signal, forcedProvider, failures);
        // Fornecedor escolhido pelo roteador: fica no log para o card de Fornecedores do painel.
        let provider: string | null = null;
        let responseModel = picked.substituted ? model : asked || model;
        let notice: string | null = null;
        void upstreamP.then((r) => { provider = r.provider; if (r.upstreamModel === OUTAGE_COMBO) responseModel = OUTAGE_COMBO; else responseModel = reserveLabel(r.provider, model) ?? responseModel; }).catch(() => {});

        const finish = async (u: Parameters<typeof billedUsage>[0], status: number, error?: string) => {
          // Cache lido conta só uma fração no consumo da chave (cache-billing); o fornecedor recebe o uso bruto.
          const b = billedUsage(u);
          await log(status, { model, stream, prompt_tokens: b.prompt_tokens, completion_tokens: b.completion_tokens, total_tokens: b.total_tokens, cached_tokens: b.cached_tokens, cache_write_tokens: b.cache_write_tokens, cache_discount_tokens: b.cache_discount_tokens, error: error ?? null, provider });
          if (status < 400) await db.rpc("record_key_usage", { _key_id: key.id, _tokens: b.total_tokens });
          await upstreamP.then((r) => r.onUsage(b.raw_total_tokens, cancelAware(request, status)[0], error)).catch(() => {});
        };

        // Streaming: abre a resposta na hora e mantém viva com "ping" enquanto o provedor (lento) pensa,
        // assim o Claude Code não estoura o tempo de espera.
        if (stream) {
          const encE = new TextEncoder();
          const early = new ReadableStream<Uint8Array>({
            async start(ctrl) {
              const send = (event: string, data: unknown) => ctrl.enqueue(encE.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
              send("ping", { type: "ping" });
              const timer = setInterval(() => { try { send("ping", { type: "ping" }); } catch { /* fechado */ } }, 5000);
              let up: Response;
              try { up = (await upstreamP).res; } catch (e) {
                clearInterval(timer);
                await log(502, { model, stream, provider, error: String(e).slice(0, 500) });
                send("error", { type: "error", error: longConversation() ? { type: "invalid_request_error", message: tooLong() } : { type: "api_error", message: client502Message(false, oneMillion) } });
                ctrl.close(); return;
              }
              clearInterval(timer);
              if (!up.ok) {
                const text = await up.text();
                await finish(null, up.status, text.slice(0, 500));
                const safe = clientUpstreamError(up.status, text, oneMillion, longConversation(text));
                send("error", { type: "error", error: longConversation(text) ? { type: "invalid_request_error", message: tooLong() } : { type: anthropicErrorType(safe), message: safe.message } });
                ctrl.close(); return;
              }
              send("message_start", { type: "message_start", message: { id: msgId(), type: "message", role: "assistant", model: responseModel, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } } });
              if (notice) {
                send('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } });
                send('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: notice + '\n\n' } });
                send('content_block_stop', { type: 'content_block_stop', index: 0 });
              }
              const inner = streamFrom(up, true).getReader();
              for (;;) { const { done, value } = await inner.read(); if (done) break; ctrl.enqueue(value); }
              ctrl.close();
            },
          });
          return new Response(early, { headers: { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
        }

        let upstream: Response;
        try { upstream = (await upstreamP).res; } catch (e) {
          await log(502, { model, stream, error: String(e).slice(0, 500) });
          if (longConversation()) return aerr(400, tooLong(), "invalid_request_error");
          return aerr(502, client502Message(false, oneMillion), "api_error");
        }


        if (!upstream.ok) {
          const text = await upstream.text();
          await finish(null, upstream.status, text.slice(0, 500));
          // O cliente nunca recebe o erro bruto do fornecedor; o log acima guarda o original.
          if (longConversation(text)) return aerr(400, tooLong(), "invalid_request_error");
          const safe = clientUpstreamError(upstream.status, text, oneMillion, longConversation(text));
          return aerr(safe.status, safe.message, anthropicErrorType(safe));
        }

        if (!stream) {
          const json = await upstream.json();
          const ch = json?.choices?.[0] ?? {};
          const content: Block[] = [];
          if (notice) content.push({ type: 'text', text: notice });
          if (ch.message?.content) content.push({ type: "text", text: ch.message.content });
          for (const tc of ch.message?.tool_calls ?? []) {
            content.push({ type: "tool_use", id: tc.id || "toolu_" + crypto.randomUUID().slice(0, 12), name: tc.function?.name, input: parseArgs(tc.function?.arguments ?? "") });
          }
          await finish(json?.usage ?? null, 200);
          return Response.json({
            id: msgId(), type: "message", role: "assistant", model: responseModel, content,
            stop_reason: stopReason(ch.finish_reason), stop_sequence: null,
            usage: anthropicUsage(json?.usage),
          }, { headers: CORS });
        }

        return aerr(500, "Estado inesperado", "api_error");

        // Streaming: converte SSE OpenAI -> eventos Anthropic
        function streamFrom(upstream: Response, skipStart: boolean) {
        const enc = new TextEncoder();
        const dec = new TextDecoder();
        if (!upstream.body) throw new Error('Resposta vazia do provedor');
        const reader = upstream.body.getReader();
        const out = new ReadableStream<Uint8Array>({
          async start(ctrl) {
            const send = (event: string, data: unknown) => ctrl.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            if (!skipStart) send("message_start", { type: "message_start", message: { id: msgId(), type: "message", role: "assistant", model: responseModel, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } } });
            let idx = notice ? 0 : -1;
            let open: "text" | "tool" | null = null;
            const toolIdx = new Map<number, number>();
            let finishReason: string | null = null;
            let usage: AnyMsg = null;
            let upErr: string | null = null;
            const close = () => { if (open) { send("content_block_stop", { type: "content_block_stop", index: idx }); open = null; } };
            let buf = "";
            try {
              for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop() ?? "";
                for (const line of lines) {
                  if (!line.startsWith("data:")) continue;
                  const d = line.slice(5).trim();
                  if (!d || d === "[DONE]") continue;
                  let j: AnyMsg;
                  try { j = JSON.parse(d); } catch { continue; }
                  if (j.error) {
                    const msg = "Serviço temporariamente indisponível. Tente novamente em alguns minutos.";
                    send("error", { type: "error", error: { type: "overloaded_error", message: msg } });
                    upErr = String(j.error?.message ?? "stream error").slice(0, 500);
                    continue;
                  }
                  if (j.usage) usage = j.usage;
                  const ch = j.choices?.[0];
                  if (!ch) continue;
                  const delta = ch.delta ?? {};
                  if (typeof delta.content === "string" && delta.content) {
                    if (open !== "text") {
                      close(); idx++; open = "text";
                      send("content_block_start", { type: "content_block_start", index: idx, content_block: { type: "text", text: "" } });
                    }
                    send("content_block_delta", { type: "content_block_delta", index: idx, delta: { type: "text_delta", text: delta.content } });
                  }
                  for (const tc of delta.tool_calls ?? []) {
                    const ti = tc.index ?? 0;
                    if (!toolIdx.has(ti)) {
                      close(); idx++; open = "tool"; toolIdx.set(ti, idx);
                      send("content_block_start", { type: "content_block_start", index: idx, content_block: { type: "tool_use", id: tc.id || "toolu_" + crypto.randomUUID().slice(0, 12), name: tc.function?.name ?? "", input: {} } });
                    }
                    const args = tc.function?.arguments;
                    if (args) send("content_block_delta", { type: "content_block_delta", index: toolIdx.get(ti), delta: { type: "input_json_delta", partial_json: args } });
                  }
                  if (ch.finish_reason) finishReason = ch.finish_reason;
                }
              }
              close();
              if (upErr) { await finish(null, 503, upErr); ctrl.close(); return; }
              send("message_delta", { type: "message_delta", delta: { stop_reason: stopReason(finishReason), stop_sequence: null }, usage: anthropicUsage(usage) });
              send("message_stop", { type: "message_stop" });
              await finish(usage, 200);
            } catch (e) {
              send("error", { type: "error", error: { type: "api_error", message: "Conexão com o provedor interrompida" } });
              await finish(usage, 502, String(e).slice(0, 500));
            }
            ctrl.close();
          },
          cancel() { reader.cancel().catch(() => {}); },
        });
        return out;
        }
      },
    },
  },
});
