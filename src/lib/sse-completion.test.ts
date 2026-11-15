import { expect, test } from "bun:test";
import { sseToCompletion } from "./sse-completion";

const sse = [
  'data: {"id":"x","created":1,"model":"m","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}',
  'data: {"id":"x","created":1,"model":"m","choices":[{"index":0,"delta":{"content":"Oi! "},"finish_reason":null}]}',
  'data: {"id":"x","created":1,"model":"m","choices":[{"index":0,"delta":{"content":"Tudo bem?"},"finish_reason":null}]}',
  'data: {"id":"x","created":1,"model":"m","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":3,"completion_tokens":4,"total_tokens":7}}',
  "data: [DONE]", "",
].join("\n\n");

test("resposta em pedaços vira uma resposta única com texto e consumo", () => {
  const j = sseToCompletion(sse) as any;
  expect(j.object).toBe("chat.completion");
  expect(j.choices[0].message.content).toBe("Oi! Tudo bem?");
  expect(j.choices[0].finish_reason).toBe("stop");
  expect(j.usage.total_tokens).toBe(7);
});

test("chamadas de ferramenta em pedaços são juntadas", () => {
  const t = [
    'data: {"id":"x","choices":[{"delta":{"tool_calls":[{"index":0,"id":"c1","type":"function","function":{"name":"ler","arguments":"{\\"a\\""}}]}}]}',
    'data: {"id":"x","choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":":1}"}}]},"finish_reason":"tool_calls"}]}',
  ].join("\n");
  const j = sseToCompletion(t) as any;
  expect(j.choices[0].message.tool_calls[0].function).toEqual({ name: "ler", arguments: '{"a":1}' });
  expect(j.choices[0].finish_reason).toBe("tool_calls");
});

test("texto que não é SSE continua inválido", () => {
  expect(sseToCompletion("garbage")).toBeNull();
});
