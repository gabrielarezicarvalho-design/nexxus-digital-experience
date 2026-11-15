import { expect, test } from "bun:test";
import { freeApiSlot, FREEAPI_PROVIDER, FREEAPI_SLOTS } from "./freeapi-slots";
import { forcedHop, globalProviderHops, maskUpstreamModel } from "./upstream.server";

const free = {
  name: FREEAPI_PROVIDER,
  base_url: "https://freeapi.anthropicrevenda.site/v1",
  api_secret_name: "UDC_FREEAPI_ANTHROPIC_REVENDA_API_KEY",
  available_models: [],
};

test("FreeAPI converte todas as grafias Sonnet para o slot Sonnet 4.5", () => {
  for (const model of ["claude-sonnet-5", "claude-sonnet-5.5", "claude-sonnet-5-5"]) {
    expect(freeApiSlot(free, model)).toBe(FREEAPI_SLOTS.sonnet);
  }
});

test("FreeAPI converte Opus 4.8 e Opus 5.5 para o slot Opus 4.5", () => {
  for (const model of ["claude-opus-4.8", "claude-opus-4-8", "claude-opus-5.5", "claude-opus-5-5"]) {
    expect(freeApiSlot(free, model)).toBe(FREEAPI_SLOTS.opus);
  }
});

test("FreeAPI converte Fable e Haiku para o slot Haiku 4.5", () => {
  for (const model of ["claude-fable-5.1", "claude-fable-5-1", "claude-haiku-5-5"]) {
    expect(freeApiSlot(free, model)).toBe(FREEAPI_SLOTS.haiku);
  }
});

test("FreeAPI usa o slot automático para GPT e outros modelos", () => {
  for (const model of ["gpt-5.6-sol", "gpt-5.5-pro", "glm-5.3-flash"]) {
    expect(freeApiSlot(free, model)).toBe(FREEAPI_SLOTS.automatic);
  }
});

test("o mapeamento vale somente para a FreeAPI", () => {
  expect(freeApiSlot({ name: "Reserva Teste" }, "claude-sonnet-5")).toBeNull();
});

test("clientes comuns nunca usam a FreeAPI", () => {
  const reserva = { ...free, name: "Reserva Teste", available_models: ["claude-sonnet-5"] };
  const anthropic = { ...free, name: "Anthropic Revenda", available_models: ["claude-sonnet-5-5"] };
  const hops = globalProviderHops([reserva, anthropic, free], "claude-sonnet-5");
  expect(hops.map(hop => hop.account.name)).toEqual(["Reserva Teste"]); // Anthropic Revenda não atende Claude na rota comum
});

test("uma cadeia dedicada com FreeAPI também usa o slot sem mudar sua posição", () => {
  expect(forcedHop(free, "claude-opus-4.8").upstreamModel).toBe(FREEAPI_SLOTS.opus);
});

test("a resposta continua exibindo o nome público pedido, nunca o slot", () => {
  const chunk = 'data: {"model":"claude-sonnet-4-5","choices":[]}\n\n';
  expect(maskUpstreamModel(chunk, FREEAPI_SLOTS.sonnet, "claude-sonnet-5"))
    .toBe('data: {"model":"claude-sonnet-5","choices":[]}\n\n');
});
