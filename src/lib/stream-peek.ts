// Some suppliers answer HTTP 200 and then send only an SSE error event.
// Before any content reaches the client, read ahead until the first real delta: an error
// first means the attempt failed (so the router can fail over); otherwise the buffered
// bytes are replayed unchanged in front of the rest of the stream.
const MAX_PEEK_BYTES = 256 * 1024;

// A supplier can answer HTTP 200 with a stream that ends (finish_reason/[DONE]) without any text,
// reasoning or tool call while still reporting completion tokens. With requireContent such a
// stream is a failed attempt; emptyBody builds the failure body (e.g. with the supplier's request id).
export type PeekOptions = { requireContent?: boolean; emptyBody?: (usage: { completion_tokens?: number } | null) => string };

export type PeekResult = { ok: true; body: ReadableStream<Uint8Array> } | { ok: false; status: number; errorText: string };

type Verdict = "content" | "end" | { error: string; status: number } | null;

function inspectLine(line: string, usage: { value: any }): Verdict {
  if (!line.startsWith("data:")) return null;
  const d = line.slice(5).trim();
  if (!d) return null;
  if (d === "[DONE]") return "end";
  let j: any;
  try { j = JSON.parse(d); } catch { return null; }
  if (j?.error) {
    const code = Number(j.error?.status ?? j.error?.code ?? j.status);
    return { error: JSON.stringify({ error: j.error }), status: code >= 400 && code < 600 ? code : 503 };
  }
  if (j?.type === "error") return { error: JSON.stringify(j), status: 503 };
  if (j?.usage) usage.value = j.usage;
  const ch = j?.choices?.[0];
  if (!ch) return null;
  const delta = ch.delta ?? {};
  if ((typeof delta.content === "string" && delta.content) || (typeof delta.reasoning_content === "string" && delta.reasoning_content)
    || (typeof delta.reasoning === "string" && delta.reasoning) || delta.tool_calls?.length || delta.function_call) return "content";
  if (ch.finish_reason) return "end";
  return null;
}

export async function peekStreamStart(body: ReadableStream<Uint8Array>, options: PeekOptions = {}): Promise<PeekResult> {
  const usage = { value: null as any };
  const emptyFailure = (): PeekResult => ({ ok: false, status: 502, errorText: options.emptyBody?.(usage.value) ?? JSON.stringify({ error: { message: "empty answer" } }) });
  const reader = body.getReader();
  const dec = new TextDecoder();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let buf = "";
  const replay = (): PeekResult => ({
    ok: true,
    body: new ReadableStream<Uint8Array>({
      start(c) { for (const ch of chunks) c.enqueue(ch); },
      async pull(c) {
        const { done, value } = await reader.read();
        if (done) c.close(); else c.enqueue(value);
      },
      cancel(reason) { return reader.cancel(reason); },
    }),
  });
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      const v = inspectLine(buf.trim(), usage);
      if (v && typeof v === "object") return { ok: false, status: v.status, errorText: v.error };
      if (!size) return { ok: false, status: 502, errorText: "empty stream" };
      if (options.requireContent && v !== "content") return emptyFailure();
      return { ok: true, body: new ReadableStream({ start(c) { for (const ch of chunks) c.enqueue(ch); c.close(); } }) };
    }
    chunks.push(value);
    size += value.byteLength;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const [index, line] of lines.entries()) {
      const v = inspectLine(line.trim(), usage);
      if (v === "content") return replay();
      if (v === "end") {
        if (!options.requireContent) return replay();
        // Ended with nothing: read the rest (usage chunk, [DONE]) so the failure can cite it.
        let rest = lines.slice(index + 1).join("\n") + "\n" + buf;
        for (let extra = 0; extra < MAX_PEEK_BYTES;) {
          const next = await reader.read();
          if (next.done) break;
          extra += next.value.byteLength;
          rest += dec.decode(next.value, { stream: true });
        }
        await reader.cancel().catch(() => {});
        for (const tail of rest.split("\n")) inspectLine(tail.trim(), usage);
        return emptyFailure();
      }
      if (v) { await reader.cancel().catch(() => {}); return { ok: false, status: v.status, errorText: v.error }; }
    }
    if (size > MAX_PEEK_BYTES) return replay();
  }
}

// Some suppliers append an SSE error event after a complete answer (finish_reason already
// sent). The answer is whole, so that trailing error is dropped instead of failing the request.
export function dropErrorAfterFinish(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let buf = "";
  let finished = false;
  const filter = (line: string): boolean => {
    const t = line.trim();
    if (!t.startsWith("data:")) return true;
    const d = t.slice(5).trim();
    if (!d || d === "[DONE]") return true;
    let j: any;
    try { j = JSON.parse(d); } catch { return true; }
    if (j?.choices?.[0]?.finish_reason) finished = true;
    return !(finished && (j?.error || j?.type === "error"));
  };
  return body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctrl) {
      buf += dec.decode(chunk, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      const kept = lines.filter(filter);
      if (kept.length) ctrl.enqueue(enc.encode(kept.map((l) => l + "\n").join("")));
    },
    flush(ctrl) {
      buf += dec.decode();
      if (buf && filter(buf)) ctrl.enqueue(enc.encode(buf));
    },
  }));
}
