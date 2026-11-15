import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resellerPlanInput } from "./reseller-plan-rules";

export const saveResellerPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => resellerPlanInput.parse(input))
  .handler(async ({ context, data }) => {
    const { data: reseller, error: ownerError } = await context.supabase.from("resellers").select("id,status").eq("user_id", context.userId).maybeSingle();
    if (ownerError || !reseller || reseller.status !== "active") throw new Error("Revenda indisponível para criar ou alterar planos.");
    const values = { name: data.name, kind: data.kind, token_limit: data.token_limit, duration_days: data.duration_days };
    if (data.id) {
      const { data: row, error } = await context.supabase.from("reseller_plans").update(values).eq("id", data.id).eq("reseller_id", reseller.id).select("id").maybeSingle();
      if (error || !row) throw new Error("Não foi possível salvar o plano.");
      return { id: row.id };
    }
    const id = crypto.randomUUID();
    const { error } = await context.supabase.from("reseller_plans").insert({ ...values, id, code: `rp_${id.replaceAll("-", "")}`, reseller_id: reseller.id });
    if (error) throw new Error("Não foi possível criar o plano.");
    return { id };
  });

export const setResellerPlanActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: reseller } = await context.supabase.from("resellers").select("id,status").eq("user_id", context.userId).maybeSingle();
    if (!reseller || reseller.status !== "active") throw new Error("Revenda indisponível.");
    const { data: row, error } = await context.supabase.from("reseller_plans").update({ active: data.active }).eq("id", data.id).eq("reseller_id", reseller.id).select("id").maybeSingle();
    if (error || !row) throw new Error("Não foi possível alterar o plano.");
    return { ok: true };
  });