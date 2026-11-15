// SubtoAPI exposes deployment tiers, not versioned Claude model identifiers.
export const SUBTOAPI_TIERS = ["fast", "balanced", "best"] as const;
// Public aliases (claude-fast etc.) let Claude-only clients discover the same tiers.
export const subtoapiTier = (model: string) => {
  const name = model.startsWith("claude-") ? model.slice(7) : model;
  return SUBTOAPI_TIERS.find((tier) => tier === name);
};
export const isSubtoapiTier = (model: string) => subtoapiTier(model) !== undefined;

// Protocol payloads are validated by the upstream and the authenticated API routes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Payload = any;

export function subtoapiRequest(body: Payload): Payload {
  const messages: Payload[] = [];
  const system: string[] = [];
  for (const message of body.messages ?? []) {
    if (message.role === "system" || message.role === "developer") {
      system.push(String(message.content ?? ""));
      continue;
    }
    if (message.role === "tool") {
      messages.push({ role: "user", content: [{ type: "tool_result", tool_use_id: message.tool_call_id, content: message.content ?? "" }] });
      continue;
    }
    const content: Payload[] = typeof message.content === "string"
      ? [{ type: "text", text: message.content }]
      : (message.content ?? []).map((part: Payload) => {
          if (part.type !== "image_url") return part;
          const url = part.image_url?.url ?? "";
          const match = /^data:([^;]+);base64,(.*)$/.exec(url);
          return { type: "image", source: match ? { type: "base64", media_type: match[1], data: match[2] } : { type: "url", url } };
        });
    for (const call of message.tool_calls ?? []) {
      content.push({ type: "tool_use", id: call.id, name: call.function.name, input: JSON.parse(call.function.arguments || "{}") });
    }
    messages.push({ role: message.role, content });
  }
  // SubtoAPI's upstream stream fails with provider_error; always request a complete response.
  const request: Payload = { model: body.model, messages, stream: false };
  if (system.length) request.system = system.join("\n");
  for (const field of ["max_tokens", "temperature", "top_p"]) if (body[field] != null) request[field] = body[field];
  if (body.stop) request.stop_sequences = Array.isArray(body.stop) ? body.stop : [body.stop];
  if (body.tools?.length) request.tools = body.tools.map((tool: Payload) => ({ name: tool.function.name, description: tool.function.description, input_schema: tool.function.parameters }));
  if (body.tool_choice) request.tool_choice = body.tool_choice === "required" ? { type: "any" } : typeof body.tool_choice === "string" ? { type: body.tool_choice } : { type: "tool", name: body.tool_choice.function.name };
  return request;
}

export function subtoapiCompletion(payload: Payload, model: string): Payload {
  const content = payload.content ?? [];
  const tools = content.filter((block: Payload) => block.type === "tool_use");
  const usage = payload.usage ?? {};
  const prompt = (usage.input_tokens ?? 0) + (usage.cache_read_tokens ?? 0) + (usage.cache_write_tokens ?? 0);
  return {
    id: payload.id ?? `chatcmpl_${crypto.randomUUID()}`, object: "chat.completion", model,
    choices: [{ index: 0, message: { role: "assistant", content: content.filter((block: Payload) => block.type === "text").map((block: Payload) => block.text).join(""), ...(tools.length ? { tool_calls: tools.map((block: Payload) => ({ id: block.id, type: "function", function: { name: block.name, arguments: JSON.stringify(block.input ?? {}) } })) } : {}) }, finish_reason: payload.stop_reason === "refusal" ? "refusal" : tools.length ? "tool_calls" : payload.stop_reason === "max_tokens" ? "length" : "stop" }],
    usage: { prompt_tokens: prompt, completion_tokens: usage.output_tokens ?? 0, total_tokens: usage.total_tokens ?? prompt + (usage.output_tokens ?? 0) },
  };
}

export async function fetchSubtoapi(base: string, key: string, body: Payload, signal?: AbortSignal): Promise<Response> {
  const upstream = await fetch(`${base.replace(/\/$/, "")}/messages`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(subtoapiRequest(body)), signal: signal ?? null,
  });
  if (!upstream.ok) {
    const text = await upstream.text();
    let message = "Não foi possível responder agora.";
    try { const error = JSON.parse(text); message = error.message ?? error.error?.message ?? message; } catch { /* retain safe fallback */ }
    return Response.json({ error: { message, type: upstream.status === 403 ? "permission_error" : "api_error" } }, { status: upstream.status });
  }
  const response = subtoapiCompletion(await upstream.json(), body.model);
  if (!body.stream) return Response.json(response);
  // Synthesize OpenAI-style SSE from the complete response.
  const choice = response.choices[0];
  const encoder = new TextEncoder();
  const frame = (data: unknown) => `data: ${JSON.stringify(data)}\n\n`;
  const text = frame({ id: response.id, model: body.model, object: "chat.completion.chunk", choices: [{ index: 0, delta: { ...choice.message, ...(choice.message.tool_calls ? { tool_calls: choice.message.tool_calls.map((call: Payload, index: number) => ({ ...call, index })) } : {}) }, finish_reason: null }] })
    + frame({ id: response.id, model: body.model, object: "chat.completion.chunk", choices: [{ index: 0, delta: {}, finish_reason: choice.finish_reason }], usage: response.usage })
    + "data: [DONE]\n\n";
  return new Response(encoder.encode(text), { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform" } });
}