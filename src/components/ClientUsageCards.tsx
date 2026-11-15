import { useState } from 'react';
import { Activity, CalendarDays, Clock3, Database, Flame, KeyRound, Layers, MessageSquare, RefreshCw, Star, Sun, Trophy, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { CacheUsage, ClientCall, ClientUsage } from '@/lib/client-usage';
import { modelUsageInsights, usageInsights } from '@/lib/client-usage-insights';
import { usageCostCents, dailyUsageCost, callsSavings, cacheSavingsCents } from '@/lib/client-usage-pricing';
import type { ModelPriceCatalog } from '@/lib/client-model-pricing';
import { ModelBrandIcon } from '@/components/ModelBrandIcon';

const number = (value: number) => new Intl.NumberFormat('pt-BR').format(value);
const money = (cents: number | null) => cents == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
const money4 = (cents: number | null) => cents == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(cents / 100);
const compact = (value: number) => new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const date = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'America/Sao_Paulo' });

export function ClientUsageCards({ usage, prices, costUsage, activeKeys = 0, onRefresh, refreshing = false, afterHistory, calls = [], cache }: { usage: ClientUsage | undefined; prices: ModelPriceCatalog; costUsage?: Pick<ClientUsage, 'by_model' | 'daily_by_model' | 'daily'> | undefined; activeKeys?: number; onRefresh?: () => void; refreshing?: boolean; afterHistory?: import('react').ReactNode; calls?: ClientCall[]; cache?: CacheUsage | undefined }) {
  const [range, setRange] = useState(30);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const visibleCalls = onlyErrors ? calls.filter(c => (c.status_code ?? 0) >= 400) : calls;
  const callsCompare = callsSavings(calls, prices);
  const cacheRead = calls.reduce((sum, c) => sum + (c.cached_tokens ?? 0), 0);
  const cacheCallsSaved = cacheSavingsCents(calls.map(c => ({ model: c.model, discount_tokens: c.cache_discount_tokens ?? 0 })), prices);
  const cacheTotalSaved = cacheSavingsCents(cache?.by_model ?? [], prices);
  const cacheShare = (() => { const input = calls.reduce((sum, c) => sum + c.prompt_tokens + (c.cache_discount_tokens ?? 0), 0); return input > 0 ? cacheRead / input * 100 : 0; })();
  const pct = (value: number) => `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)}%`;
  const callTime = (value: string) => new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo' });
  const insights = usageInsights(usage?.daily ?? [], range);
  const models = modelUsageInsights(usage, range);
  const averageTime = models.averageLatencyMs === null ? '—' : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(models.averageLatencyMs / 1000)} s`;
  const periods = [{ label: 'Hoje', days: 1 }, { label: '7 dias', days: 7 }, { label: '30 dias', days: 30 }, { label: '3 meses', days: 90 }, { label: '6 meses', days: 180 }, { label: '1 ano', days: 365 }];
  const metrics = [
    { label: 'Requisições', icon: Activity, value: number(insights.total.requests), note: range === 1 ? 'hoje' : `nos últimos ${range} dias` },
    { label: 'Tokens', icon: Database, value: compact(insights.total.tokens), note: 'entrada + saída' },
    { label: 'Dias ativos', icon: CalendarDays, value: number(insights.activeDays), note: `de ${range} ${range === 1 ? 'dia' : 'dias'}` },
    { label: 'Sequência atual', icon: Flame, value: `${insights.currentStreak} dias`, note: 'seguidos com uso' },
    { label: 'Melhor sequência', icon: Trophy, value: `${insights.bestStreak} dias`, note: 'no período selecionado' },
    { label: 'Melhor dia', icon: Sun, value: insights.bestDay ? date(insights.bestDay.day) : '—', note: insights.bestDay ? `${number(insights.bestDay.tokens)} tokens` : 'sem uso ainda' },
    { label: 'Modelo favorito', icon: Star, value: models.favorite?.model.replace(/^(?:claude|gpt)[-\s]+/i, '') ?? '—', note: models.favorite ? `${number(models.favorite.requests)} requisições no período` : models.available ? 'sem modelo registrado no período' : 'dados indisponíveis' },
  ];
  const peak = Math.max(1, ...insights.days.map(day => day.tokens));
  const summary = [
    { label: 'COMANDOS HOJE', icon: MessageSquare, value: number(usage?.today_requests ?? 0), note: 'Hoje · horário de Brasília', accent: true },
    { label: 'COMANDOS TOTAIS', icon: Activity, value: number(usage?.total_requests ?? 0), note: 'Todos os pedidos registrados' },
    { label: 'TOKENS PROCESSADOS', icon: Zap, value: number(usage?.total_tokens ?? 0), note: 'Entrada + saída' },
    { label: 'CHAVES ATIVAS', icon: KeyRound, value: number(activeKeys), note: 'Credenciais disponíveis' },
    { label: 'MODELOS USADOS', icon: Layers, value: number(usage?.models_used ?? 0), note: 'Modelos distintos nos pedidos' },
  ];
  return <div className="client-usage-cards">
    <div className="client-usage-heading client-usage-title"><div><h2>Uso</h2><p>Cada pedido que você fez e como ele se distribui.</p></div><Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing} aria-label="Atualizar uso"><RefreshCw className={refreshing ? 'animate-spin' : undefined} />Atualizar</Button></div>
    <div className="client-usage-summary">{summary.map(card => <article key={card.label} className="client-usage-summary-card"><div className="client-usage-summary-head"><span>{card.label}</span><i><card.icon size={16} /></i></div><strong className={card.accent ? 'is-accent' : ''}>{card.value}</strong><small>{card.note}</small></article>)}</div>
    <section className="client-usage-section" aria-labelledby="usage-history-title">
      <div className="client-usage-heading"><div><h2 id="usage-history-title">Histórico de uso</h2><p>{insights.total.requests ? `${number(insights.total.requests)} requisições no período` : 'Ainda sem uso neste período.'}</p></div>
        <div className="client-workspace-range" aria-label="Período do histórico">{periods.map(period => <Button key={period.days} variant="ghost" disabled={period.days > 30} title={period.days > 30 ? 'Histórico disponível: últimos 30 dias' : undefined} aria-pressed={range === period.days} className={range === period.days ? 'is-active' : ''} onClick={() => setRange(period.days)}>{period.label}</Button>)}</div>
      </div>
      <div className="client-usage-history-metrics">{metrics.map(metric => <article className="client-usage-metric" key={metric.label}><span><metric.icon size={16} />{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small></article>)}</div>
      <TooltipProvider delayDuration={100}><div className="client-usage-calendar" aria-label="Atividade diária"><div className="client-usage-calendar-grid">{insights.days.map(day => <Tooltip key={day.day}><TooltipTrigger asChild><div tabIndex={0} className={`client-usage-day level-${day.requests === 0 ? 0 : Math.max(1, Math.ceil(day.tokens / peak * 4))}`} aria-label={`${date(day.day)}: ${number(day.requests)} requisições, ${number(day.tokens)} tokens`} /></TooltipTrigger><TooltipContent>{date(day.day)} · {number(day.requests)} requisições · {number(day.tokens)} tokens</TooltipContent></Tooltip>)}</div></div></TooltipProvider>
      <div className="client-usage-calendar-footer"><span>{date(insights.days[0]?.day ?? '')} — {date(insights.days.at(-1)?.day ?? '')} · Brasília</span><div>Menos{[0,1,2,3,4].map(level => <i key={level} className={`client-usage-day level-${level}`} />)}Mais</div></div>
      <p className="client-usage-note">Histórico diário disponível: últimos 30 dias.</p>
    </section>
    {afterHistory}
    {<div className="plan-uc-tables">
      <article className="plan-uc-card plan-uc-table">
        <small>POR MODELO</small>
        <table className="plan-uc-cost-table"><thead><tr><th>MODELO</th><th>TOKENS</th><th>CUSTO</th></tr></thead>
          <tbody>{[...(costUsage?.by_model ?? usage?.by_model ?? [])].sort((a, b) => b.tokens - a.tokens).map(m => <tr key={m.model}><td><span className="client-calls-model"><ModelBrandIcon id={m.model} /><code>{m.model}</code></span></td><td>{number(m.tokens)}</td><td>{money(usageCostCents(m, prices))}</td></tr>)}
            {!usage?.by_model.length && <tr><td colSpan={3}><span className="client-usage-empty">Nada usado ainda.</span></td></tr>}</tbody></table>
      </article>
      <article className="plan-uc-card plan-uc-table">
        <small>POR DIA</small>
        <table className="plan-uc-cost-table"><thead><tr><th>DIA</th><th>TOKENS</th><th>CUSTO</th></tr></thead>
          <tbody>{[...(costUsage?.daily ?? insights.days)].reverse().filter(d => d.tokens > 0).map(d => <tr key={d.day}><td>{date(d.day)}</td><td>{number(d.tokens)}</td><td>{money(dailyUsageCost(costUsage?.daily_by_model ?? usage?.daily_by_model ?? [], d.day, d.tokens, prices))}</td></tr>)}
            {!insights.days.some(d => d.tokens > 0) && <tr><td colSpan={3}><span className="client-usage-empty">Nada usado ainda.</span></td></tr>}</tbody></table>
      </article>
    </div>}
    <section className="client-usage-section" aria-labelledby="client-cache-title">
      <div className="client-usage-heading"><div><h2 id="client-cache-title">Cache</h2><p>Parte da entrada que o servidor reaproveitou de pedidos anteriores. Cada token lido do cache conta só 10% no seu consumo.</p></div></div>
      <div className="client-usage-periods">
        <article className="client-usage-metric"><span><Database size={16} />Lidos do cache</span><strong>{number(cache?.cached_tokens ?? 0)}</strong><small>{number(cache?.requests ?? 0)} pedidos com cache</small></article>
        <article className="client-usage-metric"><span><Zap size={16} />Tokens poupados</span><strong>{number(cache?.discount_tokens ?? 0)}</strong><small>Não saíram do seu saldo</small></article>
        <article className="client-usage-metric"><span><Star size={16} />Economia</span><strong>{money(cache?.discount_tokens ? cacheTotalSaved : 0)}</strong><small>{cacheTotalSaved == null ? 'Modelo sem tarifa na aba Modelos' : 'Pelo preço de entrada do seu plano'}</small></article>
      </div>
      <p className="client-usage-note">Contado a partir de 12/11/2026. Gravar no cache conta como entrada normal.</p>
    </section>
    <section className="client-usage-section client-calls" aria-labelledby="client-calls-title">
      <div className="client-usage-heading"><div><h2 id="client-calls-title">// Chamadas</h2><p>Cada chamada à API, com status, tempo, tokens e custo.</p></div>
        <label className="client-calls-toggle"><input type="checkbox" checked={onlyErrors} onChange={e => setOnlyErrors(e.target.checked)} /><span>Só erros</span></label>
      </div>
      <p className="client-usage-note">Últimas {number(calls.length)} chamadas</p>
      <div className="client-calls-summary">
        <article className="client-calls-summary-card"><small>Você pagou</small><strong>{money4(callsCompare.paid)}</strong><em>{callsCompare.paid == null ? 'Modelo sem tarifa na aba Modelos' : 'Custo no seu plano nestas chamadas'}</em></article>
        <article className="client-calls-summary-card"><small>Preço oficial</small><strong>{money4(callsCompare.official)}</strong><em>{callsCompare.official == null ? 'Modelo sem tarifa na aba Modelos' : 'Tarifa cheia da aba Modelos'}</em></article>
        <article className="client-calls-summary-card is-accent"><small>Economia efetiva no período</small><strong>{money4(callsCompare.savings)}{callsCompare.percent != null && <span className="client-calls-percent"> {pct(callsCompare.percent)}</span>}</strong><em>{callsCompare.savings == null ? 'Sem valores para comparação' : 'Preço oficial menos o que você pagou'}</em></article>
        <article className="client-calls-summary-card is-accent"><small>Economia com cache</small><strong>{money4(cacheRead ? cacheCallsSaved : calls.length ? 0 : null)}{cacheRead > 0 && <span className="client-calls-percent"> {pct(cacheShare)} da entrada</span>}</strong><em>{cacheRead ? `${number(cacheRead)} tokens lidos do cache nestas chamadas, cobrados a 10%` : 'Nenhum token em cache nestas chamadas'}</em></article>
      </div>
      <div className="client-calls-table-wrap" tabIndex={0} role="region" aria-label="Histórico de chamadas"><table className="client-calls-table">
        <thead><tr><th>CONCLUÍDA EM</th><th>ENTRADA</th><th>CACHE</th><th>SAÍDA</th><th>TEMPO</th><th>MODELO</th><th>MODO</th><th>STATUS</th><th>CUSTO NO PLANO</th></tr></thead>
        <tbody>{visibleCalls.map((c, i) => {
          const ok = (c.status_code ?? 200) < 400;
          return <tr key={`${c.finished_at}-${i}`} title={c.error ?? undefined}>
            <td>{callTime(c.finished_at)}</td>
            <td>{number(c.prompt_tokens)}</td>
            <td title={c.cached_tokens ? `${number(c.cached_tokens)} tokens lidos do cache, cobrados a 10%` : undefined}>{c.cached_tokens ? number(c.cached_tokens) : '—'}</td>
            <td>{number(c.completion_tokens)}</td>
            <td>{c.latency_ms != null && c.latency_ms >= 0 ? `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(c.latency_ms / 1000)} s` : '—'}</td>
            <td><span className="client-calls-model"><ModelBrandIcon id={c.model} /><code>{c.model}</code></span></td>
            <td>{c.stream ? 'Streaming' : 'Padrão'}</td>
            <td><span className={`client-calls-status ${ok ? 'is-ok' : 'is-error'}`}>{ok ? 'Sucesso' : 'Erro'}</span></td>
            <td>{money(usageCostCents(c, prices))}</td>
          </tr>;
        })}
        {!visibleCalls.length && <tr><td colSpan={9}><span className="client-usage-empty">{onlyErrors ? 'Nenhum erro nas últimas chamadas.' : 'Nenhuma chamada registrada ainda.'}</span></td></tr>}</tbody>
      </table></div>
    </section>
    <section className="client-usage-section"><div className="client-usage-heading"><div><h2>Por período</h2><p>Tokens contados em cada intervalo</p></div></div><div className="client-usage-periods">{[{ label: 'Hoje', data: insights.today }, { label: 'Últimos 7 dias', data: insights.week }, { label: 'Últimos 30 dias', data: insights.month }].map(period => <article key={period.label} className="client-usage-metric"><span>{period.label}</span><strong>{number(period.data.tokens)}</strong><small>{number(period.data.requests)} requisições</small></article>)}</div><div className="client-usage-comparison"><span>Hoje</span><strong>{number(insights.today.tokens)}</strong></div><progress className="business-progress" max={insights.weekPeak || 1} value={insights.today.tokens} aria-label="Consumo de hoje em relação ao maior uso da semana" /><p className="client-usage-note">Hoje em relação ao dia de maior consumo da semana.</p></section>
    <div className="client-usage-totals">{[{ label: 'REQUISIÇÕES', value: number(insights.today.requests), note: 'Hoje', icon: Activity }, { label: 'TOKENS', value: number(insights.today.tokens), note: 'Entrada + saída, hoje', icon: Database }, { label: 'TEMPO MÉDIO', value: averageTime, note: models.averageLatencyMs === null ? 'Sem tempos registrados hoje' : `Hoje · ${number(models.latencySamples)} pedidos com tempo registrado`, icon: Clock3 }].map(metric => <article key={metric.label}><span><metric.icon size={15} />{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small></article>)}</div>
  </div>;
}