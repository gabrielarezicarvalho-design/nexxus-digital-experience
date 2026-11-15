import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { generateKey } from "@/lib/reseller.server";
import { authenticateResellerRequest } from "@/lib/reseller-api-auth.server";
import { RESELLER_ISSUANCE_DENIED } from "@/lib/free-trial";

const Body = z.object({ plano: z.string().max(40), cliente: z.string().trim().max(60).optional(), familia: z.enum(["claude", "openai", "combo"]).default("claude") });

export const Route = createFileRoute("/api/public/v1/reseller/keys")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateResellerRequest(request);
        if (auth.response) return auth.response;
        const r = auth.reseller;
        if (!r) return Response.json({ error: "Acesso negado" }, { status: 403 });
        let body;
        try { body = Body.parse(await request.json()); } catch { return Response.json({ error: "Corpo inválido. Envie { \"plano\": \"cc_7d\" }" }, { status: 400 }); }
        try {
          const k = await generateKey(r.id, body.plano, body.cliente, body.familia);
          return Response.json({ chave: k.api_key, plano: k.plano, validade: k.expires_at, limite_tokens: k.token_limit, familia: body.familia, ...(k.mensagem ? { mensagem: k.mensagem } : {}) });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Erro";
          return Response.json({ error: msg }, { status: msg === RESELLER_ISSUANCE_DENIED ? 403 : 402 });
        }
      },
    },
  },
});
