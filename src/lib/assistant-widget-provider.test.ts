import { describe, expect, test } from "bun:test";
import { widgetAccount, WIDGET_MODEL } from "./assistant-widget-provider.server";

const account = { name: "DevHub Brasil", active: true, paused: false, base_url: "https://example.test/v1", api_secret_name: "TEST_KEY", available_models: ["claude-sonnet-5", "claude-fable-5.1"] };

function rejected(rows: Parameters<typeof widgetAccount>[0]) {
  try { widgetAccount(rows.map((r) => ({ ...r }))); return false; } catch { return true; }
}

describe("widget provider selection", () => {
  test("uses the DevHub with its fastest available Claude model", () => {
    const chosen = widgetAccount([{ ...account, name: "Anthropic Revenda" }, { ...account }]);
    expect(chosen.name).toBe("DevHub Brasil");
    expect(chosen.widgetModel).toBe(WIDGET_MODEL);
    expect(widgetAccount([{ ...account, available_models: ["claude-sonnet-5"] }]).widgetModel).toBe("claude-sonnet-5");
  });
  test("does not bypass a disabled or paused provider", () => {
    expect(rejected([{ ...account, active: false }])).toBe(true);
    expect(rejected([{ ...account, paused: true }])).toBe(true);
  });
  test("never falls back to another provider or a non-Claude model", () => {
    expect(rejected([{ ...account, available_models: ["gpt-6"] }])).toBe(true);
    expect(rejected([{ ...account, name: "Anthropic Revenda" }])).toBe(true);
  });
});
