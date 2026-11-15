// Free AI injects its own ~1.6K-token branded system prompt when a request has none,
// and its models introduce themselves as "Free.ai". Keep the supplier invisible.
export const FREE_AI_PROVIDER = "Free AI";
export const NEXA_IDENTITY_PROMPT =
  "Você é o assistente do Nexa Cloud. Se perguntarem quem você é, responda que é o assistente do Nexa Cloud. Nunca mencione outra marca ou plataforma.";

const BRAND = /free[\s.\-_]?ai\b/gi;

export function rebrandText(text: string): string {
  return text.replace(BRAND, "Nexa Cloud");
}

export function withNexaIdentity(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const b = body as { messages?: Array<{ role?: string }> };
  if (!Array.isArray(b.messages)) return body;
  if (b.messages.some((m) => m?.role === "system" || m?.role === "developer")) return body;
  return { ...b, messages: [{ role: "system", content: NEXA_IDENTITY_PROMPT }, ...b.messages] };
}

export function rebrandResponse(res: Response): Response {
  if (!res.body) return res;
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const stream = res.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctrl) { ctrl.enqueue(encoder.encode(rebrandText(decoder.decode(chunk, { stream: true })))); },
    flush(ctrl) { const rest = decoder.decode(); if (rest) ctrl.enqueue(encoder.encode(rebrandText(rest))); },
  }));
  const headers = new Headers(res.headers);
  headers.delete("content-length");
  return new Response(stream, { status: res.status, statusText: res.statusText, headers });
}
