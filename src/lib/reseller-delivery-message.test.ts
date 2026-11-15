import { expect, test } from "bun:test";
import { resellerDeliveryMessage } from "./reseller-delivery-message";

test("mensagem de entrega disponível apenas para jbtoolss7@gmail.com", () => {
  expect(resellerDeliveryMessage("jbtoolss7@gmail.com", "test-key") !== null).toBe(true);
  expect(resellerDeliveryMessage("outra-revenda@example.com", "test-key")).toBe(null);
  expect(resellerDeliveryMessage(undefined, "test-key")).toBe(null);
});
test("mensagem salva troca {chave} pela chave nova", () => {
  expect(resellerDeliveryMessage("jbtoolss7@gmail.com", "sk-nx-abc", "Sua chave: {chave}")).toBe("Sua chave: sk-nx-abc");
  expect(resellerDeliveryMessage("outra@example.com", "sk-nx-abc", "Sua chave: {chave}")).toBe(null);
});

test("entrega padrão do JB mantém a base e consulta em apirevenda.site", () => {
  const message = resellerDeliveryMessage("jbtoolss7@gmail.com", "test-key");
  expect(message?.includes("https://apirevenda.site/api/public")).toBe(true);
  expect(message?.includes("https://apirevenda.site/consumo")).toBe(true);
  expect(message?.includes("apiclaude.site")).toBe(false);
});

test("chave criada no admin para bruebielcasal@gmail.com recebe a mensagem ggmax com a chave nova", () => {
  const { adminDeliveryMessage } = require("./reseller-delivery-message");
  const m = adminDeliveryMessage("Bruebielcasal@gmail.com", "sk-nx-NOVA");
  expect(m?.match(/URL Base: (\S+)/)?.[1]).toBe("https://cloudnexapro.site/api/public");
  expect(m.includes("🔑 API Key: sk-nx-NOVA")).toBe(true);
  expect(m.includes("youtu.be/7DyTxYUXCrw")).toBe(true);
  expect(adminDeliveryMessage("outro@example.com", "sk-nx-NOVA")).toBe(null);
});
