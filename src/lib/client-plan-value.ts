type KeyPlan = { id: string; plano: string | null; client_id: string | null };
type Plan = { id: string; code: string | null; name: string; price_cents: number };
type ClientPlan = { id: string; plan_id: string | null };
type Payment = { status: string; api_key_id: string | null; upgrade_key_id: string | null; amount_cents: number };
const normalize = (value: string) => value.trim().toLowerCase();

export function clientPlanValue(key: KeyPlan | undefined, plans: Plan[], clients: ClientPlan[], payments: Payment[]): number | null {
  if (!key) return null;
  const purchase = payments.find(p => p.status === 'approved' && p.api_key_id === key.id && !p.upgrade_key_id);
  if (purchase) return purchase.amount_cents;
  const name = normalize(key.plano ?? '');
  const matching = plans.find(p => name && (normalize(p.name) === name || normalize(p.code ?? '') === name));
  if (matching) return matching.price_cents;
  const assigned = clients.find(c => c.id === key.client_id)?.plan_id;
  return plans.find(p => p.id === assigned)?.price_cents ?? null;
}