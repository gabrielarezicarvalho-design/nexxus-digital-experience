import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { checkByRowId, createPix, planPriceCents, resolveCoupon } from "./mercadopago.server";

export const createPixPayment = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    plan: z.string().regex(/^cc_[a-z0-9_]+$/).max(40),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(255),
    family: z.enum(["claude", "openai", "combo"]).default("claude"),
    coupon: z.string().trim().max(40).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const origin = new URL(getRequest().url).origin;
    return createPix(data.plan, data.name, data.email, origin, data.family, undefined, data.coupon || undefined);
  });

/** Confere um cupom para o checkout; o desconto real é recalculado ao gerar o PIX. */
export const previewCoupon = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    plan: z.string().regex(/^cc_[a-z0-9_]+$/).max(40),
    family: z.enum(["claude", "openai", "combo"]).default("claude"),
    code: z.string().trim().min(2).max(40),
  }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { db, price } = await planPriceCents(data.plan, data.family);
      const c = await resolveCoupon(db, data.code, price);
      return { ok: true as const, code: c.code, discountCents: c.discount };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Cupom inválido ou expirado." };
    }
  });

export const checkPixPayment = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => ({ status: await checkByRowId(data.id) }));
