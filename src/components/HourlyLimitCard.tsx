import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { brasiliaTime } from '@/lib/monthly-burst';
import type { HourlyStatus } from '@/lib/client-dashboard.functions';

const fmt = (n: number) => new Intl.NumberFormat('pt-BR').format(Math.round(n));
const millions = (n: number) => `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(n / 1_000_000)} mi`;

function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  return now;
}

export function countdown(resetsAt: string | null, now: number | null): string | null {
  if (!resetsAt || now == null) return null;
  const ms = new Date(resetsAt).getTime() - now;
  if (!(ms > 0)) return '0:00';
  const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Hourly token ceiling of a monthly-plan key: bar, used/limit and time until the counter resets. */
export function HourlyLimitCard({ status, plano, compact = false }: { status: HourlyStatus; plano?: string | null; compact?: boolean }) {
  const now = useNow();
  const expired = status.resetsAt != null && now != null && new Date(status.resetsAt).getTime() <= now;
  const used = expired ? 0 : status.used;
  const paused = status.paused && !expired;
  const pct = Math.min(100, (used / status.limit) * 100);
  const left = countdown(expired ? null : status.resetsAt, now);
  const at = brasiliaTime(status.resetsAt);
  const note = paused ? `Limite atingido. Sua chave volta às ${at} (horário de Brasília).`
    : status.resetsAt && !expired ? `O contador zera às ${at} (horário de Brasília).`
    : 'A contagem desta hora começa no seu próximo pedido.';
  const body = <>
    <div className="hourly-limit-head"><small>LIMITE POR HORA{plano ? ` · ${plano.toUpperCase()}` : ''}</small><span className={paused ? 'plan-uc-tag is-paused' : 'plan-uc-tag'}><Timer size={12} />{left ? `Zera em ${left}` : 'Aguardando uso'}</span></div>
    <strong className="hourly-limit-value">{fmt(used)} <em>de {fmt(status.limit)} tokens</em></strong>
    <Progress className="hourly-limit-bar" value={pct} aria-label="Uso do limite por hora" />
    <div className="hourly-limit-foot"><span>{millions(Math.max(0, status.limit - used))} restantes nesta hora</span><span>{Math.round(pct)}%</span></div>
    <p>{note}</p>
  </>;
  return compact ? <div className="hourly-limit is-compact">{body}</div> : <article className="plan-uc-card hourly-limit">{body}</article>;
}
