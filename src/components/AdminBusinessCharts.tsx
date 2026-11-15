import type { ReactNode, ComponentType } from 'react';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { useSuspenseQuery, queryOptions } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { RefreshCw, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAdminBusinessMetrics } from '@/lib/business-metrics.functions';

export const businessQuery = queryOptions({ queryKey: ['admin-business-metrics'], queryFn: () => getAdminBusinessMetrics(), staleTime: 15000, refetchInterval: 30000 });
export function useBusinessData() { return useSuspenseQuery(businessQuery); }
export function BusinessHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  const { refetch, isFetching } = useBusinessData();
  return <header className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
    <div className="flex items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent"><Activity /></span><div><h1 className="text-2xl font-bold uppercase">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{subtitle}</p></div></div>
    <div className="flex flex-wrap items-center gap-2"><span className="mr-1 flex items-center gap-1.5 text-[10px] font-bold uppercase text-accent"><span className="size-1.5 rounded-full bg-accent motion-safe:animate-pulse" />Ao vivo</span>{children}<Button size="icon" variant="outline" aria-label="Atualizar métricas" title="Atualizar métricas" disabled={isFetching} onClick={() => void refetch()}><RefreshCw className={isFetching ? 'animate-spin' : ''} /></Button></div>
  </header>;
}
export function MetricTile({ title, value, detail, icon: Icon }: { title: string; value: string | number; detail: string; icon: ComponentType<{ className?: string }> }) {
  return <article className="min-w-0 rounded-lg border border-border bg-card p-5"><span className="mb-4 grid size-9 place-items-center rounded-lg bg-accent/10 text-accent"><Icon className="size-5" /></span><p className="break-words text-3xl font-bold tabular-nums">{value}</p><h2 className="mt-1 text-sm font-semibold">{title}</h2><p className="mt-2 text-[10px] uppercase leading-relaxed text-muted-foreground">{detail}</p></article>;
}
export function ChartBlock({ title, subtitle, children, framed = false }: { title: string; subtitle?: string; children: ReactNode; framed?: boolean }) {
  return <section className={`min-w-0 ${framed ? 'rounded-lg border border-border bg-card p-5' : 'border-t border-border py-5'}`}><h2 className="text-base font-semibold">{title}</h2>{subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}<div className="mt-5">{children}</div></section>;
}
const chartColors = { primary: 'var(--orange)', secondary: 'var(--foreground)', tertiary: 'var(--muted-foreground)' };
export function DailyChart({ data, revenue = false, valueLabel = 'Receita (R$)' }: { data: Array<{ day: string; cadastros: number; chaves: number; compras: number; receita: number }>; revenue?: boolean; valueLabel?: string }) {
  const series = revenue ? [{ key: 'receita', name: valueLabel, color: chartColors.primary }] : [{ key: 'cadastros', name: 'Cadastros', color: chartColors.primary }, { key: 'chaves', name: 'Chaves emitidas', color: chartColors.secondary }, { key: 'compras', name: 'Compras aprovadas', color: chartColors.tertiary }];
  return <div className="h-64 w-full"><ResponsiveContainer><AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}><CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} minTickGap={25} /><YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} width={42} allowDecimals={revenue} /><Tooltip contentStyle={{ background: 'var(--card)', borderColor: 'var(--line)', color: 'var(--foreground)', borderRadius: 8 }} />{series.map(s => <Area key={s.key} dataKey={s.key} name={s.name} type="monotone" stroke={s.color} fill={s.color} fillOpacity={0.08} strokeWidth={2} isAnimationActive={false} />)}</AreaChart></ResponsiveContainer></div>;
}
export function PlanChart({ data }: { data: { name: string; count: number }[] }) {
  const total = data.reduce((sum, row) => sum + row.count, 0);
  return total ? <div className="space-y-5">{[...data].sort((a,b) => b.count - a.count).map(row => <div key={row.name}><div className="mb-2 flex items-start justify-between gap-4"><span className="min-w-0 break-words text-sm font-medium">{row.name}</span><span className="shrink-0 text-right"><strong className="text-sm tabular-nums">{row.count.toLocaleString('pt-BR')}</strong><span className="ml-2 text-xs text-muted-foreground">{(row.count / total * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span></span></div><progress aria-label={row.name} className="business-progress" value={row.count} max={total} /></div>)}</div> : <EmptyState />;
}
export function EmptyState({ text = 'Nenhum registro neste período.' }: { text?: string }) { return <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>; }
export function BusinessError({ error }: ErrorComponentProps) { return <div role="alert" className="p-6 text-destructive">Não foi possível carregar os dados: {error instanceof Error ? error.message : 'Tente novamente.'}</div>; }