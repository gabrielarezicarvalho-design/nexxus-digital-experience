import { expect, test } from "bun:test";
import { isResellerHostname, RESELLER_BASE, RESELLER_KEYS_API, resellerApiUrls } from "./reseller-domain";

test("demais revendedores usam apirevenda.site como base e endpoint de geração", () => {
  expect(RESELLER_BASE).toBe("https://apirevenda.site/api/public");
  expect(RESELLER_KEYS_API).toBe("https://apirevenda.site/api/public/v1/reseller/keys");
  for (const email of ["jbtoolss7@gmail.com", "jjaguiar8000@gmail.com", undefined]) {
    expect(resellerApiUrls(email).base).toBe("https://apirevenda.site/api/public");
    expect(resellerApiUrls(email).keys).toBe("https://apirevenda.site/api/public/v1/reseller/keys");
  }
});

test("somente a identidade Pulse Coding recebe a base apiclaude.site", () => {
  expect(resellerApiUrls("bruebielcasal@gmail.com")).toEqual({
    origin: "https://apiclaude.site",
    base: "https://apiclaude.site/api/public",
    openai: "https://apiclaude.site/api/public/v1",
    keys: "https://apiclaude.site/api/public/v1/reseller/keys",
  });
  expect(resellerApiUrls(" BRUEBIELCASAL@gmail.com ").base).toBe("https://apiclaude.site/api/public");
  expect(resellerApiUrls("fakebruebielcasal@gmail.com").base).toBe(RESELLER_BASE);
});

test("domínio novo e antigo mantêm a tela exclusiva da API", () => {
  for (const host of ["apiclaude.site", "www.apiclaude.site", "apirevenda.site", "www.apirevenda.site"]) {
    expect(isResellerHostname(host)).toBe(true);
  }
  expect(isResellerHostname("cloudnexapro.site")).toBe(false);
  expect(isResellerHostname("fakeapiclaude.site")).toBe(false);
});