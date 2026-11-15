import { createFileRoute } from '@tanstack/react-router';
import { verifyWebhook, EventName, type PaddleEnv } from '@/lib/paddle.server';
import { fulfillCardTransaction } from '@/lib/card-payment.server';

// Segurança: assinatura verificada em toda requisição.
export const Route = createFileRoute('/api/public/payments/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const env = (new URL(request.url).searchParams.get('env') === 'live' ? 'live' : 'sandbox') as PaddleEnv;
        try {
          const event = await verifyWebhook(request, env);
          if (event.eventType === EventName.TransactionCompleted) await fulfillCardTransaction(event.data);
          return Response.json({ received: true });
        } catch (e) {
          console.error('Webhook error:', e instanceof Error ? e.message : e);
          return new Response('Webhook error', { status: 400 });
        }
      },
    },
  },
});
