import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useState } from 'react';
import { listAdminEntrances } from '@/lib/admin-access.functions';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Panel, fmtDate } from "@/lib/admin-ui";
import { pageHead } from '@/lib/page-head';

const entranceOptions = (page: number) => queryOptions({
  queryKey: ['admin-entrances', page],
  queryFn: () => listAdminEntrances({ data: { page } }),
  staleTime: 0,
});

export const Route = createFileRoute("/admin/auditoria")({
  head: () => pageHead('Auditoria e acessos ao Admin', 'Histórico restrito de entradas e ações administrativas da NEXA CLOUD.'),
  loader: ({ context }) => context.queryClient.ensureQueryData(entranceOptions(0)),
  component: Auditoria,
});

function Auditoria() {
  const [tab, setTab] = useState('access');
  const [page, setPage] = useState(0);
  const entrances = useQuery({ ...entranceOptions(page), enabled: tab === 'access', refetchInterval: 30000 });
  const { data = [] } = useQuery({
    queryKey: ["admin-audit"],
    enabled: tab === 'actions',
    queryFn: async () => (await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300)).data ?? [],
  });
  return (
    <>
      <PageTitle title="Auditoria" />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-5"><TabsTrigger value="access">Acessos ao Admin</TabsTrigger><TabsTrigger value="actions">Ações administrativas</TabsTrigger></TabsList>
        <TabsContent value="access">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-semibold">Entradas registradas <span className="text-sm font-normal text-muted-foreground">· {entrances.data?.total ?? '—'}</span></h2><Button variant="outline" size="icon" title="Atualizar acessos" aria-label="Atualizar acessos" disabled={entrances.isFetching} onClick={() => void entrances.refetch()}><RefreshCw className={entrances.isFetching ? 'animate-spin motion-reduce:animate-none' : ''} /></Button></div>
          <Panel className="overflow-x-auto p-0">
            <table className="w-full min-w-[550px] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr>{['Administrador', 'E-mail', 'Entrada (Brasília)'].map(label => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
              <tbody>
                {entrances.isError ? <tr><td colSpan={3} className="px-4 py-8 text-center text-destructive">Não foi possível carregar os acessos. Tente atualizar.</td></tr> : entrances.isPending ? <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Carregando acessos…</td></tr> : entrances.data?.rows.length === 0 ? <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Nenhuma entrada registrada desde a ativação do histórico.</td></tr> : entrances.data?.rows.map(entry => <tr key={entry.id} className="border-b border-border last:border-0"><td className="px-4 py-3 font-medium">{entry.actor_name || entry.actor_email}</td><td className="px-4 py-3 text-muted-foreground">{entry.actor_email}</td><td className="whitespace-nowrap px-4 py-3 tabular-nums">{new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(entry.entered_at))}</td></tr>)}
              </tbody>
            </table>
          </Panel>
          <div className="mt-4 flex items-center justify-end gap-3"><Button variant="outline" size="icon" aria-label="Página anterior de acessos" disabled={page === 0 || entrances.isFetching} onClick={() => setPage(value => value - 1)}><ChevronLeft /></Button><span className="text-sm text-muted-foreground">Página {page + 1} de {Math.max(1, Math.ceil((entrances.data?.total ?? 0) / 50))}</span><Button variant="outline" size="icon" aria-label="Próxima página de acessos" disabled={entrances.isFetching || !entrances.data || (page + 1) * 50 >= entrances.data.total} onClick={() => setPage(value => value + 1)}><ChevronRight /></Button></div>
        </TabsContent>
        <TabsContent value="actions">
      <Panel className="overflow-x-auto p-0">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr>{["Quando", "Quem", "Ação", "Detalhes"].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {data.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">Nenhuma ação registrada.</td></tr>}
            {data.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2">{fmtDate(a.created_at)}</td>
                <td className="px-3 py-2">{a.actor_email ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{a.action}</td>
                <td className="max-w-md truncate px-3 py-2 text-xs text-muted-foreground">{a.details ? JSON.stringify(a.details) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
        </TabsContent>
      </Tabs>
    </>
  );
}
