import { expect, test } from "bun:test";
import { peekStreamStart } from "./stream-peek";

const sse = (...events: string[]) => new ReadableStream<Uint8Array>({ start(c) { for (const e of events) c.enqueue(new TextEncoder().encode(e)); c.close(); } });

test("error event before any content is a failed attempt", async () => {
  const r = await peekStreamStart(sse('data: {"choices":[{"delta":{"role":"assistant","content":""}}]}\n\n', 'data: {"error":{"message":"The model provider could not complete this request."}}\n\n'));
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.status).toBe(503);
});

test("content first replays every byte unchanged", async () => {
  const parts = ['data: {"choices":[{"delta":{"content":"o"}}]}\n\n', 'data: {"choices":[{"delta":{"content":"k"}}]}\n\ndata: [DONE]\n\n'];
  const r = await peekStreamStart(sse(...parts));
  expect(r.ok).toBe(true);
  if (r.ok) expect(await new Response(r.body).text()).toBe(parts.join(""));
});

test("empty stream is a failed attempt", async () => {
  expect((await peekStreamStart(sse())).ok).toBe(false);
});

import { dropErrorAfterFinish } from "./stream-peek";

test("error event after a finished answer is dropped, the answer stays whole", async () => {
  const body = sse('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n', 'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
    'data: {"type":"error","error":{"message":"The model provider could not complete this request."}}\n\ndata: [DONE]\n\n');
  const text = await new Response(dropErrorAfterFinish(body)).text();
  expect(text.includes('"error"')).toBe(false);
  expect(text.includes('"content":"ok"')).toBe(true);
  expect(text.includes("[DONE]")).toBe(true);
});

test("error event before the answer finishes is kept", async () => {
  const body = sse('data: {"choices":[{"delta":{"content":"o"}}]}\n\n', 'data: {"error":{"message":"cut"}}\n\n');
  expect((await new Response(dropErrorAfterFinish(body)).text()).includes('"error"')).toBe(true);
});

// Empty supplier reply: role chunk, finish "stop", usage with 103 completion tokens, no text.
const emptyReply = [
  'data: {"choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}\n\n',
  'data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
  'data: {"choices":[],"usage":{"prompt_tokens":2304,"completion_tokens":103,"total_tokens":2407}}\n\ndata: [DONE]\n\n',
];

test("with requireContent a stream that ends without text is a failed attempt citing its usage", async () => {
  const r = await peekStreamStart(sse(...emptyReply), { requireContent: true, emptyBody: (u) => `empty ${u?.completion_tokens}` });
  expect(r.ok).toBe(false);
  if (!r.ok) { expect(r.status).toBe(502); expect(r.errorText).toBe("empty 103"); }
});

test("without requireContent the same stream still passes through unchanged", async () => {
  const r = await peekStreamStart(sse(...emptyReply));
  expect(r.ok).toBe(true);
  if (r.ok) expect(await new Response(r.body).text()).toBe(emptyReply.join(""));
});

test("with requireContent a streamed tool call is delivered", async () => {
  const parts = ['data: {"choices":[{"delta":{"role":"assistant","content":""}}]}\n\n', 'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"c1","function":{"name":"read_file","arguments":""}}]}}]}\n\n', 'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}\n\ndata: [DONE]\n\n'];
  const r = await peekStreamStart(sse(...parts), { requireContent: true });
  expect(r.ok).toBe(true);
  if (r.ok) expect(await new Response(r.body).text()).toBe(parts.join(""));
});
