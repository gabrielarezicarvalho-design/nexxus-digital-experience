import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { analyticsPath, countryCode } from '@/lib/site-analytics';

const input = z.object({ id: z.string().uuid(), path: z.string().max(200).refine(analyticsPath), device: z.enum(['mobile', 'desktop', 'tablet']), consent: z.literal(true) }).strict();
export const Route = createFileRoute('/api/public/site-view')({
  server: { handlers: { POST: async ({ request }) => {
    const url = new URL(request.url);
    const origin = request.headers.get('origin');
    const allowedHosts = ['cloudnexapro.site', 'www.cloudnexapro.site', 'nexaproclaude.lovable.app', 'id-preview--6953dca0-27e3-4b71-b549-07cb3f46f81a.lovable.app', 'localhost'];
    if (!origin || origin !== url.origin || !allowedHosts.includes(url.hostname) || request.headers.get('sec-fetch-site') === 'cross-site') return new Response(null, { status: 403 });
    if (Number(request.headers.get('content-length') ?? 0) > 1024) return new Response(null, { status: 413 });
    const text = await request.text();
    if (text.length > 1024) return new Response(null, { status: 413 });
    let body: unknown;
    try { body = JSON.parse(text); } catch { return new Response(null, { status: 400 }); }
    const parsed = input.safeParse(body);
    if (!parsed.success) return new Response(null, { status: 400 });
    // Edge-derived country only; never infer it from language or accept it from the body.
    const cf = (request as Request & { cf?: { country?: string } }).cf;
    const country = countryCode(cf?.country ?? request.headers.get('cf-ipcountry'));
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('site_page_views').upsert({ id: parsed.data.id, path: parsed.data.path, device: parsed.data.device, country }, { onConflict: 'id', ignoreDuplicates: true });
    if (error) { console.error('Site view persistence failed:', error.message); return new Response(null, { status: 503 }); }
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  } } },
});