import { expect, test } from "bun:test";
import { dedicatedProviders, forcedHop } from "./upstream.server";
const fm = { name: "FreeModel", base_url: "https://freemodel.in/v1", api_secret_name: "FREEMODEL_API_KEY", default_model: "claude-sonnet-5", available_models: ["claude-opus-4.8", "claude-sonnet-5"] };
test("key c609818c dedicated chain contains only Nexxus then Reserva Teste", () => {
  expect(dedicatedProviders("Nexxus Pro,Reserva Teste")).toEqual([
    "Nexxus Pro", "Reserva Teste",
  ]);
});
test("key-specific dedicated chain preserves Nexxus, Anthropic and Reserva Teste order only", () => {
  expect(dedicatedProviders("Nexxus Pro,Anthropic Revenda,Reserva Teste")).toEqual([
    "Nexxus Pro", "Anthropic Revenda", "Reserva Teste",
  ]);
});
test("cliente fixado na FreeModel usa o nome pedido quando ela o conhece", () => {
  expect(forcedHop(fm, "claude-opus-4.8").upstreamModel).toBe("claude-opus-4.8");
  expect(forcedHop(fm, "claude-opus-4.8").account.name).toBe("FreeModel");
});
test("modelo desconhecido pela FreeModel cai no padrão dela", () => {
  expect(forcedHop(fm, "cloud-opus-5.1", "openrouter/free").upstreamModel).toBe("claude-sonnet-5");
});
