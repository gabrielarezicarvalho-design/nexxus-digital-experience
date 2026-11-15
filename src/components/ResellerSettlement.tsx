import { Wallet, KeyRound, Coins, CheckCircle2 } from 'lucide-react';
import { useBusinessData, MetricTile, EmptyState } from './AdminBusinessCharts';
import { dayKey, money, resellerTotals } from '@/lib/business-metrics';

export function ResellerSettlement() {
  const { data } = useBusinessData();
  const totals = data.resellers.map(r => ({ ...r, balance: resellerTotals(data.keys, data.payouts, r.id) }));
  return <section className="mb-8 border-b border-border pb-6">
    <div className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-accent/10 text-accent"><Wallet /></span><div><h2 className="text-xl font-bold uppercase">Ciclo & repasse</h2><p className="mt-1 text-xs text-muted-foreground">Vendas em chaves e repasses reais de cada revendedor · histórico completo</p></div></div>
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricTile title="Chaves vendidas / emitidas" value={totals.reduce((s, r) => s + r.balance.count, 0)} detail="Chaves geradas pelos revendedores" icon={KeyRound} /><MetricTile title="Repasses gerados" value={money(totals.reduce((s, r) => s + r.balance.generated, 0))} detail="Custo registrado em cada chave" icon={Coins} /><MetricTile title="Repasses recebidos" value={money(totals.reduce((s, r) => s + r.balance.paid, 0))} detail="Somente pagamentos aprovados" icon={CheckCircle2} /><MetricTile title="A receber" value={money(totals.reduce((s, r) => s + r.balance.pending, 0))} detail="Saldo pendente de todos os revendedores" icon={Wallet} /></div>
    <div className="grid gap-4 xl:grid-cols-2">{totals.map(r => {
      const keys = data.keys.filter(k => k.reseller_id === r.id);
      const daysSold = new Set(keys.map(k => dayKey(k.created_at))).size;
      const recent = [...keys].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      return <article className="rounded-lg border border-border bg-card p-5" key={r.id}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{r.name}</h3><p className="mt-1 break-all text-xs text-muted-foreground">{r.email}</p></div><span className={`text-xs font-semibold ${r.status === 'active' ? 'text-accent' : 'text-destructive'}`}>{r.status === 'active' ? 'Revenda disponível' : r.status === 'blocked' ? 'Revenda bloqueada' : 'Desativada'}</span></div>
        <div className="mb-4 grid gap-4 sm:grid-cols-3"><div><p className="text-[10px] uppercase text-muted-foreground">Chaves vendidas / emitidas</p><strong className="mt-1 block text-2xl">{r.balance.count}</strong></div><div><p className="text-[10px] uppercase text-muted-foreground">Já repassou</p><strong className="mt-1 block text-xl">{money(r.balance.paid)}</strong></div><div><p className="text-[10px] uppercase text-accent">Precisa repassar</p><strong className="mt-1 block text-xl text-accent">{money(r.balance.pending)}</strong></div></div>
        <dl className="space-y-2 border-t border-border py-3 text-xs"><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Total gerado em repasses</dt><dd className="font-semibold">{money(r.balance.generated)}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Dias com emissão de chaves</dt><dd>{daysSold}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Última emissão</dt><dd>{recent ? new Date(recent.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—'}</dd></div></dl>
        <div className="mb-2 flex justify-between gap-3 text-[10px] text-muted-foreground"><span>Limite do repasse: {money(r.debt_limit_cents)}</span><span>{r.debt_limit_cents ? Math.round(r.balance.pending / r.debt_limit_cents * 100) : 0}%</span></div><progress className="business-progress" max={Math.max(r.debt_limit_cents, 1)} value={Math.min(r.balance.pending, r.debt_limit_cents)} />
      </article>;
    })}</div>
    {!totals.length && <EmptyState text="Nenhum revendedor cadastrado." />}
    <p className="mt-4 text-xs text-muted-foreground">O valor cobrado ao cliente final não é informado pelo revendedor. Os valores acima são custos e repasses registrados na NEXA, não o faturamento da loja dele.</p>
  </section>;
}