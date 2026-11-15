// Regras da página de status: uptime, cobertura e cor das barras do histórico.
// Uptime = verificações certas ÷ verificações feitas. Cobertura = quanto do
// período foi realmente medido. Tempo sem medição nunca conta como disponível.

export type StatusRange = { key: string; checks: number; ok: number; expected: number };
export type StatusDay = { day: string; checks: number; ok: number };
export type DeliveryRange = { key: string; requests: number; failures: number };
export type DeliveryDay = { day: string; requests: number; failures: number };
export type StatusHour = { hour: string; checks: number; ok: number; requests: number; failures: number };
export type StatusSummary = {
  since: string | null;
  last: { checkedAt: string; ok: boolean; dbOk: boolean; gatewayOk: boolean; latencyMs: number | null; note: string | null } | null;
  ranges: StatusRange[];
  days: StatusDay[];
  delivery: DeliveryRange[];
  deliveryDays: DeliveryDay[];
  providersDown: boolean;
  lastFailureAt: string | null;
  hours?: StatusHour[];
  outages?: StatusOutage[];
};

// Queda = site ou fornecedores parados por mais de OUTAGE_MIN_MINUTES seguidos
// (calculado no banco). Falhas curtas ou isoladas não aparecem como falha.
export type StatusOutage = { start: string; end: string };
export const OUTAGE_MIN_MINUTES = 10;

// Minutos de queda dentro do intervalo [from, to).
export function outageMinutesBetween(outages: StatusOutage[], from: number, to: number): number {
  let total = 0;
  for (const o of outages) {
    const s = Math.max(Date.parse(o.start), from);
    const e = Math.min(Date.parse(o.end), to);
    if (e > s) total += (e - s) / 60000;
  }
  return Math.round(total);
}

export function outagesBetween(outages: StatusOutage[], from: number, to: number): number {
  return outages.filter(o => Date.parse(o.end) > from && Date.parse(o.start) < to).length;
}

// Uptime do período: minutos medidos menos minutos em queda longa.
export function rangeUptime(measuredMinutes: number, outageMinutes: number): number | null {
  if (measuredMinutes <= 0) return null;
  return uptimePercent(Math.max(0, measuredMinutes - outageMinutes), measuredMinutes);
}

export type BarState = 'none' | 'ok' | 'partial' | 'fail';

export type DeliveryState = 'up' | 'partial' | 'down' | 'wait';
export type DeliveryObservation = { checkedAt: string; state: DeliveryState; requests: number; successes: number; failures: number };
export type DeliveryStatusSummary = {
  since: string | null;
  last: (NonNullable<StatusSummary['last']> & { deliveryState: DeliveryState; requests: number; successes: number; failures: number }) | null;
  observations: DeliveryObservation[];
  totals: { checks: number; available: number; measured: number; requests: number; successes: number; failures: number };
};

export function deliveryObservationState(gatewayOk: boolean, requests: number, successes: number, failures: number): DeliveryState {
  if (!gatewayOk) return 'down';
  if (requests === 0) return 'wait';
  if (successes === 0) return 'down';
  return failures > 0 ? 'partial' : 'up';
}

export function buildObservationBars(observations: DeliveryObservation[], now: Date = new Date()) {
  const current = Math.floor(now.getTime() / 60000) * 60000;
  const found = new Map(observations.map(o => [Math.floor(Date.parse(o.checkedAt) / 60000) * 60000, o]));
  return Array.from({ length: 1440 }, (_, index) => {
    const minute = current - (1439 - index) * 60000;
    return found.get(minute) ?? { checkedAt: new Date(minute).toISOString(), state: 'wait' as const, requests: 0, successes: 0, failures: 0 };
  });
}

export function latestDeliveryState(last: DeliveryStatusSummary['last'], now: Date = new Date()): DeliveryState {
  if (!last || now.getTime() - Date.parse(last.checkedAt) > 180000) return 'wait';
  return last.deliveryState;
}

const CHECKS_PER_DAY = 1440;

export function uptimePercent(ok: number, checks: number): number | null {
  if (checks <= 0) return null;
  return Math.round((ok / checks) * 10000) / 100;
}

export function coveragePercent(checks: number, expected: number): number | null {
  if (expected <= 0 || checks <= 0) return null;
  return Math.min(100, Math.round((checks / expected) * 10000) / 100);
}

// Só pinta de vermelho quando o total de falhas passa deste limite.
export const RED_BAR_MIN_FAILURES = 20;

export function dayState(checks: number, ok: number, expected: number = CHECKS_PER_DAY, redAbove: number = 0): BarState {
  if (checks <= 0) return 'none';
  if (checks - ok > redAbove) return 'fail';
  if (checks < expected * 0.9) return 'partial';
  return 'ok';
}

export function buildDayBars(days: StatusDay[], now: Date = new Date()) {
  const found = new Map(days.map(d => [d.day, d]));
  const startOfToday = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  const bars: { day: string; checks: number; ok: number; state: BarState }[] = [];
  for (let back = 29; back >= 0; back -= 1) {
    const day = new Date(startOfToday - back * 864e5).toISOString().slice(0, 10);
    const row = found.get(day);
    const checks = row?.checks ?? 0;
    const ok = row?.ok ?? 0;
    // O dia em curso só pode ter sido medido até o minuto atual.
    const expected = back === 0 ? Math.max(1, Math.floor((now.getTime() - startOfToday) / 60000)) : CHECKS_PER_DAY;
    bars.push({ day, checks, ok, state: dayState(checks, ok, expected) });
  }
  return bars;
}

export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(2).replace('.', ',')}%`;
}

export function buildAvailabilityDays(days: StatusDay[], deliveryDays: DeliveryDay[], outages: StatusOutage[] = [], now: Date = new Date()) {
  const deliveries = new Map(deliveryDays.map(d => [d.day, d]));
  return buildDayBars(days, now).map(bar => {
    const delivery = deliveries.get(bar.day);
    const requests = delivery?.requests ?? 0;
    const failures = delivery?.failures ?? 0;
    const totalFailures = bar.checks - bar.ok + failures;
    const start = Date.parse(`${bar.day}T00:00:00Z`);
    const outageMinutes = outageMinutesBetween(outages, start, start + 864e5);
    const outageCount = outagesBetween(outages, start, start + 864e5);
    // Só fica vermelho quando houve queda de mais de 10 minutos seguidos.
    const state: BarState = bar.checks === 0 && requests === 0 ? 'none'
      : outageMinutes > 0 ? 'fail'
      : bar.state === 'partial' ? 'partial'
      : 'ok';
    return { ...bar, requests, failures, totalFailures, outageMinutes, outageCount, state };
  });
}

export function buildAvailabilityHours(hours: StatusHour[], now: Date = new Date()) {
  const found = new Map(hours.map(h => [Date.parse(h.hour), h]));
  const currentHour = Math.floor(now.getTime() / 36e5) * 36e5;
  return Array.from({ length: 24 }, (_, index) => {
    const timestamp = currentHour - (23 - index) * 36e5;
    const row = found.get(timestamp);
    const checks = row?.checks ?? 0;
    const ok = row?.ok ?? 0;
    const requests = row?.requests ?? 0;
    const failures = row?.failures ?? 0;
    const expected = index === 23 ? Math.max(1, Math.floor((now.getTime() - timestamp) / 60000)) : 60;
    const totalFailures = checks - ok + failures;
    const state: BarState = checks === 0 && requests === 0 ? 'none'
      : totalFailures > RED_BAR_MIN_FAILURES ? 'fail'
      : dayState(checks, ok, expected, RED_BAR_MIN_FAILURES) === 'partial' ? 'partial'
      : 'ok';
    return { hour: new Date(timestamp).toISOString(), checks, ok, requests, failures, totalFailures, state };
  });
}

// O indicador fica vermelho quando o monitor falha OU quando os pedidos dos
// clientes estão falhando em todos os fornecedores (nenhuma resposta boa
// nos últimos minutos, com tráfego acontecendo).
export type LiveState = 'up' | 'down' | 'wait';
export function liveState(last: StatusSummary['last'], providersDown: boolean | undefined): LiveState {
  if (!last) return 'wait';
  if (providersDown) return 'down';
  return last.ok ? 'up' : 'down';
}

// Taxa de falha na entrega = pedidos com erro ÷ pedidos feitos.
export function failurePercent(failures: number, requests: number): number | null {
  if (requests <= 0) return null;
  return Math.round((failures / requests) * 10000) / 100;
}

// Barras dos dias de entrega: dia sem pedido fica "sem dados"; o dia só fica
// vermelho quando passa do limite de falhas.
export function buildDeliveryBars(days: DeliveryDay[], now: Date = new Date()) {
  const found = new Map(days.map(d => [d.day, d]));
  const startOfToday = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  const bars: { day: string; requests: number; failures: number; state: BarState }[] = [];
  for (let back = 29; back >= 0; back -= 1) {
    const day = new Date(startOfToday - back * 864e5).toISOString().slice(0, 10);
    const row = found.get(day);
    const requests = row?.requests ?? 0;
    const failures = row?.failures ?? 0;
    bars.push({ day, requests, failures, state: dayState(requests, requests - failures, 1, RED_BAR_MIN_FAILURES) });
  }
  return bars;
}

export function formatStamp(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'America/Sao_Paulo' });
}
