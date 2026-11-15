import { z } from 'zod';
import { sha256Hex } from './keys.server';
import { hasDailyReset, nextBrasiliaMidnight } from './daily-reset';

export const keyUsageInput = z.object({ key: z.string().trim().min(10).max(200) });

export async function readKeyUsage(key: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: k, error } = await supabaseAdmin.from('api_keys')
    .select('id,plano,status,token_limit,daily_token_limit,tokens_used,requests_count,expires_at,reseller_blocked,last_used_at')
    .eq('key_hash', await sha256Hex(key)).maybeSingle();
  if (error) throw new Error('Consulta indisponível');
  if (!k) return { found: false as const };
  const expired = !!k.expires_at && new Date(k.expires_at) < new Date();
  const exhausted = k.token_limit != null && k.tokens_used >= k.token_limit;
  let dailyReset: { plan: string | null; limit: number; usedToday: number; resetsAt: string } | null = null;
  if (hasDailyReset(k)) {
    // Aggregate restricted to the key the submitted secret already identified.
    const today = await supabaseAdmin.rpc('key_tokens_today', { _key_id: k.id });
    dailyReset = {
      plan: k.plano ?? null, limit: Number(k.daily_token_limit),
      usedToday: today.error ? 0 : Number(today.data ?? 0),
      resetsAt: nextBrasiliaMidnight().toISOString(),
    };
  }
  return {
    found: true as const,
    status: k.status !== 'active' || k.reseller_blocked ? 'bloqueada' : expired ? 'expirada' : exhausted ? 'esgotada' : 'ativa',
    tokensUsed: Number(k.tokens_used), tokenLimit: k.token_limit == null ? null : Number(k.token_limit),
    requests: Number(k.requests_count), expiresAt: k.expires_at, lastUsedAt: k.last_used_at,
    dailyReset,
  };
}
