export type InferenceResult = {
  ok: boolean;
  status: number | null;
  latencyMs: number;
  model: string;
  reply: string;
  error: string | null;
};

export function inferenceRequest(base: string, type: string, model: string) {
  const anthropic = type === "Anthropic";
  return {
    url: `${base.replace(/\/+$/, "")}/${anthropic ? "messages" : "chat/completions"}`,
    // Workers support manual/follow, not error. Never forward credentials on redirects.
    redirect: "manual" as const,
    anthropic,
    body: { model, messages: [{ role: "user", content: "oi" }], max_tokens: 1024, stream: false },
  };
}

export function sanitizeInferenceText(value: string, credential: string) {
  const redacted = credential ? value.split(credential).join("[credencial omitida]") : value;
  return redacted
    .replace(/Bearer\s+\S+/gi, "Bearer [credencial omitida]")
    .replace(/\b(?:sk-|sub_live_)[A-Za-z0-9_-]+/g, "[credencial omitida]")
    .replace(/\b(token|api[_-]?key|authorization|password|secret)\s*[:=]\s*[^\s,;]+/gi, "$1=[credencial omitida]")
    .replace(/https?:\/\/[^\s)]+/gi, "[endereço omitido]")
    .slice(0, 2000);
}

export function inferencePayload(payload: unknown) {
  const row = payload && typeof payload === "object" ? payload as {
    choices?: { message?: { content?: string } }[];
    content?: { type?: string; text?: string }[];
    error?: string | { message?: string };
    message?: string;
    model?: string;
  } : {};
  const reply = typeof row.choices?.[0]?.message?.content === "string"
    ? row.choices[0].message.content
    : Array.isArray(row.content)
      ? row.content.filter((part) => part?.type === "text" && typeof part.text === "string").map((part) => part.text).join("\n")
      : "";
  const error = typeof row.error === "object" && typeof row.error?.message === "string" ? row.error.message
    : typeof row.error === "string" ? row.error
    : typeof row.message === "string" ? row.message : "";
  return { reply, error, model: typeof row.model === "string" ? row.model : "" };
}

export function inferenceEmptyReplyError(payload: unknown) {
  const row = payload && typeof payload === "object" ? payload as {
    choices?: { finish_reason?: string }[];
    stop_reason?: string;
  } : {};
  if (row.choices?.[0]?.finish_reason === "length" || row.stop_reason === "max_tokens") {
    return "O fornecedor atingiu o limite de tokens do teste antes de devolver texto; isso não confirma indisponibilidade.";
  }
  return "O fornecedor respondeu sem texto.";
}