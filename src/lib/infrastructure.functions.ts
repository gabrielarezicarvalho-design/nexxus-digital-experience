import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Check = { state: "online" | "error" | "unconfigured"; latencyMs: number | null };
type ProviderCheck = Check & { name: string };

async function probeUpstream(baseUrl: string, secretName: string): Promise<Check> {
  const key = process.env[secretName];
  if (!key) return { state: "unconfigured", latencyMs: null };
  const started = Date.now();
  try {
    const { providerModelsUrl, providerProxyHeaders } = await import("./provider-transport.server");
    const response = await fetch(providerModelsUrl(baseUrl), {
      headers: { Authorization: `Bearer ${key}`, ...providerProxyHeaders(baseUrl) },
      redirect: "manual",
      signal: AbortSignal.timeout(6000),
    });
    return { state: response.ok ? "online" : "error", latencyMs: Date.now() - started };
  } catch {
    return { state: "error", latencyMs: Date.now() - started };
  }
}

export const checkInfrastructure = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !isAdmin) throw new Error("Acesso negado");

    const dbStart = Date.now();
    const { error: dbError } = await context.supabase.from("models").select("id").limit(1);
    const database: Check = { state: dbError ? "error" : "online", latencyMs: Date.now() - dbStart };

    const gatewayKey = process.env["LOVABLE_API_KEY"];
    const ai: Check = { state: gatewayKey ? "online" : "unconfigured", latencyMs: null };
    // The AI indicator only confirms configuration; do not send a paid test prompt.

    const { data: accounts } = await context.supabase
      .from("provider_accounts")
      .select("name, base_url, api_secret_name, active, paused")
      .order("priority").order("created_at");
    const configured: ProviderCheck[] = await Promise.all(
      ((accounts ?? []) as { name: string; base_url: string; api_secret_name: string; active: boolean; paused: boolean }[])
        .map(async (account) => {
          const check = account.active && !account.paused
            ? await probeUpstream(account.base_url, account.api_secret_name)
            : { state: "unconfigured" as const, latencyMs: null };
          return { name: account.name, ...check };
        }),
    );
    const provider: Check = configured[0] ?? { state: "unconfigured", latencyMs: null };

    return { checkedAt: new Date().toISOString(), database, ai, provider, providers: configured };
  });
