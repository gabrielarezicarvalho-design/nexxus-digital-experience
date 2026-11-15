import { expect, test } from "bun:test";
import { adminKeyFamily, adminPlanTab } from "./admin-plan-tabs";
test("Claude tab holds token packages and Claude monthly plans", () => { expect(adminPlanTab({ code: "cc_ess_250m", kind: "tokens" })).toBe("claude"); expect(adminPlanTab({ code: "cc_monthly_max", kind: "days" })).toBe("claude"); });
test("GPT tab holds only GPT monthly plans", () => expect(adminPlanTab({ code: "cc_monthly_gpt_pro", kind: "days" })).toBe("openai"));
test("Combo tab holds only Mensal 5x/20x", () => { expect(adminPlanTab({ code: "cc_mensal_20x", kind: "days" })).toBe("combo"); expect(adminPlanTab({ code: "cc_monthly_teams", kind: "days" })).toBe("claude"); });
test("key family follows site purchase", () => { expect(adminKeyFamily("claude", "cc_monthly_teams")).toBe("combo"); expect(adminKeyFamily("claude", "cc_ess_50m")).toBe("claude"); });
