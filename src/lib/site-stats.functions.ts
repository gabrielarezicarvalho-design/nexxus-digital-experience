import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export type SiteStats = {
  promptTokens: number;
  completionTokens: number;
  callsToday: number;
  successToday: number;
  excluded502Today: number;
  rateExcluded502Today: number;
  modelsEnabled: number;
};

// Estatísticas públicas agregadas da página inicial (sem dados de clientes).
export const getSiteStats = createServerFn({ method: "GET" }).handler(async (): Promise<SiteStats> => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const supabasePublic = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await supabasePublic.rpc("public_site_stats");
  if (error) throw new Error(error.message);
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    promptTokens: Number(d["promptTokens"] ?? 0),
    completionTokens: Number(d["completionTokens"] ?? 0),
    callsToday: Number(d["callsToday"] ?? 0),
    successToday: Number(d["successToday"] ?? 0),
    excluded502Today: Number(d["excluded502Today"] ?? 0),
    rateExcluded502Today: Number(d["rateExcluded502Today"] ?? 0),
    modelsEnabled: Number(d["modelsEnabled"] ?? 0),
  };
});
