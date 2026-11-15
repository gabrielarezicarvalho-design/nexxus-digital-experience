import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAssistantModels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assistantModelContext } = await import("./assistant-models.server");
    const email = typeof context.claims.email === "string" ? context.claims.email : undefined;
    return (await assistantModelContext(context.supabase, context.userId, email)).models;
  });