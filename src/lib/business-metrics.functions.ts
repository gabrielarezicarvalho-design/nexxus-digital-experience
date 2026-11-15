import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { BusinessClient, BusinessData, BusinessKey, BusinessPayment, BusinessPayout, BusinessPlan, BusinessReseller } from './business-metrics';
import { periodStart } from './business-metrics';
import { assertAdminAccess } from './admin-access';

// Deterministic, exhaustive pagination: no silent 1,000-row truncation.
async function readAll<T>(query: () => any): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await query().order('id').range(offset, offset + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

export const getAdminBusinessMetrics = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BusinessData> => {
    const { data: ok, error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (error || !ok) throw new Error('Acesso negado');
    const db = context.supabase;
    const [clients, keys, payments, payouts, plans, resellers] = await Promise.all([
      readAll<BusinessClient>(() => db.from('clients').select('id,name,email,user_id,status,created_at')),
      readAll<BusinessKey>(() => db.from('api_keys').select('id,client_id,user_id,reseller_id,plano,status,created_at,expires_at,token_limit,tokens_used,requests_count,reseller_cost_cents,reseller_blocked')),
      readAll<BusinessPayment>(() => db.from('payments').select('id,name,email,plan_code,amount_cents,status,created_at,approved_at,client_id,api_key_id')),
      readAll<BusinessPayout>(() => db.from('reseller_payouts').select('id,reseller_id,amount_cents,status,created_at,approved_at')),
      readAll<BusinessPlan>(() => db.from('plans').select('id,code,name,price_cents,active')),
      readAll<BusinessReseller>(() => db.from('resellers').select('id,name,email,status,cost_cents,debt_limit_cents')),
    ]);
    return { clients, keys, payments, payouts, plans, resellers, updatedAt: new Date().toISOString() };
  });

export type PeriodMetrics = { requests: number; views: number; firstView: string | null; devices: { name: string; count: number }[]; countries: { name: string; count: number }[]; dailyViews: { day: string; count: number }[] };
export const getAdminPeriodMetrics = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { days: number }) => {
    if (![1, 7, 30, 90].includes(data.days)) throw new Error('Período inválido');
    return data;
  })
  .handler(async ({ context, data }): Promise<PeriodMetrics> => {
    await assertAdminAccess(context.supabase, context.userId);
    const now = new Date();
    const result = await context.supabase.rpc('admin_metrics_period', { _start: periodStart(data.days, now).toISOString(), _end: now.toISOString() });
    if (result.error) throw new Error(result.error.message);
    return result.data as unknown as PeriodMetrics;
  });