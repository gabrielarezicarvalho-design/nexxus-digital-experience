import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const createCardPayment = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    plan: z.string().regex(/^cc_[a-z0-9_]+$/).max(40),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(255),
    family: z.enum(["claude", "openai", "combo"]).default("claude"),
    environment: z.enum(["sandbox", "live"]),
  }).parse(d))
  .handler(async ({ data }) => {
    const { createCardTransaction } = await import("./card-payment.server");
    return createCardTransaction(data.plan, data.name, data.email, data.family, data.environment);
  });
