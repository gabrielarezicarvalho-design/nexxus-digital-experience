import { createFileRoute } from "@tanstack/react-router";

// Consulta somente leitura para o atendimento via WhatsApp.
// Protegida pelo header x-atendimento-secret (segredo ATENDIMENTO_SECRET).
const hits = new Map<string, number[]>();
const NOT_FOUND = { ok: false, message: "Não encontrei um cadastro com esse e-mail." };

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } });

const maskEmail = (e: string) => {
  const [u, d] = e.split("@");
  return `${(u ?? "").slice(0, 2)}***@${d ?? "?"}`;
};

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export const Route = createFileRoute("/api/public/consulta-cliente")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["ATENDIMENTO_SECRET"];
        const given = request.headers.get("x-atendimento-secret") ?? "";
        if (!secret || !safeEqual(given, secret)) return json({ ok: false, message: "unauthorized" }, 401);

        const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
        const now = Date.now();
        const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
        if (list.length >= 5) return json({ ok: false, message: "Muitas consultas. Aguarde um minuto." }, 429);
        list.push(now);
        hits.set(ip, list);

        let email = "";
        try {
          const b: any = await request.json();
          email = String(b?.email ?? "").trim().toLowerCase();
        } catch { /* corpo inválido */ }
        if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(NOT_FOUND);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: clients } = await supabaseAdmin
          .from("clients").select("id, plan_id").ilike("email", email.replace(/[%_\\]/g, "\\$&")).limit(1);
        const client = clients?.[0];
        console.log("consulta-cliente", { email: maskEmail(email), found: !!client, ip });
        if (!client) return json(NOT_FOUND);

        const [{ data: key }, { data: pay }] = await Promise.all([
          supabaseAdmin.from("api_keys")
            .select("key_prefix, api_key, plano, status, token_limit, tokens_used, expires_at, reseller_blocked")
            .eq("client_id", client.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
          supabaseAdmin.from("payments").select("status, created_at, approved_at")
            .eq("client_id", client.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        ]);

        let planName: string | null = key?.plano ?? null;
        if (client.plan_id) {
          const { data: p } = await supabaseAdmin.from("plans").select("name").eq("id", client.plan_id).maybeSingle();
          planName = p?.name ?? planName;
        } else if (key?.plano) {
          const { data: p } = await supabaseAdmin.from("plans").select("name").eq("code", key.plano).maybeSingle();
          planName = p?.name ?? planName;
        }

        let status: string | null = null;
        if (key) {
          const exhausted = key.token_limit != null && key.tokens_used >= key.token_limit;
          status = key.status === "revoked" ? "revogado"
            : key.status === "blocked" || key.reseller_blocked ? "bloqueado"
            : key.status === "exhausted" || exhausted ? "esgotado"
            : "ativo";
        }

        return json({
          ok: true,
          plano: planName,
          status,
          validade: key?.expires_at ?? null,
          consumo_tokens: key ? Number(key.tokens_used) : null,
          limite_tokens: key?.token_limit == null ? null : Number(key.token_limit),
          chave_final: key?.api_key ? `****${key.api_key.slice(-4)}` : null,
          ultimo_pagamento: pay ? { status: pay.status, data: pay.approved_at ?? pay.created_at } : null,
        });
      },
    },
  },
});
