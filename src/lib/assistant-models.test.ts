import { describe, expect, test } from "bun:test";
import { assistantAccount, assistantModels } from "./assistant-models";

const ghost = { name: "GhostCLI", active: true, paused: false, priority: 0, created_at: "2026-01-01", available_models: ["claude-opus-5-5", "claude-sonnet-5", "claude-fable-5.1"] };
const catalog = ghost.available_models.map(name => ({ name, display_name: name, internal_id: name, provider: "GhostCLI", enabled: true, catalog_approved: true }));
describe("assistant model selection", () => {
  test("follows current saved primary without using paused providers", () => {
    expect(assistantAccount([{ ...ghost, paused: true }, { ...ghost, name: "Anthropic Revenda", priority: 2 }]).name).toBe("Anthropic Revenda");
  });
  test("dedicated client never switches to global primary", () => {
    let rejected = false;
    try { assistantAccount([ghost], "FreeModel"); } catch { rejected = true; }
    expect(rejected).toBe(true);
  });
  test("lists only current provider's three approved models", () => {
    expect(assistantModels(ghost, [...catalog, { name: "other", display_name: "Other", internal_id: "other", provider: "FreeModel", enabled: true, catalog_approved: true }]).map(m => m.id).sort()).toEqual(["claude-fable-5.1", "claude-opus-5-5", "claude-sonnet-5"]);
  });
  test("disabled and unapproved models cannot be selected", () => {
    expect(assistantModels(ghost, catalog.map(m => ({ ...m, enabled: false })))).toEqual([]);
    expect(assistantModels(ghost, catalog.map(m => ({ ...m, catalog_approved: false })))).toEqual([]);
  });
  test("keeps client-specific model restriction", () => {
    expect(assistantModels(ghost, catalog, ["claude-sonnet-5"]).map(m => m.id)).toEqual(["claude-sonnet-5"]);
  });
  test("includes all active site models across providers and families", () => {
    const reserva = { ...ghost, name: "Reserva Teste", priority: 1, available_models: ["gpt-5.6-sol", "glm-5.3-flash", "deepseek-v4.1-flash"] };
    const extra = reserva.available_models.map(name => ({ name, display_name: name, internal_id: name, provider: reserva.name, enabled: true, catalog_approved: true }));
    expect(assistantModels([ghost, reserva], [...catalog, ...extra]).map(m => m.id).sort()).toEqual([
      "claude-fable-5.1", "claude-opus-5-5", "claude-sonnet-5", "deepseek-v4.1-flash", "glm-5.3-flash", "gpt-5.6-sol",
    ]);
  });
  test("excludes models from disabled or paused providers", () => {
    expect(assistantModels([{ ...ghost, active: false }], catalog)).toEqual([]);
    expect(assistantModels([{ ...ghost, paused: true }], catalog)).toEqual([]);
  });
  test("deduplicates punctuation aliases without merging model versions", () => {
    const account = { ...ghost, available_models: ["claude-opus-5-5", "claude-opus-5-1"] };
    const models = ["claude-opus-5-5", "claude-opus-5.5", "claude-opus-5-1"].map(name => ({ name, display_name: name, internal_id: name, provider: ghost.name, enabled: true, catalog_approved: true }));
    expect(assistantModels(account, models).map(m => m.id).sort()).toEqual(["claude-opus-5-1", "claude-opus-5-5"]);
  });
  test("only offers models authorized for the customer's key", () => {
    expect(assistantModels(ghost, catalog, ["claude-opus-5.5"]).map(m => m.id)).toEqual(["claude-opus-5-5"]);
    expect(assistantModels(ghost, catalog, [])).toEqual([]);
  });
  test("never offers an unavailable internal model", () => {
    expect(assistantModels({ ...ghost, available_models: [] }, catalog)).toEqual([]);
  });
});