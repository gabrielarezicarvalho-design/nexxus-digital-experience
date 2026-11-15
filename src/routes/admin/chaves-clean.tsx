import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageTitle, Panel, fmt, fmtDate } from "@/lib/admin-ui";
import { pageHead } from "@/lib/page-head";
import { adminCleanKeys, adminSetCleanKeyCredit, type CleanKeyRow } from "@/lib/clean-keys.functions";

export const Route = createFileRoute("/admin/chaves-clean")({
  head: () => pageHead("Chaves Clean APIs", "Consumo de tokens de cada chave da Clean APIs na NEXA CLOUD."),
  component: CleanKeys,
});

function CleanKeys() {
  const qc = useQueryClient();
  const list = useServerFn(adminCleanKeys);
  const setCredit = useServerFn(adminSetCleanKeyCredit);
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-clean-keys"], queryFn: () => list(), refetchInterval: 15000 });
  const totalUsed = data.reduce((s, r) => s + r.tokens_used, 0);
  return (
    <>
      <PageTitle title="Chaves Clean APIs" />
      <p className="mb-4 text-sm text-muted-foreground">
        Total gasto: <b className="text-foreground">{fmt(totalUsed)}</b> tokens.
      </p>
      <Panel className="overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>{["Chave", "Crédito (tokens)", "Usado", "Restante", "Pedidos", "Erros", "Último status", "Último uso", ""].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">Carregando…</td></tr>}
            {!isLoading && data.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">Nenhuma chave configurada.</td></tr>}
            {data.map((r) => <Row key={r.idx} r={r} onSave={async (credit, reset) => { await setCredit({ data: { idx: r.idx, credit_tokens: credit, reset } }); await qc.invalidateQueries({ queryKey: ["admin-clean-keys"] }); }} />)}
          </tbody>
        </table>
      </Panel>
    </>
  );
}

function Row({ r, onSave }: { r: CleanKeyRow; onSave: (credit: number | null, reset?: boolean) => Promise<void> }) {
  const [val, setVal] = useState(r.credit_tokens != null ? String(r.credit_tokens) : "");
  const [busy, setBusy] = useState(false);
  const remaining = r.credit_tokens != null ? Math.max(r.credit_tokens - r.tokens_used, 0) : null;
  const pct = r.credit_tokens ? Math.min(100, (r.tokens_used / r.credit_tokens) * 100) : 0;
  const parsed = () => { const n = Number(val.replace(/\D/g, "")); return val.trim() === "" ? null : n; };
  const save = async (reset?: boolean) => {
    if (reset && !confirm("Zerar o contador de uso desta chave?")) return;
    setBusy(true); try { await onSave(parsed(), reset); } finally { setBusy(false); }
  };
  return (
    <tr className="border-b border-border last:border-0 align-middle">
      <td className="px-3 py-2"><div className="font-mono">Chave {r.idx === 0 ? "principal" : r.idx}</div><div className={`text-xs ${r.rotation_disabled ? "text-destructive" : "text-muted-foreground"}`}>{r.rotation_disabled ? (r.rotation_disabled_reason === "invalid_credentials" ? "Fora da rotação · 401" : "Fora da rotação · sem saldo") : "Na rotação"}</div></td>
      <td className="px-3 py-2">
        <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="ex.: 10000000" inputMode="numeric"
          className="h-9 w-32 rounded-md border border-border bg-background px-2 font-mono text-sm outline-none focus:border-accent" />
      </td>
      <td className="px-3 py-2 font-semibold">{fmt(r.tokens_used)}</td>
      <td className="px-3 py-2">
        {remaining == null ? "—" : <><div>{fmt(remaining)}</div><div className="mt-1 h-1.5 w-24 rounded bg-muted"><div className="h-1.5 rounded bg-accent" style={{ width: `${pct}%` }} /></div></>}
      </td>
      <td className="px-3 py-2">{fmt(r.requests_count)}</td>
      <td className="px-3 py-2">{fmt(r.errors_count)}</td>
      <td className={`px-3 py-2 ${r.last_status && r.last_status >= 400 ? "text-destructive" : ""}`} title={r.last_error ?? ""}>{r.last_status ?? "—"}{r.last_status === 402 ? " · sem crédito" : ""}</td>
      <td className="px-3 py-2">{r.last_used_at ? fmtDate(r.last_used_at) : "—"}</td>
      <td className="px-3 py-2 whitespace-nowrap">
        <Button size="sm" disabled={busy} onClick={() => save()}>Salvar</Button>{" "}
        <Button size="sm" variant="outline" disabled={busy} onClick={() => save(true)}>Zerar</Button>
      </td>
    </tr>
  );
}
