import { z } from "zod";

export const promotionSchema = z.object({
  enabled: z.boolean(),
  headline: z.string().trim().min(1).max(180),
  description: z.string().trim().min(1).max(600),
  badge: z.string().trim().min(1).max(60),
  button_label: z.string().trim().min(1).max(100),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  name: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(120),
  token_limit: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  price_cents: z.number().int().positive().max(2147483647),
  rpm_limit: z.number().int().positive().max(2147483647),
}).refine(v => Date.parse(v.ends_at) > Date.parse(v.starts_at), { message: "O encerramento deve ser depois do início", path: ["ends_at"] });

export type PromotionInput = z.infer<typeof promotionSchema>;
export function isConfiguredPromotionOpen(offer: { enabled: boolean; starts_at: string; ends_at: string }, now: number) {
  return offer.enabled && now >= Date.parse(offer.starts_at) && now < Date.parse(offer.ends_at);
}
export function promotionText(text: string, tokens: number, cents: number) {
  return text.replaceAll("{milhoes}", String(tokens / 1_000_000)).replaceAll("{preco}", (cents / 100).toFixed(2).replace(".", ","));
}