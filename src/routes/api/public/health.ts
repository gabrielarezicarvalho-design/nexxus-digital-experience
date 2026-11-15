import { createFileRoute } from '@tanstack/react-router';
import { authenticateCronRequest } from '@/integrations/supabase/cron-auth';

// Verificação de disponibilidade chamada a cada minuto por um monitor separado
// do processo web (agenda HTTP gerenciada). Cada execução mede o banco e a
// resposta pública do gateway e guarda o resultado em public.status_checks.
const KEEP_DAYS = 60;

export const Route = createFileRoute('/api/public/health')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const failure = await authenticateCronRequest(request);
        if (failure) return failure;

        const started = Date.now();
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

        const probe = await supabaseAdmin.from('status_checks').select('id').limit(1);
        const dbOk = !probe.error;
        let note: string | null = probe.error ? `banco: ${probe.error.message}`.slice(0, 180) : null;

        // O mesmo endereço público que o cliente usa, medido por HTTPS.
        let gatewayOk = false;
        try {
          const answer = await fetch(new Request(new URL('/api/public/v1/messages', request.url), { method: 'GET' }));
          gatewayOk = answer.status < 500;
          if (!gatewayOk) note = note ?? `gateway: HTTP ${answer.status}`;
        } catch (error) {
          note = note ?? `gateway: ${error instanceof Error ? error.message : 'sem resposta'}`.slice(0, 180);
        }

        const latencyMs = Date.now() - started;
        await supabaseAdmin.from('status_checks').insert({
          ok: dbOk && gatewayOk,
          db_ok: dbOk,
          gateway_ok: gatewayOk,
          latency_ms: latencyMs,
          note,
        });
        await supabaseAdmin.from('status_checks').delete().lt('checked_at', new Date(Date.now() - KEEP_DAYS * 864e5).toISOString());

        try {
          const { dispatchOutagePush } = await import('@/lib/push-dispatch.server');
          await dispatchOutagePush();
        } catch { console.error('Outage push monitor failed; gateway measurement preserved'); }

        return Response.json({ ok: dbOk && gatewayOk, dbOk, gatewayOk, latencyMs, checkedAt: new Date().toISOString() });
      },
    },
  },
});
