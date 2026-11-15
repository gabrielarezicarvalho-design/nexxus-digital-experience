import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import type { DailyModelUsage } from '@/lib/client-usage';
import { dailyUsageCost, planReferenceBalance, sumUsageCost } from '@/lib/client-usage-pricing';
import type { clientQuota } from '@/lib/client-quota';
import type { ModelPriceCatalog } from '@/lib/client-model-pricing';
import type { PricedUsage } from '@/lib/client-usage-pricing';

type Day = { day: string; tokens: number; requests: number };
const fmt = (n: number) => new Intl.NumberFormat('pt-BR').format(Math.round(n));
const money = (c: number | null) => c == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c / 100);

function Blocks({ values, tone }: { values: number[]; tone: 'a' | 'b' }) {
  const max = Math.max(1, ...values);
  return <div className={`plan-uc-blocks is-${tone}`}>{values.map((v, i) => <i key={i} style={{ opacity: v ? 0.35 + 0.65 * (v / max) : undefined }} className={v ? 'is-on' : ''} />)}</div>;
}

export function PlanUsageCards({ days, modelDays, modelTotals, prices, planCents, quota, onStatement }: { days: Day[]; modelDays: DailyModelUsage[]; modelTotals: PricedUsage[]; prices: ModelPriceCatalog; planCents: number | null; quota: ReturnType<typeof clientQuota>; onStatement: () => void }) {
  const last12 = days.slice(-12);
  const tokens = last12.map(d => d.tokens);
  const today = days[days.length - 1]?.tokens ?? 0;
  const week = days.slice(-7).reduce((s, d) => s + d.tokens, 0);
  const peak = Math.max(0, ...tokens);
  const costs = days.map(d => dailyUsageCost(modelDays, d.day, d.tokens, prices));
  const totalCost = (values: (number | null)[]) => values.some(v => v == null) ? null : values.reduce<number>((sum, v) => sum + (v ?? 0), 0);
  const lastCosts = costs.slice(-12);
  const peakCost = lastCosts.some(v => v == null) ? null : Math.max(0, ...lastCosts.map(v => v ?? 0));
  const last30 = days.slice(-30);
  const used = last30.filter(d => d.tokens > 0);
  const avgCost = totalCost(costs.slice(-30));
  const avg = avgCost == null ? null : avgCost / 30;
  const remaining = planReferenceBalance(planCents, quota);
  const avgTokens = last30.reduce((sum, day) => sum + day.tokens, 0) / 30;
  const lasts = quota?.limit != null && !quota.daily && avgTokens > 0 ? Math.floor(Math.max(0, quota.limit - quota.used) / avgTokens) : null;
  const status = remaining == null ? 'Indisponível' : remaining === 0 ? 'Zerado' : lasts != null && lasts < 3 ? 'Baixo' : 'Saudável';
  const grid = days.slice(-28);
  const gmax = Math.max(1, ...grid.map(d => d.tokens));
  const level = (t: number) => (t ? Math.min(4, Math.ceil((t / gmax) * 4)) : 0);
  return <div className="plan-uc">
    <div className="plan-uc-col">
      <article className="plan-uc-card"><small>TOTAL DE TOKENS</small><strong>{fmt(tokens.reduce((s, n) => s + n, 0))} <em>tokens</em></strong><Blocks values={tokens} tone="a" />
        <dl><div><dt>HOJE</dt><dd>{fmt(today)}</dd></div><div><dt>7 DIAS</dt><dd>{fmt(week)}</dd></div><div><dt>PICO DIÁRIO</dt><dd>{fmt(peak)}</dd></div></dl><p>Cada bloco é um dia · últimos 12 dias</p></article>
      <article className="plan-uc-card"><small>GASTO ESTIMADO</small><strong>{money(sumUsageCost(modelTotals, prices))}</strong><Blocks values={lastCosts.map(v => v ?? 0)} tone="b" />
        <dl><div><dt>HOJE</dt><dd>{money(costs.at(-1) ?? (today === 0 ? 0 : null))}</dd></div><div><dt>7 DIAS</dt><dd>{money(totalCost(costs.slice(-7)))}</dd></div><div><dt>PICO DIÁRIO</dt><dd>{money(peakCost)}</dd></div></dl><p>Tarifas de Modelos ajustadas ao plano · acumulado da chave</p></article>
    </div>
    <article className="plan-uc-card plan-uc-balance"><div className="plan-uc-head"><small>SALDO ATUAL</small><span className="plan-uc-tag">{status}</span></div>
      <strong className="plan-uc-big">{money(remaining)}</strong><div className="plan-uc-line" />
      <p>{quota?.daily ? 'Saldo proporcional aos tokens disponíveis hoje' : lasts != null ? <>Dura cerca de <b>{fmt(lasts)} dias</b> no seu ritmo atual</> : 'Ainda sem ritmo de uso para estimar a duração'}</p>
      <dl className="plan-uc-two"><div><dt>MÉDIA POR DIA</dt><dd>{money(avg)}</dd></div><div><dt>DIAS COM USO</dt><dd>{used.length} <em>/ 30</em></dd></div></dl>
      <div className="plan-uc-heat"><div className="plan-uc-head"><small>ATIVIDADE</small><span>4 semanas</span></div>
        <div className="plan-uc-grid">{['S','T','Q','Q','S','S','D'].map((d, i) => <b key={i}>{d}</b>)}{grid.map(d => <i key={d.day} className={`lv${level(d.tokens)}`} title={`${d.day.split('-').reverse().join('/')}: ${fmt(d.tokens)} tokens`} />)}</div>
        <div className="plan-uc-legend">menos {[0,1,2,3,4].map(l => <i key={l} className={`lv${l}`} />)} mais</div></div>
      <p>{planCents == null ? 'Valor do plano não disponível.' : <>Valor do plano: {money(planCents)} · tarifas ajustadas ao uso e aos tokens restantes{quota?.daily ? ' do dia' : ' da chave'}. Só zera quando os tokens acabam.</>} Saldo de referência; os limites de tokens e a validade da chave continuam iguais.</p>
      <div className="plan-uc-actions"><Button className="client-primary" asChild><Link to="/">Fazer upgrade</Link></Button><Button variant="outline" onClick={onStatement}>Ver extrato</Button></div>
    </article>
  </div>;
}
