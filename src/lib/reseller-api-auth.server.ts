import { resellerByApiKey } from "./reseller.server";
import { isResellerIpAllowed, resellerRequestIp } from "./reseller-ip-rules";

export async function authenticateResellerRequest(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const r = token.startsWith("nx_res_") ? await resellerByApiKey(token) : null;
  if (!r) return { response: Response.json({ error: "API key de revenda inválida" }, { status: 401 }) };
  if (r.status !== "active") return { response: Response.json({ error: "Revenda bloqueada: pague o repasse pendente" }, { status: 403 }) };
  const ip = resellerRequestIp(request);
  const allowed = isResellerIpAllowed(ip, r.api_allowed_ips);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("reseller_api_access_logs").insert({ reseller_id: r.id, client_ip: ip, allowed });
  if (error) return { response: Response.json({ error: "Não foi possível verificar o acesso. Tente novamente." }, { status: 503 }) };
  if (!allowed) return { response: Response.json({ error: "IP não autorizado para esta API key de revenda. Solicite a autorização ao administrador." }, { status: 403 }) };
  return { reseller: r };
}