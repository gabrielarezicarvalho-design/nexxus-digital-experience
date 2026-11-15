export type BusinessKey = { id: string; client_id: string | null; user_id: string | null; reseller_id: string | null; plano: string | null; status: string; created_at: string; expires_at: string | null; token_limit: number | null; tokens_used: number; requests_count: number; reseller_cost_cents: number; reseller_blocked?: boolean };
export type BusinessPayment = { id: string; name: string; email: string; plan_code: string; amount_cents: number; status: string; created_at: string; approved_at: string | null; client_id: string | null; api_key_id: string | null };
export type BusinessPayout = { id: string; reseller_id: string; amount_cents: number; status: string; created_at: string; approved_at: string | null };
export type BusinessClient = { id: string; name: string; email: string; user_id: string | null; status: string; created_at: string };
export type BusinessPlan = { code: string | null; name: string; price_cents: number; active?: boolean };
export type BusinessReseller = { id: string; name: string; email: string; status: string; cost_cents: number; debt_limit_cents: number };
export type BusinessData = { clients: BusinessClient[]; keys: BusinessKey[]; payments: BusinessPayment[]; payouts: BusinessPayout[]; plans: BusinessPlan[]; resellers: BusinessReseller[]; updatedAt: string };

export const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export const dayKey = (date: string | Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));
export function periodStart(days: number, now: Date) {
  const today = new Date(`${dayKey(now)}T00:00:00-03:00`);
  return new Date(today.getTime() - (days - 1) * 86400000);
}
export function inPeriod(date: string | null, start: Date, end: Date) {
  if (!date) return false;
  const time = new Date(date).getTime();
  return time >= start.getTime() && time <= end.getTime();
}
export function activeKey(key: BusinessKey, now: Date) {
  return key.status === 'active' && !key.reseller_blocked && (!key.expires_at || new Date(key.expires_at) > now) && (key.token_limit == null || key.tokens_used < key.token_limit);
}
export function registeredInPeriod(clients: BusinessClient[], days: number, now: Date) {
  return clients.filter(c => c.user_id && inPeriod(c.created_at, periodStart(days, now), now));
}
export function activePlanDistribution(data: BusinessData, days: number, now: Date) {
  const distribution = new Map<string, number>();
  data.keys.filter(k => activeKey(k, now) && inPeriod(k.created_at, periodStart(days, now), now)).forEach(k => {
    const name = [...data.plans].sort((a,b) => b.name.length - a.name.length).find(p => k.plano === p.name || k.plano?.startsWith(p.name + ' ·'))?.name ?? k.plano ?? 'Sem plano';
    distribution.set(name, (distribution.get(name) ?? 0) + 1);
  });
  return [...distribution].map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);
}
export function approvedRevenue(payments: BusinessPayment[], start: Date, end: Date) {
  return payments.filter(p => p.status === 'approved' && inPeriod(p.approved_at ?? p.created_at, start, end)).reduce((sum, p) => sum + p.amount_cents, 0);
}
export function resellerTotals(keys: BusinessKey[], payouts: BusinessPayout[], resellerId: string) {
  const own = keys.filter(k => k.reseller_id === resellerId);
  const generated = own.reduce((sum, k) => sum + k.reseller_cost_cents, 0);
  const paid = payouts.filter(p => p.reseller_id === resellerId && p.status === 'approved').reduce((sum, p) => sum + p.amount_cents, 0);
  return { count: own.length, generated, paid, pending: Math.max(0, generated - paid) };
}
export function timeline(data: BusinessData, days: number, now: Date) {
  const start = periodStart(days, now);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start.getTime() + index * 86400000);
    const key = dayKey(date);
    const payments = data.payments.filter(p => p.status === 'approved' && dayKey(p.approved_at ?? p.created_at) === key && new Date(p.approved_at ?? p.created_at) <= now);
    return { day: key.slice(8) + '/' + key.slice(5, 7), cadastros: data.clients.filter(c => c.user_id && dayKey(c.created_at) === key).length, chaves: data.keys.filter(k => dayKey(k.created_at) === key).length, compras: payments.length, receita: payments.reduce((s, p) => s + p.amount_cents, 0) / 100 };
  });
}