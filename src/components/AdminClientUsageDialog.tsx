import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Activity, Zap, CircleAlert, RefreshCw, Ban, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MetricTile, ChartBlock } from './AdminBusinessCharts';
import { fmt, fmtDate, StatusBadge } from '@/lib/admin-ui';
import { getAdminClientUsage } from '@/lib/admin-client-usage.functions';
import { adminSetKeyStatus } from '@/lib/admin.functions';
import { clientUsageRate, remainingKeyTokens } from '@/lib/admin-client-usage';

const compact = (value: number) => new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

export function AdminClientUsageDialog({ clientId, name, onClose }: { clientId: string; name: string; onClose: () => void }) {
  const [keyId, setKeyId] = useState<string | null>(null);
  const load = useServerFn(getAdminClientUsage);
  const changeStatus = useServerFn(adminSetKeyStatus);
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['admin-client-usage', clientId, keyId], queryFn: () => load({ data: { clientId, keyId } }), refetchInterval: 30000, retry: false });
  const data = query.data;
  const key = data?.key;
  const mutation = useMutation({
    mutationFn: (input: { id: string; status: 'active' | 'blocked' }) => changeStatus({ data: input }),
    onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: ['admin-client-usage', clientId] }), qc.invalidateQueries({ queryKey: ['admin-clients'] })]); },
  });
  const remaining = data ? remainingKeyTokens(data.key, data.todayTokens) : null;
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto rounded-lg p-4 sm:p-6">
      <DialogHeader className="pr-8 text-left">
        <DialogTitle className="break-words text-xl">{data?.client.name ?? name}</DialogTitle>
        <DialogDescription className="break-all">{data ? `${data.client.email}${data.client.company ? ` · ${data.client.company}` : ''}` : 'Consumo do cliente'}</DialogDescription>
      </DialogHeader>
      {query.isPending && <p role="status" className="py-10 text-center text-muted-foreground">Carregando consumo…</p>}
      {query.error && <div role="alert" className="space-y-3 text-destructive"><p>{query.error.message}</p><Button variant="outline" onClick={() => void query.refetch()}><RefreshCw /> Tentar novamente</Button></div>}
      {data && <>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={data.client.status} />{key && <><StatusBadge status={key.status} /><span className="text-sm">{key.plano ?? 'Sem plano'}</span></>}</div>
          <div className="flex w-full gap-2 sm:w-auto">
            {data.keys.length > 0 && <Select value={key?.id ?? ''} onValueChange={setKeyId}><SelectTrigger aria-label="Chave do cliente" className="min-w-0 sm:w-64"><SelectValue /></SelectTrigger><SelectContent>{data.keys.map(k => <SelectItem key={k.id} value={k.id}>{k.key_prefix ?? 'Chave antiga'}… · {k.plano ?? k.status}</SelectItem>)}</SelectContent></Select>}
            <Button size="icon" variant="outline" aria-label="Atualizar consumo" title="Atualizar consumo" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className={query.isFetching ? 'animate-spin motion-reduce:animate-none' : ''} /></Button>
          </div>
        </div>
        {key ? <>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><code>{key.key_prefix ?? 'Chave antiga'}…</code><span>Criada: {fmtDate(key.created_at)}</span><span>Compra: {fmtDate(data.purchaseAt)}</span><span>Último uso: {fmtDate(key.last_used_at)}</span></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={mutation.isPending || key.status === 'revoked'} onClick={() => { if (confirm(`${key.status === 'active' ? 'Bloquear' : 'Ativar'} esta chave de ${data.client.name}?`)) mutation.mutate({ id: key.id, status: key.status === 'active' ? 'blocked' : 'active' }); }}><Ban />{key.status === 'active' ? 'Bloquear chave' : 'Ativar chave'}</Button>{key.reseller_blocked && <span className="text-sm text-destructive">Bloqueada por repasse da revenda</span>}</div>
          {mutation.error && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-5 border-y border-border py-5 sm:grid-cols-3">
            <Datum label={key.daily_token_limit ? 'Saldo diário de tokens' : 'Tokens restantes'} value={remaining == null ? 'Sem teto de tokens' : fmt(remaining)} />
            <Datum label="Consumo na última hora" value={`${fmt(data.lastHourTokens)} tokens`} />
            <Datum label="Limite por minuto" value={`${fmt(key.rpm_limit)} RPM`} />
            <Datum label="Limite total" value={key.token_limit == null ? 'Sem teto de tokens' : `${fmt(key.token_limit)} tokens`} />
            <Datum label="Limite diário" value={key.daily_token_limit == null ? 'Sem teto diário' : `${fmt(key.daily_token_limit)} tokens`} />
            <Datum label="Válida até" value={key.expires_at ? fmtDate(key.expires_at) : 'Sem expiração'} />
          </dl>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricTile title="Requisições · 7 dias" value={fmt(data.stats.requests)} detail={`${fmt(data.stats.successes)} respostas HTTP 200`} icon={Activity} />
            <MetricTile title="Tokens · 7 dias" value={compact(data.stats.tokens)} detail={`Entrada ${fmt(data.stats.input)} · saída ${fmt(data.stats.output)}`} icon={Zap} />
            <MetricTile title="Erros · 7 dias" value={fmt(data.stats.errors)} detail={`${fmt(data.stats.excluded502)} HTTP 502 registrados · ${fmt(data.stats.rejections)} recusas de acesso/limite`} icon={CircleAlert} />
            <MetricTile title="Taxa de sucesso" value={`${clientUsageRate(data.stats).toFixed(1).replace('.', ',')}%`} detail={`${fmt(data.stats.errors - Number(data.stats.rateExcluded502Errors ?? 0))} falhas do site/fornecedor · ${fmt(data.stats.rateExcluded502 ?? 0)} fora da taxa`} icon={CheckCircle2} />
          </div>
          <ChartBlock title="Requisições por dia" subtitle="Últimos sete dias · horário de São Paulo" framed><div className="h-52 min-w-0 w-full"><ResponsiveContainer><BarChart data={data.days} margin={{ left: -15, right: 4, top: 8 }}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="day" tickFormatter={value => String(value).slice(5).split('-').reverse().join('/')} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} /><Tooltip contentStyle={{ background: 'var(--card)', borderColor: 'var(--line)', color: 'var(--foreground)' }} /><Bar name="Requisições" dataKey="requests" fill="var(--orange)" isAnimationActive={false} /></BarChart></ResponsiveContainer></div></ChartBlock>
          <ChartBlock title={`Origens da chave · ${fmt(data.stats.origins)} IPs`} subtitle={`Últimos sete dias · limite autorizado: ${fmt(key.ip_limit)} IPs`} framed>
            <div className="max-h-52 overflow-y-auto">{data.ips.length ? data.ips.map(ip => <div key={ip.ip} className="flex flex-wrap justify-between gap-2 border-b border-border py-3 text-xs last:border-0"><code className="break-all">{ip.ip}</code><span className="text-muted-foreground">{fmt(ip.requests)} pedidos · {fmtDate(ip.last_seen)}</span></div>) : <p className="text-sm text-muted-foreground">Nenhum IP registrado neste período.</p>}</div>
          </ChartBlock>
          <ChartBlock title="Consumo por modelo" subtitle="Entrada, saída e chamadas dos últimos sete dias" framed>
            <div className="max-h-72 space-y-4 overflow-y-auto">{data.models.length ? data.models.map(m => <div key={m.model}><div className="flex flex-wrap justify-between gap-2 text-xs"><strong className="break-all">{m.model}</strong><span>{fmt(m.requests)} pedidos · {fmt(m.errors)} erros</span></div><p className="mt-1 text-xs text-muted-foreground">{fmt(m.input)} entrada · {fmt(m.output)} saída · {fmt(m.tokens)} total</p><progress className="business-progress mt-2" aria-label={`Consumo ${m.model}`} value={Number(m.tokens)} max={Math.max(1, Number(data.stats.tokens))} /></div>) : <p className="text-sm text-muted-foreground">Nenhum consumo neste período.</p>}</div>
          </ChartBlock>
          <ChartBlock title="Últimas requisições" framed><div className="max-h-52 overflow-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-border text-muted-foreground"><th className="py-2">Horário</th><th>Modelo</th><th>Tokens</th><th>HTTP</th></tr></thead><tbody>{data.recent.map(r => <tr key={r.id} className="border-b border-border"><td className="whitespace-nowrap py-2 pr-3">{fmtDate(r.created_at)}</td><td className="break-all pr-3">{r.model ?? '—'}</td><td className="pr-3">{fmt(r.total_tokens)}</td><td>{r.status_code}</td></tr>)}</tbody></table>{!data.recent.length && <p className="py-3 text-muted-foreground">Nenhuma requisição neste período.</p>}</div></ChartBlock>
          <p className="text-xs text-muted-foreground">Consumo total da chave: {fmt(key.tokens_used)} tokens · {fmt(key.requests_count)} pedidos · Atualizado {fmtDate(data.asOf)}</p>
        </> : <p className="py-8 text-center text-muted-foreground">Este cliente ainda não possui chave.</p>}
      </>}
    </DialogContent>
  </Dialog>;
}

function Datum({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-semibold">{value}</dd></div>;
}