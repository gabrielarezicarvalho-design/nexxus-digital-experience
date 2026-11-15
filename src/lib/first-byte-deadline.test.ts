import { describe, expect, test } from "bun:test";
import { fetchWithFirstByteDeadline, firstByteDeadlineApplies, FIRST_BYTE_DEADLINE_MS, FIRST_BYTE_RETRIES } from "./first-byte-deadline";

const enc = new TextEncoder();
function hanging(signal: AbortSignal): Promise<Response> {
  return new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason)));
}

describe("prazo para a Anthropic começar a responder", () => {
  test("prazo é 60 segundos com uma nova tentativa", () => {
    expect(FIRST_BYTE_DEADLINE_MS).toBe(60_000);
    expect(FIRST_BYTE_RETRIES).toBe(1);
  });

  test("vale só para pedidos em streaming da Anthropic Revenda", () => {
    expect(firstByteDeadlineApplies("Anthropic Revenda", { stream: true })).toBe(true);
    expect(firstByteDeadlineApplies("Anthropic Revenda", { stream: false })).toBe(false);
    expect(firstByteDeadlineApplies("Reserva Teste", { stream: true })).toBe(false);
  });

  test("sem nenhum byte dentro do prazo, cancela e devolve null", async () => {
    let aborted = false;
    const res = await fetchWithFirstByteDeadline((s) => { s.addEventListener("abort", () => { aborted = true; }); return hanging(s); }, 30);
    expect(res).toBe(null);
    expect(aborted).toBe(true);
  });

  test("resposta que já começou não é cortada depois do prazo", async () => {
    const stream = new ReadableStream<Uint8Array>({
      async start(c) {
        c.enqueue(enc.encode("data: a\n\n"));
        await new Promise((r) => setTimeout(r, 80));
        c.enqueue(enc.encode("data: b\n\n"));
        c.close();
      },
    });
    let aborted = false;
    const res = await fetchWithFirstByteDeadline(async (s) => { s.addEventListener("abort", () => { aborted = true; }); return new Response(stream, { status: 200 }); }, 30);
    expect(res === null).toBe(false);
    expect(await res!.text()).toBe("data: a\n\ndata: b\n\n");
    expect(aborted).toBe(false);
  });

  test("cancelamento pelo cliente continua lançando erro", async () => {
    const outer = new AbortController();
    const p = fetchWithFirstByteDeadline(hanging, 1000, outer.signal);
    outer.abort(new Error("cliente saiu"));
    const message = await p.then(() => "resolveu", (e: unknown) => String((e as Error)?.message ?? e));
    expect(message).toBe("cliente saiu");
  });
});
