// Monthly plans have an hourly token ceiling: the window opens on the first request, lasts 1 hour,
// and reaching the ceiling blocks the key until the window ends; then the counter restarts from zero.
export const MONTHLY_BURST_LIMITS: Record<string, number> = {
  Pro: 100_000_000, Max: 100_000_000, Enterprise: 200_000_000, Teams: 250_000_000,
  'GPT Pro': 100_000_000, 'GPT Max': 100_000_000, 'GPT Enterprise': 200_000_000, 'GPT Teams': 250_000_000,
};
export const MONTHLY_BURST_PAUSE_MS = 60 * 60 * 1000;
const NEXT_PLAN: Record<string, string> = { Pro: 'Enterprise', Max: 'Enterprise', Enterprise: 'Teams', 'GPT Pro': 'GPT Enterprise', 'GPT Max': 'GPT Enterprise', 'GPT Enterprise': 'GPT Teams' };

export function monthlyBurstLimit(plano: string | null | undefined): number | null {
  return (plano && MONTHLY_BURST_LIMITS[plano]) || null;
}

export function brasiliaTime(at: string | Date | null | undefined): string | null {
  const d = at ? new Date(at) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }) : null;
}

export function monthlyBurstMessage(plano: string | null | undefined, pausedUntil: string | Date | null | undefined): string {
  const lim = monthlyBurstLimit(plano);
  const amount = lim ? `${Math.round(lim / 1_000_000)} milhões de tokens por hora` : 'tokens por hora';
  const time = brasiliaTime(pausedUntil);
  const next = plano ? NEXT_PLAN[plano] : undefined;
  return `Limite de ${amount} do plano ${plano ?? 'mensal'} atingido. Sua chave volta a funcionar ${time ? `às ${time} (horário de Brasília)` : 'em até 1 hora'}.`
    + (next ? ` Para ter mais tokens por hora, faça upgrade para o plano ${next} em https://cloudnexapro.site.` : '');
}

type BurstKey = { plano?: string | null; reseller_id?: string | null; burst_token_limit?: number | null; burst_window_minutes?: number | null; burst_pause_minutes?: number | null; burst_exempt?: boolean | null };

// Per-key override (admin) wins over the monthly plan default; reseller keys only get a ceiling via override.
export function keyBurstLimit(key: BurstKey): number | null {
  if (key.burst_exempt) return null;
  if (key.burst_token_limit != null && key.burst_token_limit > 0) return Number(key.burst_token_limit);
  return key.reseller_id == null ? monthlyBurstLimit(key.plano) : null;
}

export function keyBurstMessage(key: BurstKey, pausedUntil: string | Date | null | undefined): string {
  if (key.burst_token_limit == null) return monthlyBurstMessage(key.plano, pausedUntil);
  const minutes = key.burst_window_minutes ?? 60;
  const span = minutes % 60 === 0 ? (minutes === 60 ? 'por hora' : `a cada ${minutes / 60} horas`) : `a cada ${minutes} minutos`;
  const time = brasiliaTime(pausedUntil);
  if (key.burst_pause_minutes != null) {
    const pause = key.burst_pause_minutes % 60 === 0 ? `${key.burst_pause_minutes / 60} ${key.burst_pause_minutes === 60 ? 'hora' : 'horas'}` : `${key.burst_pause_minutes} minutos`;
    return `Limite de ${Math.round(Number(key.burst_token_limit) / 1_000_000)} milhões de tokens da sua chave atingido. Espera de ${pause}: sua chave volta a funcionar ${time ? `às ${time} (horário de Brasília)` : `em ${pause}`}.`;
  }
  return `Limite de ${Math.round(Number(key.burst_token_limit) / 1_000_000)} milhões de tokens ${span} da sua chave atingido. Sua chave volta a funcionar ${time ? `às ${time} (horário de Brasília)` : 'quando a janela terminar'}.`;
}
