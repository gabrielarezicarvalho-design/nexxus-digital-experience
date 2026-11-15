import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { lookupKeyUsage } from "@/lib/usage-lookup.functions";

export const Route = createFileRoute("/consumo")({
  head: () => ({
    meta: [
      { title: "Consulta de consumo da API" },
      { name: "description", content: "Consulte tokens usados, limite e validade da sua chave de API." },
      { property: "og:title", content: "Consulta de consumo da API" },
      { property: "og:description", content: "Veja quantos tokens sua chave já usou." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConsumoPage,
});

type Result = Awaited<ReturnType<typeof lookupKeyUsage>>;
const fmt = (n: number) => n.toLocaleString("pt-BR");
const date = (s: string | null) => (s ? new Date(s).toLocaleString("pt-BR") : "—");

function ConsumoPage() {
  const lookup = useServerFn(lookupKeyUsage);
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setRes(null); setLoading(true);
    try { setRes(await lookup({ data: { key } })); }
    catch { setErr("Não foi possível consultar. Verifique a chave."); }
    finally { setLoading(false); }
  }

  const pct = res?.found && res.tokenLimit ? Math.min(100, (res.tokensUsed / res.tokenLimit) * 100) : 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">Consulta de consumo</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cole sua chave de API para ver o uso.</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
          />
          <button disabled={loading || key.trim().length < 10}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {loading ? "Consultando..." : "Consultar"}
          </button>
        </form>
        {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
        {res && !res.found && <p className="mt-4 text-sm text-destructive">Chave não encontrada.</p>}
        {res?.found && (
          <div className="mt-6 space-y-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span>
              <span className={`font-semibold capitalize ${res.status === "ativa" ? "text-primary" : "text-destructive"}`}>{res.status}</span></div>
            <div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tokens usados</span>
                <span className="font-semibold text-foreground">{fmt(res.tokensUsed)}{res.tokenLimit ? ` / ${fmt(res.tokenLimit)}` : " (ilimitado)"}</span></div>
              {res.tokenLimit ? <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div> : null}
            </div>
            {res.dailyReset && <DailyResetCard reset={res.dailyReset} />}
            <div className="flex justify-between"><span className="text-muted-foreground">Comandos</span><span className="text-foreground">{fmt(res.requests)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Validade</span><span className="text-foreground">{res.expiresAt ? date(res.expiresAt) : "Sem validade"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Último uso</span><span className="text-foreground">{date(res.lastUsedAt)}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}


type DailyReset = { plan: string | null; limit: number; usedToday: number; resetsAt: string };
const brt = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", ...opts });

function DailyResetCard({ reset }: { reset: DailyReset }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id); }, []);
  const ms = Math.max(0, new Date(reset.resetsAt).getTime() - now);
  const pct = reset.limit ? Math.min(100, (reset.usedToday / reset.limit) * 100) : 0;
  return (
    <div className="rounded-xl border border-accent/40 bg-accent/10 p-4">
      <div className="flex items-center justify-between gap-2 text-muted-foreground">
        <span>Seu limite diário zera às</span>
        {reset.plan && <span className="text-xs font-bold uppercase text-accent">Plano {reset.plan}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">
        {brt(reset.resetsAt, { hour: "2-digit", minute: "2-digit" })} <span className="text-sm font-medium text-muted-foreground">(horário de Brasília) · {brt(reset.resetsAt, { day: "2-digit", month: "2-digit" })}</span>
      </p>
      <p className="mt-1 text-muted-foreground">Faltam {Math.floor(ms / 3_600_000)}h {String(Math.floor((ms % 3_600_000) / 60_000)).padStart(2, "0")}min</p>
      <p className="text-muted-foreground">{fmt(Math.min(reset.usedToday, reset.limit))} usados hoje de {fmt(reset.limit)}</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-accent" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
