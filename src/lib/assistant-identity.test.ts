import { describe, expect, test } from "bun:test";
import { createClient } from "@supabase/supabase-js";
import { assistantClientFilter } from "./assistant-identity";

describe("assistant verified identity", () => {
  test("request-header clients have no persisted auth session for a second getUser", async () => {
    const db = createClient("https://example.invalid", "sb_publishable_test", {
      auth: { persistSession: false },
      global: { fetch: async () => Response.json({ id: "verified-user" }) },
    });
    const result = await db.auth.getUser();
    expect(result.error?.name).toBe("AuthSessionMissingError");
    expect(assistantClientFilter("verified-user", "client@example.invalid")).toBe("user_id.eq.verified-user,email.ilike.client@example.invalid");
  });
  test("missing verified email cannot broaden owner lookup", () => {
    expect(assistantClientFilter("verified-user")).toBe("user_id.eq.verified-user");
    expect(assistantClientFilter("verified-user", "%_")).toBe("user_id.eq.verified-user");
  });
});