import { createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';
import { Activity, Users, UserPlus, KeyRound, ShoppingBag, Eye } from 'lucide-react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { BusinessError, BusinessHeader, ChartBlock, DailyChart, EmptyState, MetricTile, PlanChart, useBusinessData } from '@/components/AdminBusinessCharts';
import { activeKey, activePlanDistribution, registeredInPeriod, dayKey, inPeriod, money, periodStart, timeline } from '@/lib/business-metrics';
import { getAdminPeriodMetrics } from '@/lib/business-metrics.functions';
import { pageHead } from '@/lib/page-head';

export const Route = createFileRoute('/admin/metricas')({
  validateSearch: (s: Record<string, unknown>) => ({ days: [1, 7, 30, 90].includes(Number(s['days'])) ? Number(s['days']) : 7 }),
  head: () => pageHead('Métricas de clientes e vendas', 'Indicadores reais de cadastros, chaves, conversão e compras NEXA CLOUD.'),
  component: () => <Suspense fallback={<p className="p-6 text-muted-foreground">Carregando métricas…</p>}><Metrics /></Suspense>,
  errorComponent: BusinessError,
});

function Metrics() {
  const { data } = useBusinessData();
  const { days } = Route.useSearch();
  const { data: period } = useSuspenseQuery({ queryKey: ['admin-period-metrics', days], queryFn: () => getAdminPeriodMetrics({ data: { days } }), staleTime: 15000, refetchInterval: 30000 });
  const navigate = Route.useNavigate();
  const now = new Date(data.updatedAt), start = periodStart(days, now);
  const registered = data.clients.filter(c => c.user_id);
  const periodRegistered = registeredInPeriod(data.clients, days, now);
  const periodKeys = data.keys.filter(k => inPeriod(k.created_at, start, now));
  const purchases = data.payments.filter(p => p.status === 'approved' && inPeriod(p.approved_at ?? p.created_at, start, now));
  const active = data.keys.filter(k => activeKey(k, now));
  const linkedClients = (keys: typeof data.keys) => new Set(registered.filter(c => keys.some(k => k.client_id === c.id || k.user_id === c.user_id)).map(c => c.user_id));
  const engaged = linkedClients(data.keys.filter(k => k.requests_count > 0));
  const issued = linkedClients(data.keys);
  const activeOwners = linkedClients(active);
  const distribution = activePlanDistribution(data, days, now);
  const countryNames = new Intl.DisplayNames(['pt-BR'], { type: 'region' });
  const deviceNames: Record<string,string> = { mobile: 'Celular', desktop: 'Computador / notebook', tablet: 'Tablet', unknown: 'Não identificado' };
  const buyers = new Map<string, { name: string; value: number; count: number }>();
  purchases.forEach(p => { const key = p.email.toLowerCase(); const buyer = buyers.get(key) ?? { name: p.name, value: 0, count: 0 }; buyer.value += p.amount_cents; buyer.count++; buyers.set(key, buyer); });
  const stages = [{ name: 'Cadastrados', count: registered.length }, { name: 'Engajados', count: engaged.size }, { name: 'Receberam chave', count: issued.size }, { name: 'Plano ativo', count: activeOwners.size }];
  return <div className="space-y-5">
    <BusinessHeader title="Métricas NEXA" subtitle="Cadastros, emissão de chaves e compras aprovadas.">
      <div className="flex flex-wrap gap-1" aria-label="Período das métricas">{[1, 7, 30, 90].map(n => <Button key={n} size="sm" variant={days === n ? 'default' : 'ghost'} aria-pressed={days === n} onClick={() => void navigate({ search: { days: n } })}>{n === 1 ? 'Hoje' : `${n} dias`}</Button>)}</div>
    </BusinessHeader>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <MetricTile title="Requisições no período" value={period.requests.toLocaleString('pt-BR')} detail={days === 1 ? 'Hoje · horário de Brasília' : `Últimos ${days} dias · histórico de pedidos`} icon={Activity} />
      <MetricTile title="Clientes cadastrados" value={periodRegistered.length} detail={`Criados no período · ${registered.length} no total`} icon={Users} />
      <MetricTile title="Visualizações do site" value={period.views.toLocaleString('pt-BR')} detail="Páginas públicas · com aceite de análise" icon={Eye} />
      <MetricTile title="Chaves emitidas" value={periodKeys.length} detail="Chaves geradas no período" icon={KeyRound} />
      <MetricTile title="Compras realizadas" value={purchases.length} detail="Pagamentos aprovados no período" icon={ShoppingBag} />
    </div>
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <ChartBlock framed title="Atividade por dia" subtitle="Cadastros · chaves emitidas · compras aprovadas"><DailyChart data={timeline(data, days, now)} /></ChartBlock>
      <ChartBlock framed title="Engajamento de clientes" subtitle="Contas com utilização de API registrada"><div className="py-9 text-center"><p className="text-6xl font-bold text-accent">{registered.length ? Math.round(engaged.size / registered.length * 100) : 0}%</p><p className="mt-3 text-xs text-muted-foreground">{engaged.size} de {registered.length} contas cadastradas</p><progress className="business-progress mt-6" max={Math.max(registered.length, 1)} value={engaged.size} /></div></ChartBlock>
    </div>
    <ChartBlock framed title="Funil de conversão" subtitle="Jornada dos clientes · base completa"><div className="space-y-6">{stages.map((stage, i) => <div key={stage.name}><div className="mb-2 flex items-center justify-between"><div><h3 className="text-sm font-semibold">{stage.name}</h3><p className="text-[10px] text-muted-foreground">ETAPA {i + 1}</p></div><strong className="text-xl">{stage.count}</strong></div><progress className="business-progress" max={Math.max(registered.length, 1)} value={stage.count} /></div>)}</div></ChartBlock>
    <div className="grid items-start gap-6 xl:grid-cols-[1.6fr_1fr]">
      <ChartBlock framed title="Planos em uso" subtitle="Chaves emitidas no período e ainda válidas; desligar a venda não cancela uma chave comprada."><PlanChart data={distribution} /><p className="mt-5 text-xs text-muted-foreground">{data.plans.filter(p => p.active).length} planos à venda · {active.length} chaves válidas no total</p></ChartBlock>
      <div className="grid min-w-0 gap-6">
        <ChartBlock framed title="Top compradores" subtitle="Maiores compras aprovadas no período"><div className="space-y-4">{[...buyers.values()].sort((a, b) => b.value - a.value).slice(0, 5).map((b, i) => <div key={i} className="flex items-center gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent/10 text-xs font-semibold text-accent">{i + 1}</span><span className="min-w-0 flex-1 break-words text-sm font-semibold">{b.name}</span><div className="shrink-0 text-right"><strong className="text-sm">{money(b.value)}</strong><p className="text-[10px] text-muted-foreground">{b.count} compra(s)</p></div></div>)}{!buyers.size && <EmptyState />}</div></ChartBlock>
        <ChartBlock framed title="Cadastros recentes" subtitle="Últimas contas vinculadas"><div className="space-y-4">{[...registered].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5).map(c => <div key={c.id} className="flex items-center gap-3"><UserPlus className="size-4 shrink-0 text-accent" /><span className="min-w-0 flex-1 break-words text-sm font-medium">{c.name}</span><span className="shrink-0 text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span></div>)}{!registered.length && <EmptyState />}</div></ChartBlock>
      </div>
    </div>
    <ChartBlock framed title="Visualizações por dia" subtitle={period.firstView ? `Coleta desde ${new Date(period.firstView).toLocaleDateString('pt-BR')} · não inclui o histórico anterior à coleta` : 'Aguardando as primeiras visitas com aceite de análise; sem histórico anterior à coleta.'}><DailyChart revenue data={Array.from({ length: days }, (_,i) => { const date = new Date(start.getTime() + i * 86400000); const key = dayKey(date); return { day: key.slice(8) + '/' + key.slice(5,7), cadastros: 0, chaves: 0, compras: 0, receita: period.dailyViews.find(row => row.day === key)?.count ?? 0 }; })} valueLabel="Visualizações" /></ChartBlock>
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartBlock framed title="Visualizações por dispositivo" subtitle="Computadores e notebooks aparecem na mesma categoria."><PlanChart data={period.devices.map(row => ({ ...row, name: deviceNames[row.name] ?? 'Não identificado' }))} /></ChartBlock>
      <ChartBlock framed title="Visualizações por país" subtitle="Localização aproximada do acesso, não nacionalidade; VPNs podem mudar o país."><PlanChart data={period.countries.map(row => ({ ...row, name: row.name === 'Unknown' ? 'País não identificado' : `${countryNames.of(row.name) ?? row.name} (${row.name})` }))} /></ChartBlock>
    </div>
  </div>;
}