import { describe, expect, test } from "bun:test";
import { widgetAccount, WIDGET_MODEL } from "./assistant-widget-provider.server";

const account = { name: "Anthropic Revenda", active: true, paused: false, base_url: "https://example.test/v1", api_secret_name: "TEST_KEY", available_models: ["claude-sonnet-5"] };

function rejected(rows: Parameters<typeof widgetAccount>[0]) {
  try { widgetAccount(rows); return false; } catch { return true; }
}

describe("widget provider selection", () => {
  test("uses only Gabriel's selected Anthropic Revenda provider", () => {
    expect(widgetAccount([{ ...account, name: "GhostCLI" }, account]).name).toBe("Anthropic Revenda");
    expect(WIDGET_MODEL).toBe("claude-sonnet-5");
  });
  test("does not bypass a disabled or paused provider", () => {
    expect(rejected([{ ...account, active: false }])).toBe(true);
    expect(rejected([{ ...account, paused: true }])).toBe(true);
  });
  test("does not silently replace the selected combo or provider", () => {
    expect(rejected([{ ...account, available_models: ["claude"] }])).toBe(true);
    expect(rejected([{ ...account, name: "GhostCLI" }])).toBe(true);
  });
});