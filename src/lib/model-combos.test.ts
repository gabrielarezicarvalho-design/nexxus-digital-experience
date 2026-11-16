import { expect, test } from "bun:test";
import { comboNameProblem, comboOrder } from "./model-combos";

test("nome livre para combos da marca", () => {
  expect(comboNameProblem("turbo")).toBeNull();
  expect(comboNameProblem("nexa-max-2", [{ provider: "Free.ai", model: "qwen-coder" }])).toBeNull();
  expect(comboNameProblem("flash.pro_1", [{ provider: "Free.ai", model: "deepseek/deepseek-v4.1-flash-1017" }])).toBeNull();
  expect(comboNameProblem("A")).not.toBeNull();
  expect(comboNameProblem("nexa-reserva")).not.toBeNull();
});

test("nome de Claude só com Claude de verdade", () => {
  expect(comboNameProblem("claude-opus-5-5", [{ provider: "DevHub Brasil", model: "claude-opus-5.5" }, { provider: "DevHub Brasil", model: "claude-opus-5" }])).toBeNull();
  expect(comboNameProblem("claude-opus-4-8", [{ provider: "Free.ai", model: "deepseek/deepseek-v4.1-flash-1017" }])).not.toBeNull();
  expect(comboNameProblem("opus-turbo", [{ provider: "DevHub Brasil", model: "claude-opus-5.5" }, { provider: "Free.ai", model: "qwen-coder" }])).not.toBeNull();
  // 9Router: nomes claude-* que não são Claude
  expect(comboNameProblem("claude-sonnet-5-5", [{ provider: "Anthropic Revenda", model: "claude-sonnet-5-5" }])).not.toBeNull();
});

test("nome de GPT ou Gemini só com GPT ou Gemini", () => {
  expect(comboNameProblem("gpt-6", [{ provider: "DevHub Brasil", model: "gpt-6" }])).toBeNull();
  expect(comboNameProblem("gpt-6", [{ provider: "Free.ai", model: "qwen-coder" }])).not.toBeNull();
  expect(comboNameProblem("gemini-flash", [{ provider: "DevHub Brasil", model: "gemini-3.7-flash" }])).toBeNull();
  expect(comboNameProblem("gemini-flash", [{ provider: "Free.ai", model: "deepseek/deepseek-v4.1-flash-1017" }])).not.toBeNull();
});

test("fallback mantém a ordem e rodízio começa em um item diferente a cada vez", () => {
  expect(comboOrder([1, 2, 3], "fallback", 5)).toEqual([1, 2, 3]);
  expect(comboOrder([1, 2, 3], "round_robin", 1)).toEqual([2, 3, 1]);
});
