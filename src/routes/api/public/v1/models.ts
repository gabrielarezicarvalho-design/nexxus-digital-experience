import { createFileRoute } from "@tanstack/react-router";
import { sha256Hex } from '@/lib/keys.server';
import { clientModelNames } from '@/lib/client-models.server';
import { asFamily, filterByFamily } from '@/lib/model-family';
import { keyProvider } from '@/lib/key-provider';
import { filterPlanModels } from '@/lib/plan-models';

export const Route = createFileRoute("/api/public/v1/models")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        let family = asFamily('claude');
        let allowed: string[] | null = null;
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const token = (request.headers.get('x-api-key') ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '').trim();
        if (token) {
          const { data: key, error } = await db.from('api_keys').select('client_id,status,reseller_blocked,expires_at,model_family,forced_provider,allowed_models,clients(status,forced_provider)')
            .eq('key_hash', await sha256Hex(token)).maybeSingle();
          if (error || !key) return Response.json({ error: { message: 'API key inválida' } }, { status: 401 });
          const client = key.clients as unknown as { status: string; forced_provider?: string | null } | null;
          if ((key.status !== 'active' && key.status !== 'exhausted') || key.reseller_blocked || (client && client.status !== 'active') || (key.expires_at && new Date(key.expires_at) < new Date())) {
            return Response.json({ error: { message: 'API key indisponível' } }, { status: 403 });
          }
          family = asFamily(key.model_family);
          allowed = key.allowed_models ?? null;
          const forcedProvider = keyProvider(key);
          if (forcedProvider) {
            const names = await clientModelNames(db, forcedProvider, key.client_id, family, allowed);
            return Response.json({ object: 'list', data: names.map(id => ({ id, object: 'model', created: 0, owned_by: 'nexa' })) }, { headers: { 'Cache-Control': 'no-store' } });
          }
        }
        const { data } = await db.from("models").select("name, created_at").eq("enabled", true).eq("catalog_approved", true);
        return Response.json({
          object: "list",
          // O mesmo nome pode estar em vários fornecedores: lista uma vez só.
          data: (data ?? []).filter((m, i, all) => all.findIndex((o) => o.name === m.name) === i).filter((m) => filterPlanModels(allowed, filterByFamily(family, [m.name])).length).map((m) => ({ id: m.name, object: "model", created: Math.floor(new Date(m.created_at).getTime() / 1000), owned_by: "anthropic" })),
        }, { headers: { 'Cache-Control': 'no-store' } });
      },
    },
  },
});
