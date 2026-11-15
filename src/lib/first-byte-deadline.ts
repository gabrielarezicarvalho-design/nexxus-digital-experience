// Deadline for a supplier to START answering a streamed request. Once the first byte of the
// body arrives the timer is cleared, so answers already flowing are never cut.

export const FIRST_BYTE_DEADLINE_MS = 60_000;
/** Providers whose streamed requests get the deadline and one identical retry. */
export const FIRST_BYTE_DEADLINE_PROVIDERS = new Set(["Anthropic Revenda"]);
export const FIRST_BYTE_RETRIES = 1;

export function firstByteDeadlineApplies(provider: string, body: unknown): boolean {
  return FIRST_BYTE_DEADLINE_PROVIDERS.has(provider) && (body as { stream?: unknown } | null)?.stream === true;
}

export function firstByteTimeoutBody(provider: string, ms: number, attempts: number): string {
  return JSON.stringify({ error: { message: `${provider} did not start answering within ${Math.round(ms / 1000)}s (${attempts} attempts)`, type: "upstream_timeout", code: "first_byte_timeout" } });
}

/**
 * Calls `send` with its own abort signal (also aborted when `outer` aborts). Resolves with the
 * response once its first body chunk arrives, or `null` when nothing arrived within `ms`.
 */
export async function fetchWithFirstByteDeadline(
  send: (signal: AbortSignal) => Promise<Response>,
  ms: number,
  outer?: AbortSignal,
): Promise<Response | null> {
  if (outer?.aborted) throw outer.reason;
  const controller = new AbortController();
  const forward = () => controller.abort(outer?.reason);
  outer?.addEventListener("abort", forward, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(new Error("first_byte_timeout")); }, ms);
  const settle = () => clearTimeout(timer);
  try {
    const res = await send(controller.signal);
    if (!res.body) { settle(); return res; }
    const reader = res.body.getReader();
    const first = await reader.read();
    settle();
    let pending: Uint8Array | undefined = first.done ? undefined : first.value;
    const done = first.done;
    const body = new ReadableStream<Uint8Array>({
      async pull(c) {
        if (pending) { c.enqueue(pending); pending = undefined; return; }
        if (done) { c.close(); outer?.removeEventListener("abort", forward); return; }
        try {
          const next = await reader.read();
          if (next.done) { c.close(); outer?.removeEventListener("abort", forward); } else c.enqueue(next.value);
        } catch (error) { c.error(error); }
      },
      cancel(reason) { outer?.removeEventListener("abort", forward); return reader.cancel(reason); },
    });
    return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
  } catch (error) {
    settle();
    if (timedOut && !outer?.aborted) { outer?.removeEventListener("abort", forward); return null; }
    throw error;
  }
}
