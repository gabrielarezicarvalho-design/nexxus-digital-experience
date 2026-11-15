import { describe, expect, test as it } from "bun:test";
import { COOLDOWN_MS, cooldownKey, orderByCooldown } from "./provider-cooldown";

const hop = (name: string, upstreamModel = "claude-sonnet-5") => ({ account: { name }, upstreamModel });

describe("troca após falha", () => {
  it("depois de falha da GhostCLI, o próximo pedido começa no próximo fornecedor", () => {
    const order = orderByCooldown([hop("GhostCLI"), hop("Anthropic Revenda"), hop("RadoxAI")], new Set([cooldownKey("GhostCLI", "claude-sonnet-5")]));
    expect(order.map((h) => h.account.name)).toEqual(["Anthropic Revenda", "RadoxAI", "GhostCLI"]);
  });

  it("falha em outro modelo não muda a ordem deste modelo", () => {
    const order = orderByCooldown([hop("GhostCLI"), hop("Anthropic Revenda")], new Set([cooldownKey("GhostCLI", "claude-opus-5-5")]));
    expect(order[0]?.account.name).toBe("GhostCLI");
  });

  it("falha do Sonnet troca somente Sonnet; Opus e Fable permanecem na Ghost", () => {
    const cooled = new Set([cooldownKey("GhostCLI", "claude-sonnet-5")]);
    const providersFor = (model: string) => orderByCooldown([
      hop("GhostCLI", model), hop("Anthropic Revenda", model),
    ], cooled).map((h) => h.account.name);
    expect(providersFor("claude-sonnet-5")).toEqual(["Anthropic Revenda", "GhostCLI"]);
    expect(providersFor("claude-opus-5-5")).toEqual(["GhostCLI", "Anthropic Revenda"]);
    expect(providersFor("claude-fable-5.1")).toEqual(["GhostCLI", "Anthropic Revenda"]);
  });

  it("fornecedor único continua sendo usado", () => {
    const order = orderByCooldown([hop("GhostCLI")], new Set([cooldownKey("GhostCLI", "claude-sonnet-5")]));
    expect(order.map((h) => h.account.name)).toEqual(["GhostCLI"]);
  });

  it("volta a tentar o fornecedor original após 10 minutos", () => {
    expect(COOLDOWN_MS).toBe(600_000);
  });
});

it('DevHub combo models rest one minute, other providers ten minutes', async () => {
  const { COMBO_COOLDOWN_MS, COOLDOWN_MS } = await import('./provider-cooldown');
  expect(COMBO_COOLDOWN_MS).toBe(60_000);
  expect(COOLDOWN_MS).toBe(600_000);
});
