import { expect, test } from "bun:test";
import { missingProviderModels, providerCatalogModels, providerModelAllowed } from "./provider-catalog";

test("pulling Anthropic models automatically registers every discovered model once", () => {
  const rows = missingProviderModels("Anthropic Revenda", "account-a", ["claude-opus-5-5", "claude-sonnet-5-5", "claude-opus-5-5"], []);
  expect(rows.map((row) => row.internal_id)).toEqual(["claude-opus-5-5", "claude-sonnet-5-5"]);
  expect(rows.every((row) => row.provider === "Anthropic Revenda")).toBe(true);
});

test("pulling preserves existing model identity and does not automatically release unknown models", () => {
  const existing = [{ name: "opus-combo", internal_id: "claude-opus-5-5", provider: "Anthropic Revenda", enabled: true }];
  const rows = missingProviderModels("Anthropic Revenda", "account-a", ["claude-opus-5-5", "claude-fable-5-1"], existing);
  expect(rows.length).toBe(1);
  expect(rows[0]?.internal_id).toBe("claude-fable-5-1");
  expect(rows[0]?.enabled).toBe(false);
  expect(rows[0]?.catalog_approved).toBe(false);
});

test("same upstream model in different providers gets an independent administrative identity", () => {
  const existing = [{ name: "claude", internal_id: "claude", provider: "Anthropic Revenda", enabled: true }];
  const rows = missingProviderModels("FreeModel", "account-b", ["claude"], existing);
  expect(rows[0]?.name).toBe("reserve-account-b-claude");
  expect(rows[0]?.provider).toBe("FreeModel");
});

test("Anthropic Revenda uses exactly Gabriel's eleven current combos, not their pool models", () => {
  const combos = ["claude-opus-4-8", "claude-opus-5-5", "claude-fable-5-1", "gemini-4-argon", "gpt-6-astra", "gpt-6-sol", "gpt-6.1-sol", "gpt-6-luna", "gpt-6.1-terra", "claude-sonnet-5-5", "claude-haiku-5-5"];
  const ids = [...combos, "glm-5.3-flash", "claude", "ag/claude-opus-4-6-thinking", "ag/claude-opus-5", "ag/claude-fable-5", "ag/claude-sonnet-5", "gpt-4o", "gemini-3.1-pro", "nvidia/nemotron"];
  expect(providerCatalogModels("Anthropic Revenda", ids)).toEqual(combos);
  expect(missingProviderModels("Anthropic Revenda", "a", ids, []).map((row) => row.internal_id)).toEqual(combos);
});

test("Anthropic Revenda uses new GPT combos and excludes retired pool IDs", () => {
  const current = ["gpt-6-astra", "gpt-6.1-terra", "gpt-6-luna"];
  const blockedAndVariants = ["cx/gpt-6.1-terra", "cx/gpt-6-luna[1m]", "gpt-5.6-luna", "cx/gpt-5.6-luna-review", "ag/gpt-oss-120b-medium"];
  expect(providerCatalogModels("Anthropic Revenda", [...current, ...blockedAndVariants])).toEqual(current);
  expect(providerModelAllowed("Anthropic Revenda", "cx/gpt-6.1-terra")).toBe(false);
  expect(missingProviderModels("Anthropic Revenda", "account-a", blockedAndVariants, [])).toEqual([]);
});

test("discovery does not invent combos that the provider did not return", () => {
  expect(providerCatalogModels("Anthropic Revenda", ["ag/claude-sonnet-5", "claude-opus-5-5"])).toEqual(["claude-opus-5-5"]);
});

test("Claude-only filtering does not change other providers", () => {
  expect(providerCatalogModels("FreeModel", ["gpt-4o", "claude-sonnet-5"])).toEqual(["gpt-4o", "claude-sonnet-5"]);
});
