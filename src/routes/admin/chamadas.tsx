import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Panel, fmt } from "@/lib/admin-ui";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/admin/chamadas")({ head: () => pageHead("Chamadas", "Chamadas aos fornecedores em tempo real."), component: Chamadas });

type Stat = { provider: string; requests: number; median_ms: number | null; p90_ms: number | null; errors: number; cancelled: number; prompt_tokens: number; completion_tokens: number; cached_tokens: number; last_at: string | null };
type Call = { id: string; created_at: string; model: string | null; provider: string | null; status_code: number; latency_ms: number | null; prompt_tokens: number | null; completion_tokens: number | null; cached_tokens: number | null; clients: { name: string } | null };

const PERIODS = [{ label: "15 min", minutes: 15 }, { label: "1 hora", minutes: 60 }, { label: "24 horas", minutes: 1440 }, { label: "7 dias", minutes: 10080 }] as const;
const sec = (ms: number | null | undefined) => (ms == null ? "—" : `${(ms / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s`);
const ago = (iso: string) => {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  return s < 60 ? `${s}s atrás` : s < 3600 ? `${Math.round(s / 60)} min atrás` : `${Math.round(s / 3600)} h atrás`;
};
const statusTone = (code: number) => (code === 499 ? "text-muted-foreground" : code >= 400 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400");

function Chamadas() {
  const [minutes, setMinutes] = useState<number>(60);
  const [provider, setProvider] = useState("");

  const stats = useQuery({ queryKey: ["admin-live-stats", minutes], refetchInterval: 10000, queryFn: async () => {
    const { data, error } = await (supabase.rpc as any)("admin_provider_live_stats", { _minutes: minutes });
    if (error) throw error;
    return ((data ?? []) as Stat[]).map((r) => ({ ...r, requests: Number(r.requests), errors: Number(r.errors), cancelled: Number(r.cancelled), prompt_tokens: Number(r.prompt_tokens), completion_tokens: Number(r.completion_tokens), cached_tokens: Number(r.cached_tokens) }));
  } });
  const calls = useQuery({ queryKey: ["admin-live-calls", provider], refetchInterval: 5000, queryFn: async () => {
    let q = supabase.from("request_logs").select("id, created_at, model, provider, status_code, latency_ms, prompt_tokens, completion_tokens, cached_tokens, clients(name)").order("created_at", { ascending: false }).limit(60);
    if (provider) q = q.eq("provider", provider);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as Call[];
  } });

  const rows = stats.data ?? [];
  const total = rows.reduce((a, r) => ({ requests: a.requests + r.requests, input: a.input + r.prompt_tokens, cached: a.cached + r.cached_tokens, output: a.output + r.completion_tokens, errors: a.errors + r.errors }), { requests: 0, input: 0, cached: 0, output: 0, errors: 0 });
  const max = Math.max(1, ...rows.map((r) => r.requests));

  return (
    <>
      <PageTitle title="Chamadas" description="O que está indo para cada fornecedor agora: quantidade, tempo de resposta, erros e tokens. Atualiza sozinho.">
        <div className="flex rounded-md border border-border p-0.5">
          {PERIODS.map((p) => <button key={p.minutes} type="button" onClick={() => setMinutes(p.minutes)} className={`rounded px-3 py-1.5 text-sm ${minutes === p.minutes ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>{p.label}</button>)}
        </div>
      </PageTitle>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Requisições", fmt(total.requests), ""],
          ["Tokens de entrada", fmt(total.input), "text-orange-600 dark:text-orange-400"],
          ["Tokens em cache", fmt(total.cached), "text-sky-600 dark:text-sky-400"],
          ["Tokens de saída", fmt(total.output), "text-emerald-600 dark:text-emerald-400"],
          ["Erros", fmt(total.errors), total.errors ? "text-destructive" : ""],
        ].map(([label, value, tone]) => (
          <Panel key={label} className="p-4 text-center">
            <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
            <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
          </Panel>
        ))}
      </div>

      <Panel className="mb-6 p-4">
        <h2 className="mb-3 font-semibold">Por fornecedor</h2>
        {stats.isError && <p className="text-sm text-destructive">Não foi possível carregar os números.</p>}
        {!stats.isLoading && rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma chamada neste período.</p>}
        <div className="grid gap-2">
          {rows.map((r) => (
            <button key={r.provider} type="button" onClick={() => setProvider(provider === r.provider ? "" : r.provider)} className={`grid gap-1 rounded-md border p-3 text-left text-sm transition-colors md:grid-cols-[12rem_1fr_auto] md:items-center ${provider === r.provider ? "border-accent bg-accent/5" : "border-border hover:bg-muted/40"}`}>
              <span className="font-medium">{r.provider}</span>
              <span className="h-2 overflow-hidden rounded bg-muted" aria-hidden="true"><span className="block h-full rounded bg-accent" style={{ width: `${(r.requests / max) * 100}%` }} /></span>
              <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span><strong className="text-foreground">{fmt(r.requests)}</strong> pedidos</span>
                <span>típico <strong className="text-foreground">{sec(r.median_ms)}</strong></span>
                <span>10% mais lentos &gt; <strong className="text-foreground">{sec(r.p90_ms)}</strong></span>
                <span className={r.errors ? "text-destructive" : ""}>{fmt(r.errors)} erros</span>
                <span>{fmt(r.cancelled)} cancelados</span>
                <span>{fmt(r.prompt_tokens)} ↑ · {fmt(r.completion_tokens)} ↓</span>
              </span>
            </button>
          ))}
        </div>
        {provider && <p className="mt-2 text-xs text-muted-foreground">Mostrando só as chamadas de {provider}. Clique de novo para ver todas.</p>}
      </Panel>

      <Panel className="overflow-x-auto p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3"><h2 className="font-semibold">Chamadas recentes</h2><span className="text-xs text-muted-foreground">atualiza a cada 5 s</span></div>
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr>{["Quando", "Cliente", "Modelo pedido", "Fornecedor", "Entrada / Saída", "Cache", "Tempo", "Status"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {calls.data?.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Nenhuma chamada ainda.</td></tr>}
            {calls.data?.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{ago(c.created_at)}</td>
                <td className="px-3 py-2">{c.clients?.name ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{c.model ?? "—"}</td>
                <td className="px-3 py-2">{c.provider ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-2"><span className="text-orange-600 dark:text-orange-400">{fmt(c.prompt_tokens ?? 0)}↑</span> <span className="text-emerald-600 dark:text-emerald-400">{fmt(c.completion_tokens ?? 0)}↓</span></td>
                <td className="px-3 py-2 text-sky-600 dark:text-sky-400">{c.cached_tokens ? fmt(c.cached_tokens) : "—"}</td>
                <td className="px-3 py-2">{sec(c.latency_ms)}</td>
                <td className={`px-3 py-2 font-medium ${statusTone(c.status_code)}`}>{c.status_code === 499 ? "cancelado" : c.status_code}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
