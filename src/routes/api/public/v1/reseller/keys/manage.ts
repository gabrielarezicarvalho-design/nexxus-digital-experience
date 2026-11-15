import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { deleteResellerKey, revokeResellerKey, updateResellerKey } from "@/lib/reseller.server";
import { authenticateResellerRequest } from "@/lib/reseller-api-auth.server";
import { RESELLER_ISSUANCE_DENIED } from "@/lib/free-trial";

const Body = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("alterar"), chave: z.string().min(10).max(200), plano: z.string().max(40).optional(), dias: z.number().int().min(0).max(3650).optional() }),
  z.object({ acao: z.literal("revogar"), chave: z.string().min(10).max(200) }),
  z.object({ acao: z.literal("deletar"), chave: z.string().min(10).max(200) }),
]);

export const Route = createFileRoute("/api/public/v1/reseller/keys/manage")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateResellerRequest(request);
        if (auth.response) return auth.response;
        const r = auth.reseller;
        if (!r) return Response.json({ error: "Acesso negado" }, { status: 403 });
        let body;
        try { body = Body.parse(await request.json()); } catch { return Response.json({ error: 'Corpo inválido. Ex: { "acao": "alterar", "chave": "sk-nx-...", "plano": "cc_7d" } | { "acao": "revogar" | "deletar", "chave": "sk-nx-..." }' }, { status: 400 }); }
        try {
          if (body.acao === "alterar") {
            if (!body.plano && body.dias === undefined) return Response.json({ error: "Envie plano e/ou dias" }, { status: 400 });
            const k = await updateResellerKey(r.id, body.chave, { plano: body.plano, dias: body.dias });
            return Response.json({ ok: true, plano: k.plano, status: k.status, validade: k.expires_at, limite_tokens: k.token_limit, tokens_usados: k.tokens_used });
          }
          if (body.acao === "revogar") { await revokeResellerKey(r.id, body.chave); return Response.json({ ok: true, status: "revoked" }); }
          await deleteResellerKey(r.id, body.chave);
          return Response.json({ ok: true, deletada: true });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Erro";
          return Response.json({ error: msg }, { status: msg === "Chave não encontrada" ? 404 : msg === RESELLER_ISSUANCE_DENIED ? 403 : 400 });
        }
      },
    },
  },
});
