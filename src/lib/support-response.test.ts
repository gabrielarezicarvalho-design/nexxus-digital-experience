import { expect, test } from "bun:test";
import { cleanSupportResponse } from "./support-response";

test("removes the reported speech timestamps", () => {
  expect(cleanSupportResponse("[16.2:] Mas lembre, eu só tiro as suas dúvidas, [18.9:] Alterações no painel, são mais resolutivas. [21.6:] Tô aqui pra te ajudar, é só chamar"))
    .toBe("Mas lembre, eu só tiro as suas dúvidas, Alterações no painel, são mais resolutivas. Tô aqui pra te ajudar, é só chamar");
});
test("removes range timestamps while preserving useful text", () => {
  expect(cleanSupportResponse("[0.0:4.0] Abra /docs. [8.0:12.0] Veja a documentação.")).toBe("Abra /docs. Veja a documentação.");
});
test("keeps code and ordinary brackets intact", () => {
  const text = "Use [Minha chave] e `arr[16.2:]`.\n```python\narr[16.2:]\n```";
  expect(cleanSupportResponse(text)).toBe(text);
});