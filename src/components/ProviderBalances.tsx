import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatTokens, parseTokenAmount, providerBalance } from "@/lib/provider-balance";

const toneColor = { ok: "var(--client-dot-green)", warn: "hsl(42 95% 50%)", low: "var(--destructive)", empty: "var(--destructive)" };

export function ProviderBalances() {
  const q = useQuery({
    queryKey: ["admin-provider-balances"],
    queryFn: async () => { const { data, error } = await supabase.rpc("admin_provider_balances"); if (error) throw error; return data ?? []; },
    refetchInterval: 30000,
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const save = async (id: string, clear = false, topUp = false) => {
    const tokens = clear ? null : parseTokenAmount(value);
    if (!clear && tokens == null) { setErr("Use formato como 100M, 1,5B ou 250000."); return; }
    // Recarga soma ao total e mantém o consumo; só "Definir saldo"/"Remover" recomeçam a contagem.
    const { error } = topUp
      ? await supabase.rpc("admin_add_provider_balance", { _provider_id: id, _tokens: tokens as number })
      : await supabase.rpc("admin_set_provider_balance", { _provider_id: id, _tokens: tokens as number });
    if (error) { setErr("Não foi possível salvar o saldo."); return; }
    setEditing(null); setValue(""); setErr(null); void q.refetch();
  };

  return (
    <section className="rounded-md border border-border bg-card p-5 shadow-sm" aria-labelledby="balances-title">
      <div className="mb-4 flex items-center gap-2"><Coins className="h-5 w-5 text-accent" /><h2 id="balances-title" className="font-semibold">Saldo de tokens nos fornecedores</h2></div>
      <p className="mb-4 text-sm text-muted-foreground">Informe quanto foi comprado em cada fornecedor. O uso real dos clientes desconta automaticamente a partir da data em que o saldo foi definido.</p>
      {err && <p role="alert" className="mb-3 text-sm text-destructive">{err}</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(q.data ?? []).map((p) => {
          const has = p.balance != null;
          const b = providerBalance(Number(p.balance ?? 0), Number(p.used));
          return (
            <article key={p.provider_id} className="rounded-md border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-2"><p className="font-medium">{p.name}</p>{has && <span className="text-xs font-semibold" style={{ color: toneColor[b.tone] }}>{b.tone === "empty" ? "Esgotado" : `${b.percent.toFixed(0)}%`}</span>}</div>
              {has ? (<>
                <p className="mt-2 text-2xl font-bold">{formatTokens(b.remaining)}<span className="ml-1 text-sm font-normal text-muted-foreground">de {formatTokens(Number(p.balance))}</span></p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${b.percent}%`, background: toneColor[b.tone] }} /></div>
                <p className="mt-2 text-xs text-muted-foreground">Gasto: {formatTokens(Number(p.used))} · Últimas 24h: {formatTokens(Number(p.used_24h))}</p>
                <p className="text-xs text-muted-foreground">Definido em {new Date(p.set_at!).toLocaleString("pt-BR")}</p>
              </>) : <p className="mt-2 text-sm text-muted-foreground">Sem saldo definido · 24h: {formatTokens(Number(p.used_24h))}</p>}
              {p.window_limit != null && p.window_seconds != null && (() => {
                const limit = Number(p.window_limit), used = Number(p.window_used ?? 0);
                const w = providerBalance(limit, used);
                const hours = p.window_seconds / 3600;
                const reset = p.window_reset_at ? new Date(p.window_reset_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "—";
                return (
                  <div className="mt-3 rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                      <span>Limite a cada {hours.toLocaleString("pt-BR")}h</span>
                      <span style={{ color: toneColor[w.tone] }}>{w.tone === "empty" ? "Pausada até o reset" : `${formatTokens(w.remaining)} livres`}</span>
                    </div>
                    <p className="mt-1 text-lg font-bold">{formatTokens(used)}<span className="ml-1 text-sm font-normal text-muted-foreground">de {formatTokens(limit)}</span></p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (used / limit) * 100)}%`, background: toneColor[w.tone] }} /></div>
                    <p className="mt-2 text-xs text-muted-foreground">Reseta às {reset} (Brasília) · ao esgotar, a reserva assume até o reset</p>
                  </div>
                );
              })()}
              {editing === p.provider_id ? (
                <><div className="mt-3 flex gap-2">
                  <input autoFocus aria-label={has ? "Quanto adicionar" : "Novo saldo"} placeholder={has ? "Adicionar, ex.: 10,4B" : "Ex.: 100M"} value={value} onChange={(e) => setValue(e.target.value)} className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm" />
                  <Button size="sm" onClick={() => save(p.provider_id, false, has)}>Salvar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>×</Button>
                </div>
                  {has && <p className="mt-1 text-xs text-muted-foreground">O valor é somado ao total; o gasto atual continua no card.</p>}
                </>
              ) : (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(p.provider_id); setValue(""); }}>{has ? "Recarregar" : "Definir saldo"}</Button>
                  {has && <Button size="sm" variant="ghost" onClick={() => save(p.provider_id, true)}>Remover</Button>}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
