import { describe, expect, test as it } from "bun:test";
import { OUTAGE_COMBO, withOutageCombo } from "./upstream.server";

const anthropic = { name: "Anthropic Revenda", base_url: "x", api_secret_name: "K", available_models: ["claude-opus-5-5", OUTAGE_COMBO] } as any;
const other = { name: "Outro", base_url: "y", api_secret_name: "K2" } as any;

describe("suporte-queda", () => {
  it("is appended as the very last attempt after Anthropic's normal combo", () => {
    const hops = withOutageCombo([{ account: anthropic, upstreamModel: "claude-opus-5-5" }, { account: other, upstreamModel: "m" }]);
    expect(hops.map((h) => h.upstreamModel)).toEqual(["claude-opus-5-5", "m", OUTAGE_COMBO]);
  });
  it("is not added when Anthropic Revenda is not in the chain", () => {
    expect(withOutageCombo([{ account: other, upstreamModel: "m" }]).length).toBe(1);
  });
});
