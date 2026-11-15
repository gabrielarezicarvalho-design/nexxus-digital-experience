import { expect, test } from "bun:test";
import { inferenceRequest, inferencePayload, inferenceEmptyReplyError, sanitizeInferenceText } from "./provider-inference";

test("direct test sends exactly oi to the selected provider and model", () => {
  const request = inferenceRequest("https://selected.example/v1/", "OpenAI", "claude-opus-4.8");
  expect(request.url).toBe("https://selected.example/v1/chat/completions");
  expect(request.body).toEqual({ model: "claude-opus-4.8", messages: [{ role: "user", content: "oi" }], max_tokens: 1024, stream: false });
});

test("published runtime accepts manual redirects and never forwards credentials automatically", () => {
  const probe = inferenceRequest("https://selected.example/v1", "Anthropic", "claude");
  expect(probe.redirect).toBe("manual");
  expect(new Request(probe.url, { redirect: probe.redirect }).redirect).toBe("manual");
});

test("Anthropic test keeps selected generic claude on Messages", () => {
  const request = inferenceRequest("https://selected.example/v1", "Anthropic", "claude");
  expect(request.url).toBe("https://selected.example/v1/messages");
  expect(request.body.model).toBe("claude");
});

test("test reads actual returned model and text in both protocols", () => {
  expect(inferencePayload({ model: "actual-model", choices: [{ message: { content: "Oi!" } }] })).toEqual({ reply: "Oi!", error: "", model: "actual-model" });
  expect(inferencePayload({ model: "different-model", content: [{ type: "text", text: "Olá" }] }).model).toBe("different-model");
  expect(inferencePayload({ error: { message: "service_upgrading" } }).error).toBe("service_upgrading");
  expect(inferencePayload({ choices: [] }).reply).toBe("");
});

test("provider results never expose the configured credential", () => {
  expect(sanitizeInferenceText("echo private-test-value; Bearer other-value sk-example-value", "private-test-value")).toBe("echo [credencial omitida]; Bearer [credencial omitida] [credencial omitida]");
});

test("reasoning models get a bounded 1024 token budget in both protocols", () => {
  expect(inferenceRequest("https://selected.example/v1", "OpenAI", "claude-opus-4.8").body.max_tokens).toBe(1024);
  expect(inferenceRequest("https://selected.example/v1", "Anthropic", "claude").body.max_tokens).toBe(1024);
});

test("empty reply caused by token exhaustion is distinct from an empty successful response", () => {
  expect(inferenceEmptyReplyError({ choices: [{ finish_reason: "length", message: { content: null } }] }).includes("limite de tokens")).toBe(true);
  expect(inferenceEmptyReplyError({ stop_reason: "max_tokens" }).includes("limite de tokens")).toBe(true);
  expect(inferenceEmptyReplyError({ choices: [{ finish_reason: "stop" }] })).toBe("O fornecedor respondeu sem texto.");
});