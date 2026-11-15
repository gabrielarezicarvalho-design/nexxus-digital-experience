import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const adminSetProviderNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ enabled: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (roleError || !admin) throw new Error("Acesso negado");
    const { error } = await context.supabase.from("site_notices").upsert({
      id: "provider_instability", enabled: data.enabled, updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { enabled: data.enabled };
  });