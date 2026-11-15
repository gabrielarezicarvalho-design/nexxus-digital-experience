import { createServerOnlyFn } from '@tanstack/react-start';
import { pushFailureAction } from './push-rules';

export const dispatchOutagePush = createServerOnlyFn(async () => {
  const apiKey = process.env['LOVABLE_API_KEY'];
  const connectionKey = process.env['FIREBASE_MESSAGING_API_KEY'];
  if (!apiKey || !connectionKey) return;
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const evaluation = await db.rpc('evaluate_push_outage');
  if (evaluation.error) throw new Error(evaluation.error.message);
  const { data: deliveries, error } = await db.rpc('claim_push_deliveries');
  if (error) throw new Error(error.message);
  // Bounded batches; the existing minute monitor drains the persisted queue.
  for (let offset = 0; offset < (deliveries?.length ?? 0); offset += 10) {
    await Promise.all((deliveries ?? []).slice(offset, offset + 10).map(async delivery => {
      try {
        const response = await fetch('https://connector-gateway.lovable.dev/firebase_messaging/v1/projects/_/messages:send', {
          method: 'POST', signal: AbortSignal.timeout(5000),
          headers: { Authorization: `Bearer ${apiKey}`, 'X-Connection-Api-Key': connectionKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: {
            token: delivery.token,
            notification: { title: 'NEXA CLOUD — indisponibilidade', body: 'Nenhum fornecedor entregou respostas por mais de três minutos. Acompanhe a página de Status.' },
            data: { path: '/status', incident: delivery.incident_id },
            webpush: { notification: { icon: '/app-icon-192.png', tag: delivery.incident_id }, fcm_options: { link: 'https://cloudnexapro.site/status' } },
          } }),
        });
        if (response.ok) {
          await db.from('push_deliveries').update({ sent_at: new Date().toISOString(), last_status: response.status }).eq('id', delivery.delivery_id);
          return;
        }
        const body = await response.text();
        let code = '';
        try { const parsed = JSON.parse(body); code = parsed.error?.details?.find((d: { errorCode?: string }) => d.errorCode)?.errorCode ?? ''; } catch { /* non-JSON provider error */ }
        // Do not log registration tokens or echo a provider body that may contain them.
        console.error('Push provider failure', response.status, code || 'unclassified');
        const action = pushFailureAction(response.status, code);
        if (action === 'delete') await db.from('push_devices').delete().eq('id', delivery.device_id);
        else await db.from('push_deliveries').update({ last_status: response.status, attempts: action === 'stop' ? 5 : delivery.attempts, retry_at: new Date(Date.now() + Math.min(3600000, 60000 * 2 ** delivery.attempts)).toISOString() }).eq('id', delivery.delivery_id);
      } catch {
        await db.from('push_deliveries').update({ last_status: 503, retry_at: new Date(Date.now() + 60000 * 2 ** delivery.attempts).toISOString() }).eq('id', delivery.delivery_id);
      }
    }));
  }
});