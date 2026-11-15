import { expect, test } from "bun:test";
import { parseTokenAmount, providerBalance } from "./provider-balance";
test("usage is deducted from the provider balance", () => expect(providerBalance(100e6, 30e6).remaining).toBe(70e6));
test("never below zero", () => { const b = providerBalance(10, 50); expect(b.remaining).toBe(0); expect(b.tone).toBe("empty"); });
test("warning at 25% and low at 10%", () => { expect(providerBalance(100, 80).tone).toBe("warn"); expect(providerBalance(100, 95).tone).toBe("low"); });
test("parses 100M and 1,5B", () => { expect(parseTokenAmount("100M")).toBe(100e6); expect(parseTokenAmount("1,5B")).toBe(1.5e9); expect(parseTokenAmount("abc")).toBeNull(); });
