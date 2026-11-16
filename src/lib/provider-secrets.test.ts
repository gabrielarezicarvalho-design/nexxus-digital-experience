import { expect, test } from "bun:test";
import { secretNameFor } from "./provider-secrets.server";

test("nome do segredo é criado a partir do nome da conta", () => {
  expect(secretNameFor("Meu Fornecedor 2")).toBe("MEU_FORNECEDOR_2_API_KEY");
  expect(secretNameFor("Ação.ai")).toBe("ACAO_AI_API_KEY");
  expect(secretNameFor("9router")).toBe("P_9ROUTER_API_KEY");
  expect(/^[A-Z][A-Z0-9_]{2,99}$/.test(secretNameFor("x"))).toBe(true);
});
