import { expect, test } from "bun:test";
import { globalProviderHops } from "./upstream.server";
const acc = (name: string) => ({ name, base_url: "https://p.test/v1", api_secret_name: "T", available_models: ["claude-opus-5.5", "claude-sonnet-5.5"] });
const list = [acc("DevHub Brasil"), acc("Anthropic Revenda")];
test("Opus vai só à DevHub; a 9Router (Anthropic Revenda) não atende Claude", () => {
  expect(globalProviderHops(list, "claude-opus-5-5").map(h => h.account.name)).toEqual(["DevHub Brasil"]);
  expect(globalProviderHops(list, "claude-opus-5.5").map(h => h.account.name)).toEqual(["DevHub Brasil"]);
});
test("Sonnet segue a prioridade salva", () => {
  expect(globalProviderHops(list, "claude-sonnet-5-5")[0]?.account.name).toBe("DevHub Brasil");
});
