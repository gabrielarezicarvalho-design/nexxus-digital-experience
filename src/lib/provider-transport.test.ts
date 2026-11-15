import { expect, test } from "bun:test";
import { providerChatUrl, providerProxyHeaders, providerRequestBase } from "./provider-transport.server";

test("FreeAPI uses only its exact HTTPS v1 base through the connector", () => {
  const base = "https://freeapi.anthropicrevenda.site/v1/";
  const connector = { gatewayKey: "test-gateway", connectionKey: "test-freeapi" };
  expect(providerRequestBase(base)).toBe("https://connector-gateway.lovable.dev/udc_freeapi_anthropic_revenda");
  expect(providerProxyHeaders(base, "", connector)).toEqual({ Authorization: "Bearer test-gateway", "X-Connection-Api-Key": "test-freeapi" });
  for (const other of ["http://freeapi.anthropicrevenda.site/v1", "https://freeapi.anthropicrevenda.site.evil.example/v1", "https://freeapi.anthropicrevenda.site/v2"]) {
    expect(providerRequestBase(other)).toBe(other);
    expect(providerProxyHeaders(other, "", connector)).toEqual({});
  }
});

test("FreeAPI fails closed without either connector credential", () => {
  for (const connector of [{ gatewayKey: "", connectionKey: "test-freeapi" }, { gatewayKey: "test-gateway", connectionKey: "" }]) {
    let message = "";
    try { providerProxyHeaders("https://freeapi.anthropicrevenda.site/v1", "", connector); }
    catch (error) { message = error instanceof Error ? error.message : "unknown"; }
    expect(message).toBe("Conexão FreeAPI Anthropic Revenda não configurada.");
  }
});

test("Nexxus root base uses its versioned connector for discovery and delivery", () => {
  expect(providerRequestBase("https://api.nexxus-pro.site/")).toBe("https://connector-gateway.lovable.dev/udc_nexxus_pro/v1");
  expect(providerProxyHeaders("https://api.nexxus-pro.site", "", { gatewayKey: "test-gateway", connectionKey: "test-nexxus" })).toEqual({ Authorization: "Bearer test-gateway", "X-Connection-Api-Key": "test-nexxus" });
});

test("Nexxus credentials stay scoped to the exact HTTPS base", () => {
  for (const base of ["https://api.nexxus-pro.site.evil.example", "http://api.nexxus-pro.site", "https://api.nexxus-pro.site/v2"]) {
    expect(providerRequestBase(base)).toBe(base);
    expect(providerProxyHeaders(base, "", { gatewayKey: "test-gateway", connectionKey: "test-nexxus" })).toEqual({});
  }
});

test("Nexxus fails closed without either connector credential", () => {
  for (const connector of [{ gatewayKey: "", connectionKey: "test-nexxus" }, { gatewayKey: "test-gateway", connectionKey: "" }]) {
    let message = "";
    try { providerProxyHeaders("https://api.nexxus-pro.site", "", connector); }
    catch (error) { message = error instanceof Error ? error.message : "unknown"; }
    expect(message).toBe("Conexão Nexxus Pro não configurada.");
  }
});

test("Lauren delivery and discovery use only its exact connector base", () => {
  const connector = { gatewayKey: "test-gateway", connectionKey: "test-lauren" };
  expect(providerRequestBase("https://api.ialauren.com/v1/")).toBe("https://connector-gateway.lovable.dev/udc_lauren_api/v1");
  expect(providerProxyHeaders("https://api.ialauren.com/v1/", "", connector)).toEqual({ Authorization: "Bearer test-gateway", "X-Connection-Api-Key": "test-lauren" });
  for (const base of ["https://api.ialauren.com.evil.example/v1", "http://api.ialauren.com/v1", "https://api.ialauren.com/v2"]) {
    expect(providerRequestBase(base)).toBe(base);
    expect(providerProxyHeaders(base, "", connector)).toEqual({});
  }
});

test("Lauren fails closed without either connector credential", () => {
  for (const connector of [{ gatewayKey: "", connectionKey: "test-lauren" }, { gatewayKey: "test-gateway", connectionKey: "" }]) {
    let message = "";
    try { providerProxyHeaders("https://api.ialauren.com/v1", "", connector); }
    catch (error) { message = error instanceof Error ? error.message : "unknown"; }
    expect(message).toBe("Conexão Lauren não configurada.");
  }
});

test("Invision discovery and delivery use the connector, never the connection key at the provider", () => {
  const base = "https://invision.dreamvision.com.br/v1/";
  expect(providerRequestBase(base)).toBe("https://connector-gateway.lovable.dev/udc_invision");
  expect(providerProxyHeaders(base, "", { gatewayKey: "test-gateway", connectionKey: "test-connection" }))
    .toEqual({ Authorization: "Bearer test-gateway", "X-Connection-Api-Key": "test-connection" });
});

test("Invision connector credentials stay scoped to the exact trusted base", () => {
  for (const base of ["https://invision.dreamvision.com.br.evil.example/v1", "http://invision.dreamvision.com.br/v1", "https://invision.dreamvision.com.br/v2"]) {
    expect(providerRequestBase(base)).toBe(base);
    expect(providerProxyHeaders(base, "", { gatewayKey: "test-gateway", connectionKey: "test-connection" })).toEqual({});
  }
});

test("Invision fails closed when either connector credential is missing", () => {
  for (const connector of [{ gatewayKey: "", connectionKey: "test-connection" }, { gatewayKey: "test-gateway", connectionKey: "" }]) {
    let message = "";
    try { providerProxyHeaders("https://invision.dreamvision.com.br/v1", "", connector); }
    catch (error) { message = error instanceof Error ? error.message : "unknown"; }
    expect(message).toBe("Conexão Invision não configurada.");
  }
});

test("GhostCLI uses the exact VPS base with internal authentication", () => {
  expect(providerProxyHeaders("https://proxy.cloudnexapro.site/v1/", "test-internal-token"))
    .toEqual({ "X-Nexa-Proxy-Token": "test-internal-token", "User-Agent": "NEXA-Gateway/1.0" });
});

test("internal authentication is never sent to GhostCLI directly or unrelated providers", () => {
  for (const url of ["https://ghostcli.cloud/v1", "https://proxy.cloudnexapro.site.evil.example/v1", "http://proxy.cloudnexapro.site/v1", "https://proxy.cloudnexapro.site/v2", "https://radoxai.com/v1"]) {
    expect(providerProxyHeaders(url, "test-internal-token")).toEqual({});
  }
});

test("missing internal authentication fails closed before sending provider credentials", () => {
  let message = "";
  try { providerProxyHeaders("https://proxy.cloudnexapro.site/v1", ""); }
  catch (error) { message = error instanceof Error ? error.message : "unknown"; }
  expect(message).toBe("Acesso interno do repasse não configurado.");
});
test("Tokens Token uses its exact v1 base through the connector and fails closed", () => {
  expect(providerRequestBase("https://api.tokens-token.com/v1/")).toBe("https://connector-gateway.lovable.dev/udc_tokens_token/v1");
  expect(providerProxyHeaders("https://api.tokens-token.com/v1", "", { gatewayKey: "g", connectionKey: "t" })).toEqual({ Authorization: "Bearer g", "X-Connection-Api-Key": "t" });
  for (const other of ["https://api.tokens-token.com.evil.example/v1", "http://api.tokens-token.com/v1", "https://api.tokens-token.com/v2"]) {
    expect(providerProxyHeaders(other, "", { gatewayKey: "g", connectionKey: "t" })).toEqual({});
  }
  let message = "";
  try { providerProxyHeaders("https://api.tokens-token.com/v1", "", { gatewayKey: "g", connectionKey: "" }); }
  catch (error) { message = error instanceof Error ? error.message : "unknown"; }
  expect(message).toBe("Conexão Tokens Token não configurada.");
});

test("infrastructure model probes for connector suppliers go to the connector gateway, never the supplier origin", async () => {
  const { providerModelsUrl } = await import("./provider-transport.server");
  expect(providerModelsUrl("https://api.nexxus-pro.site")).toBe("https://connector-gateway.lovable.dev/udc_nexxus_pro/v1/models");
  expect(providerModelsUrl("https://api.provider.example/v1/")).toBe("https://api.provider.example/v1/models");
  expect(providerModelsUrl("https://painelnexa.anthropicrevenda.site/v1")).toBe("https://painelnexa.anthropicrevenda.site/v1/models");
});

test("Free AI uses its connector and the /chat/ endpoint for external models", () => {
  expect(providerRequestBase("https://api.free.ai/v1/")).toBe("https://connector-gateway.lovable.dev/udc_free_ai");
  expect(providerChatUrl("https://api.free.ai/v1")).toBe("https://connector-gateway.lovable.dev/udc_free_ai/chat/");
  expect(providerChatUrl("https://api.provider.example/v1")).toBe("https://api.provider.example/v1/chat/completions");
});
