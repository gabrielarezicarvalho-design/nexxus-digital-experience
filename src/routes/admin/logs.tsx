import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Panel, fmt, fmtDate } from "@/lib/admin-ui";
import { pageHead } from '@/lib/page-head';
import { parseRoutingDiagnostic } from '@/lib/upstream-diagnostics';

export const Route = createFileRoute("/admin/logs")({ head: () => pageHead('Uso e logs', 'Consulte consumo, pedidos e erros de API NEXA CLOUD.'), component: Logs });

function Logs() {
  const [soErros, setSoErros] = useState(false);
  const { data = [] } = useQuery({
    queryKey: ["admin-reqlogs", soErros],
    queryFn: async () => {
      let q = supabase.from("request_logs").select("id, created_at, model, provider, prompt_tokens, completion_tokens, total_tokens, cached_tokens, cache_write_tokens, cache_discount_tokens, status_code, error, latency_ms, stream, clients(name), api_key_id, api_keys(plano, tokens_used, token_limit, daily_token_limit)").order("created_at", { ascending: false }).limit(300);
      if (soErros) q = q.or('status_code.gte.400,error.not.is.null').or('error.is.null,error.neq.modelo não permitido');
      const rows = (await q).data ?? [];
      const ids = [...new Set(rows.map((r) => r.api_key_id).filter(Boolean))] as string[];
      const today: Record<string, number> = {};
      if (ids.length) { const { data: d } = await (supabase.rpc as unknown as (fn: string, args: { _ids: string[] }) => Promise<{ data: { key_id: string; used: number }[] | null }>)("admin_keys_daily_usage", { _ids: ids }); for (const x of d ?? []) today[x.key_id] = Number(x.used); }
      return rows.map((r) => ({ ...r, today: r.api_key_id ? today[r.api_key_id] ?? null : null }));
    },
    refetchInterval: 15000,
  });
  const { data: cache = [] } = useQuery({
    queryKey: ["admin-cache-summary"],
    queryFn: async () => { const { data, error } = await supabase.rpc("admin_cache_summary"); if (error) throw error; return data ?? []; },
    refetchInterval: 60000,
  });
  return (
    <>
      <PageTitle title="Uso / Logs">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={soErros} onChange={(e) => setSoErros(e.target.checked)} />Só erros</label>
      </PageTitle>
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        {(["24h", "7d"] as const).map((period) => { const c = cache.find((x) => x.period === period); const share = c && c.prompt_raw > 0 ? c.cached_tokens / c.prompt_raw * 100 : 0; return (
          <Panel key={period} className="p-4">
            <div className="text-xs font-medium text-muted-foreground">Cache · {period === "24h" ? "últimas 24 horas" : "últimos 7 dias"}</div>
            <div className="mt-1 text-2xl font-semibold">{fmt(c?.cached_tokens ?? 0)} <span className="text-sm font-normal text-muted-foreground">tokens lidos do cache</span></div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div><div className="font-semibold text-foreground">{share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</div>da entrada</div>
              <div><div className="font-semibold text-foreground">{fmt(c?.discount_tokens ?? 0)}</div>descontados dos clientes</div>
              <div title={`Entrada que não veio do cache; o fornecedor grava esse trecho para os próximos pedidos. Gravação informada pelo fornecedor: ${fmt(c?.cache_write_tokens ?? 0)}.`}><div className="font-semibold text-foreground">{fmt(Math.max(c?.new_input_tokens ?? 0, c?.cache_write_tokens ?? 0))}</div>entrada nova (gravada no cache)</div>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">{fmt(c?.cache_requests ?? 0)} de {fmt(c?.requests ?? 0)} pedidos com cache · contado desde 12/11/2026, 16:09</div>
          </Panel>
        ); })}
      </div>
      <Panel className="overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr>{["Quando", "Cliente", "Plano", "Modelo", "Entrada", "Cache", "Saída", "Total", "Status", "Tempo", "Fornecedor / Diagnóstico"].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {data.length === 0 && <tr><td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">Nenhuma requisição ainda.</td></tr>}
            {data.map((l) => { const diagnostic = parseRoutingDiagnostic(l.error); return (
              <tr key={l.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2">{fmtDate(l.created_at)}</td>
                <td className="min-w-48 px-3 py-2">{(l.clients as { name: string } | null)?.name ?? "—"}{(() => { const k = l.api_keys as { tokens_used: number; token_limit: number | null; daily_token_limit: number | null } | null; if (!k) return null; if (k.daily_token_limit) { const used = l.today ?? 0; const dp = Math.min(100, used / k.daily_token_limit * 100); return (<div className="mt-1"><div className="text-[11px] text-muted-foreground">{`${fmt(used)} / ${fmt(k.daily_token_limit)} tokens hoje · zera à meia-noite`}</div><div className="mt-0.5 h-1.5 w-full overflow-hidden rounded bg-muted" role="progressbar" aria-label="Uso do dia" aria-valuenow={Math.round(dp)} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded bg-accent" style={{ width: `${dp}%` }} /></div></div>); } const pct = k.token_limit ? Math.min(100, k.tokens_used / k.token_limit * 100) : 0; return (<div className="mt-1"><div className="text-[11px] text-muted-foreground">{k.daily_token_limit ? `${fmt(k.tokens_used)} usados · ${fmt(k.daily_token_limit)}/dia` : k.token_limit ? `${fmt(k.tokens_used)} / ${fmt(k.token_limit)} tokens` : `${fmt(k.tokens_used)} usados · sem limite`}</div><div className="mt-0.5 h-1.5 w-full overflow-hidden rounded bg-muted" role="progressbar" aria-label="Uso da chave" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded bg-accent" style={{ width: `${pct}%` }} /></div></div>); })()}</td>
                <td className="px-3 py-2">{(l.api_keys as { plano: string | null } | null)?.plano ?? "—"}</td>
                <td className="px-3 py-2">{l.model ?? "—"}{l.stream ? " · stream" : ""}</td>
                <td className="px-3 py-2">{fmt(l.prompt_tokens)}</td>
                <td className="px-3 py-2" title={l.cached_tokens ? `${fmt(l.cached_tokens)} lidos do cache · ${fmt(l.cache_discount_tokens)} descontados do cliente` : l.cache_write_tokens ? `${fmt(l.cache_write_tokens)} gravados no cache` : undefined}>{l.cached_tokens ? fmt(l.cached_tokens) : l.cache_write_tokens ? <span className="text-muted-foreground">+{fmt(l.cache_write_tokens)}</span> : "—"}</td>
                <td className="px-3 py-2">{fmt(l.completion_tokens)}</td>
                <td className="px-3 py-2 font-semibold">{fmt(l.total_tokens)}</td>
                <td className={`px-3 py-2 ${l.status_code >= 400 ? "text-destructive" : ""}`}>{l.status_code}</td>
                <td className="px-3 py-2">{l.latency_ms != null ? `${l.latency_ms} ms` : "—"}</td>
                <td className="max-w-sm px-3 py-2 text-xs text-muted-foreground">
                  <span>{l.provider ?? '—'}{diagnostic.attempts.length > 0 && l.status_code < 400 ? ' · Recuperado por reserva' : ''}</span>
                  {diagnostic.attempts.length > 0 ? <details className="mt-1"><summary className="cursor-pointer text-foreground">{diagnostic.attempts.length} tentativa(s) com falha</summary><ol className="mt-2 space-y-2">{diagnostic.attempts.map((attempt, index) => <li key={index} className="break-words"><strong>{attempt.provider} · HTTP {attempt.status} · {attempt.latencyMs} ms</strong><div>{attempt.model}</div><div>{attempt.cause}</div></li>)}</ol></details> : null}
                  {diagnostic.error && <div className="mt-1 break-words">{diagnostic.error}</div>}
                </td>
              </tr>
            ); })}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
