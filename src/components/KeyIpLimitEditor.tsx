import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { adminSetKeyIpLimit } from "@/lib/admin.functions";

/** Campo do painel de administrador para mudar o limite de IPs de uma chave. */
export function KeyIpLimitEditor({ keyId, current }: { keyId: string; current: number }) {
  const save = useServerFn(adminSetKeyIpLimit);
  const qc = useQueryClient();
  const [value, setValue] = useState(String(current));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => setValue(String(current)), [current]);

  const n = Number(value);
  const valid = Number.isInteger(n) && n >= 1 && n <= 1000;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || n === current) return;
    setBusy(true); setMsg(null);
    try {
      const r = await save({ data: { keyId, ipLimit: n } });
      setMsg(r.reactivated ? "Limite salvo e chave reativada." : "Limite salvo.");
      await qc.invalidateQueries();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
      <label className="flex items-center gap-2 text-muted-foreground">
        Limite de IPs
        <input
          type="number" min={1} max={1000} step={1} inputMode="numeric"
          aria-label="Limite de IPs da chave"
          className="h-8 w-20 rounded-md border border-input bg-background px-2 text-foreground"
          value={value} onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <Button type="submit" size="sm" variant="outline" disabled={busy || !valid || n === current}>
        {busy ? "Salvando…" : "Salvar limite"}
      </Button>
      {msg && <span className="text-muted-foreground">{msg}</span>}
    </form>
  );
}
