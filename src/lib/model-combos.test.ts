import { expect, test } from "bun:test";
import { comboNameProblem, comboOrder, isComboName } from "./model-combos";

test("nomes de combo válidos são da marca Nexa", () => {
  expect(comboNameProblem("nexa-turbo")).toBeNull();
  expect(comboNameProblem("nexa-max-2")).toBeNull();
  expect(comboNameProblem("turbo")).not.toBeNull();
  expect(comboNameProblem("nexa-reserva")).not.toBeNull();
});

test("combo nunca usa nome de modelo de outra empresa", () => {
  for (const n of ["nexa-claude-opus", "nexa-opus-5-5", "nexa-gpt-6", "nexa-gemini", "nexa-sonnet"]) expect(comboNameProblem(n)).not.toBeNull();
});

test("fallback mantém a ordem e rodízio começa em um item diferente a cada vez", () => {
  expect(comboOrder([1, 2, 3], "fallback", 5)).toEqual([1, 2, 3]);
  expect(comboOrder([1, 2, 3], "round_robin", 0)).toEqual([1, 2, 3]);
  expect(comboOrder([1, 2, 3], "round_robin", 1)).toEqual([2, 3, 1]);
  expect(comboOrder([1, 2, 3], "round_robin", 4)).toEqual([2, 3, 1]);
});

test("isComboName", () => {
  expect(isComboName("nexa-turbo")).toBe(true);
  expect(isComboName("nexa-reserva")).toBe(false);
  expect(isComboName("claude-opus-5-5")).toBe(false);
});
