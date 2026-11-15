import { describe, expect, test as it } from "bun:test";
import { asFamily, familyAllows, familyPriceCents, filterByFamily } from "./model-family";

const all = ["claude-opus-5-5", "claude-sonnet-5", "gpt-6-astra", "gpt-5.6-terra", "gpt-5.6-luna"];

describe("família do plano", () => {
  it("chave GPT só vê modelos GPT", () => {
    expect(filterByFamily("openai", all)).toEqual(["gpt-6-astra", "gpt-5.6-terra", "gpt-5.6-luna"]);
  });
  it("chave Claude continua só com Claude", () => {
    expect(filterByFamily("claude", all)).toEqual(["claude-opus-5-5", "claude-sonnet-5"]);
  });
  it("combo vê os dois", () => {
    expect(filterByFamily("combo", all)).toEqual(all);
  });
  it("chave GPT não pode usar Claude", () => {
    expect(familyAllows("openai", "claude-opus-5-5")).toBe(false);
  });
  it("chaves antigas sem família ficam Claude", () => {
    expect(asFamily(null)).toBe("claude");
  });
});

describe("preço do combo", () => {
  it("acrescenta R$ 10 ao preço de todos os planos Combo", () => {
    for (const baseCents of [1499, 1999, 4999, 6999, 8999, 10999, 14990, 20990]) {
      const previousComboPrice = Math.round(baseCents * 2 * 0.9);
      expect(familyPriceCents("combo", baseCents) - previousComboPrice).toBe(1000);
    }
    expect(familyPriceCents("combo", 14990)).toBe(27982);
    expect(familyPriceCents("combo", 20990)).toBe(38782);
  });
  it("GPT custa o mesmo que Claude", () => {
    expect(familyPriceCents("openai", 20990)).toBe(20990);
  });
  it("Claude mantém o preço sem acréscimo", () => {
    expect(familyPriceCents("claude", 20990)).toBe(20990);
  });
});
