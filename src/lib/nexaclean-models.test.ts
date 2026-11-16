import { expect, test } from "bun:test";
import { nexacleanModel, NEXACLEAN_MODELS } from "./nexaclean-models";

test("reconhece os seis Nexaclean em qualquer grafia", () => {
  expect(NEXACLEAN_MODELS.length).toBe(6);
  expect(nexacleanModel("Nexaclean Rápido")).toBe("nexaclean-rapido");
  expect(nexacleanModel("nexaclean_max")).toBe("nexaclean-max");
});

test("Claude e outros modelos nunca viram Nexaclean", () => {
  expect(nexacleanModel("claude-opus-5-5")).toBeUndefined();
  expect(nexacleanModel("qwen-coder")).toBeUndefined();
  expect(nexacleanModel("nexa-reserva")).toBeUndefined();
});

import { pickKeyModel } from "./model-resolve";
import { matchModelName } from "./model-name-match";

test("pedido de Claude nunca é trocado por Nexaclean", () => {
  const names = ["claude-opus-5-5", "claude-sonnet-5-5", ...NEXACLEAN_MODELS];
  expect(pickKeyModel("claude-opus-9", names, matchModelName("claude-opus-9", names))?.model).toBe("claude-opus-5-5");
  expect(pickKeyModel("modelo-qualquer", names, matchModelName("modelo-qualquer", names))?.model.startsWith("nexaclean")).toBe(false);
  expect(pickKeyModel("nexaclean-pro", names, matchModelName("nexaclean-pro", names))?.model).toBe("nexaclean-pro");
});
