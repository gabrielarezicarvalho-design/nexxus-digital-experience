import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { promotionSchema } from "./promotion-rules";

export const getTokenOffer = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const db = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  const { data: offer, error } = await db.from("site_promotions").select("*").eq("id", "token_offer").maybeSingle();
  if (error) throw new Error(error.message);
  if (!offer) return null;
  const { data: plan, error: planError } = await db.from("plans").select("code,name,title,price_cents,token_limit,active,kind").eq("code", offer.plan_code).maybeSingle();
  if (planError) throw new Error(planError.message);
  return { offer, plan };
});

export const saveTokenOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => promotionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !admin) throw new Error("Acesso negado");
    const { name, title, token_limit, price_cents, rpm_limit, ...settings } = data;
    const { error: saveError } = await context.supabase.rpc("save_token_promotion", {
      _settings: settings, _plan: { name, title, token_limit, price_cents, rpm_limit },
    });
    if (saveError) throw new Error(saveError.message);
    await context.supabase.from("audit_logs").insert({ actor_id: context.userId, action: "promotion.updated", entity: "site_promotions", details: { enabled: data.enabled, token_limit, price_cents, ends_at: data.ends_at } });
    return { success: true };
  });