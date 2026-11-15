import { createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';
import { ShoppingBag, Clock, CheckCircle2, Wallet, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BusinessError, BusinessHeader, ChartBlock, DailyChart, EmptyState, MetricTile, PlanChart, useBusinessData } from '@/components/AdminBusinessCharts';
import { approvedRevenue, inPeriod, money, periodStart, timeline } from '@/lib/business-metrics';
import { pageHead } from '@/lib/page-head';

export const Route = createFileRoute('/admin/faturamento')({
  validateSearch: (s: Record<string, unknown>) => ({ days: [1, 7, 30].includes(Number(s['days'])) ? Number(s['days']) : 30 }),
  head: () => pageHead('Faturamento de chaves', 'Receita diária, semanal e mensal das vendas de chaves NEXA CLOUD.'),
  component: () => <Suspense fallback={<p className="p-6 text-muted-foreground">Carregando faturamento…</p>}><Revenue /></Suspense>,
  errorComponent: BusinessError,
});

function Revenue() {
  const { data } = useBusinessData(), { days } = Route.useSearch(), navigate = Route.useNavigate();
  const now = new Date(data.updatedAt), start = periodStart(days, now);
  const orders = data.payments.filter(p => inPeriod(p.created_at, start, now));
  const approved = data.payments.filter(p => p.status === 'approved' && inPeriod(p.approved_at ?? p.created_at, start, now));
  const grouped = new Map<string, number>();
  approved.forEach(p => { const name = data.plans.find(plan => plan.code === p.plan_code)?.name ?? p.plan_code; grouped.set(name, (grouped.get(name) ?? 0) + 1); });
  const payoutRevenue = data.payouts.filter(p => p.status === 'approved' && inPeriod(p.approved_at ?? p.created_at, start, now)).reduce((s, p) => s + p.amount_cents, 0);
  function exportCsv() {
    const escape = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
    const csv = '\uFEFF' + [['Data', 'Cliente', 'Plano', 'Status', 'Valor (R$)'], ...orders.map(p => [new Date(p.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }), p.name, p.plan_code, p.status, (p.amount_cents / 100).toFixed(2).replace('.', ',')])].map(row => row.map(escape).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = `nexa-faturamento-${days}dias.csv`; a.click(); URL.revokeObjectURL(url);
  }
  return <div className="space-y-5">
    <BusinessHeader title="Faturamento NEXA" subtitle="Vendas de chaves e pagamentos aprovados."><Button size="sm" variant="outline" onClick={exportCsv}><Download className="size-4" />Exportar</Button></BusinessHeader>
    <div className="flex flex-wrap gap-2" aria-label="Período do faturamento">{[{ n: 1, label: 'Diário · hoje' }, { n: 7, label: 'Semanal · 7 dias' }, { n: 30, label: 'Mensal · 30 dias' }].map(p => <Button key={p.n} variant={days === p.n ? 'default' : 'outline'} aria-pressed={days === p.n} onClick={() => void navigate({ search: { days: p.n } })}>{p.label}</Button>)}</div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricTile title="Total de pedidos" value={orders.length} detail="Pedidos criados no período" icon={ShoppingBag} /><MetricTile title="Pendentes" value={orders.filter(p => p.status === 'pending' || p.status === 'in_process').length} detail="Aguardando confirmação de pagamento" icon={Clock} /><MetricTile title="Aprovados" value={approved.length} detail="Pagamentos aprovados no período" icon={CheckCircle2} /><MetricTile title="Receita de vendas" value={money(approvedRevenue(data.payments, start, now))} detail="Apenas vendas pagas · valor bruto" icon={Wallet} /></div>
    <div className="grid gap-4 sm:grid-cols-3">{[{ n: 1, label: 'Receita de hoje' }, { n: 7, label: 'Receita dos últimos 7 dias' }, { n: 30, label: 'Receita dos últimos 30 dias' }].map(p => <div key={p.n} className="min-w-0 rounded-lg border border-border bg-card p-5"><p className="border-l-2 border-accent pl-3 text-xs text-muted-foreground">{p.label}</p><strong className="mt-2 block border-l-2 border-accent pl-3 text-xl tabular-nums">{money(approvedRevenue(data.payments, periodStart(p.n, now), now))}</strong></div>)}</div>
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]"><ChartBlock framed title="Receita por dia" subtitle="Pagamentos aprovados · horário de Brasília"><DailyChart data={timeline(data, days, now)} revenue /></ChartBlock><ChartBlock framed title="Vendas por plano" subtitle="Compras aprovadas no período"><PlanChart data={[...grouped].map(([name, count]) => ({ name, count }))} /></ChartBlock></div>
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-5"><div><h2 className="font-semibold">Repasses de revenda recebidos</h2><p className="mt-1 text-xs text-muted-foreground">Exibidos separadamente das vendas diretas · período selecionado</p></div><strong className="text-2xl text-accent">{money(payoutRevenue)}</strong></section>
    <ChartBlock framed title="Pedidos recentes" subtitle={`Período de ${start.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} a ${now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`}>
      {orders.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="pb-3">Cliente</th><th>Plano</th><th>Data</th><th>Status</th><th className="text-right">Valor</th></tr></thead><tbody>{[...orders].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100).map(p => <tr className="border-t border-border" key={p.id}><td className="py-3 pr-4 font-medium">{p.name}</td><td className="pr-4">{data.plans.find(plan => plan.code === p.plan_code)?.name ?? p.plan_code}</td><td className="whitespace-nowrap pr-4 text-xs">{new Date(p.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td><td className={p.status === 'approved' ? 'text-accent' : 'text-muted-foreground'}>{({ approved: 'Aprovado', pending: 'Pendente', cancelled: 'Cancelado', rejected: 'Recusado', in_process: 'Em análise' } as Record<string, string>)[p.status] ?? p.status}</td><td className="whitespace-nowrap text-right font-semibold">{money(p.amount_cents)}</td></tr>)}</tbody></table>{orders.length > 100 && <p className="mt-4 text-xs text-muted-foreground">Exibindo 100 de {orders.length} pedidos. O arquivo exportado contém todos os pedidos do período.</p>}</div> : <EmptyState />}
    </ChartBlock>
  </div>;
}