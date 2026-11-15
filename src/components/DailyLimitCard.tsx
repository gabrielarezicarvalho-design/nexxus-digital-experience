import { RefreshCw, Timer } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

const fmt = (n: number) => n.toLocaleString('pt-BR');
const millions = (n: number) => `${(n / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`;

/** Daily token ceiling of monthly plans; renews at midnight Brasília time. */
export function DailyLimitCard({ used, limit, plano, compact = false, onReset }: { used: number; limit: number; plano?: string | null; compact?: boolean; onReset?: () => void }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const body = <>
    <div className="hourly-limit-head"><small>LIMITE DIÁRIO{plano ? ` · ${plano.toUpperCase()}` : ''}</small><span className={pct >= 100 ? 'plan-uc-tag is-paused' : 'plan-uc-tag'}><Timer size={12} />Zera à meia-noite</span></div>
    <strong className="hourly-limit-value">{fmt(Math.min(used, limit))} <em>de {fmt(limit)} tokens hoje</em></strong>
    <Progress className="hourly-limit-bar" value={pct} aria-label="Uso do limite diário" />
    <div className="hourly-limit-foot"><span>{millions(Math.max(0, limit - used))} restantes hoje</span><span>{Math.round(pct)}%</span></div>
    {onReset ? <Button variant="outline" size="sm" className="hourly-limit-reset" onClick={onReset}><RefreshCw />Resetar limite</Button> : null}
  </>;
  return compact ? <div className="hourly-limit is-compact">{body}</div> : <article className="plan-uc-card hourly-limit">{body}</article>;
}
