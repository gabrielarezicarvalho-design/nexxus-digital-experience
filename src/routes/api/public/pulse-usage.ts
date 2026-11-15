import { createFileRoute } from '@tanstack/react-router';
import { resellerPanelHtml } from '@/lib/pulse-panel';

const hits = new Map<string, { count: number; until: number }>();
const headers = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff' };

export const Route = createFileRoute('/api/public/pulse-usage')({
  server: { handlers: {
    GET: ({ request }) => {
      const host = (request.headers.get('x-forwarded-host') || new URL(request.url).hostname).split(':')[0] ?? '';
      return new Response(resellerPanelHtml(host, request.headers.get('accept-language') ?? '', request.headers.get('cf-ipcountry') ?? ''), { headers: { ...headers, 'content-type': 'text/html; charset=utf-8' } });
    },
    POST: async ({ request }) => {
      // The submitted client key authorizes only its own aggregate counters.
      const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
      const now = Date.now();
      for (const [id, hit] of hits) if (hit.until <= now) hits.delete(id);
      const hit = hits.get(ip) ?? { count: 0, until: now + 60_000 };
      if (hit.count >= 20) return Response.json({ error: 'Muitas consultas' }, { status: 429, headers });
      hit.count++; hits.set(ip, hit);
      try {
        const { keyUsageInput, readKeyUsage } = await import('@/lib/key-usage.server');
        const input = keyUsageInput.safeParse(await request.json());
        if (!input.success) return Response.json({ found: false }, { status: 400, headers });
        return Response.json(await readKeyUsage(input.data.key), { headers });
      } catch {
        return Response.json({ error: 'Consulta indisponível' }, { status: 503, headers });
      }
    },
  } },
});