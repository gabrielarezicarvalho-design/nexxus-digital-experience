import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CircleGauge,
  Clock3,
  KeyRound,
  Radio,
  Server,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fmt } from "@/lib/admin-ui";
import { providerShares } from "@/lib/provider-shares";
import { pageHead } from '@/lib/page-head';
import { successRate } from '@/lib/success-rate';

export const Route = createFileRoute("/admin/")({ head: () => pageHead('Dashboard administrativo', 'Métricas operacionais de pedidos, tokens e fornecedores NEXA CLOUD.'), component: Dashboard });

const PERIODS = [{ k: "1", label: "24h" }, { k: "7", label: "7 dias" }, { k: "30", label: "30 dias" }] as const;
const ROOT_URL = "https://api.cloudnexa.com.br";

const sameLocalDay = (value: string | Date, other = new Date()) => {
  const date = new Date(value);
  return date.getFullYear() === other.getFullYear()
    && date.getMonth() === other.getMonth()
    && date.getDate() === other.getDate();
};

const shortModel = (model: string | null) => model?.replace(/^anthropic\//, "") ?? "Sem modelo";

function Dashboard() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["k"]>("1");
  const start = useMemo(() => {
    const date = new Date();
    date.setHours(date.getHours() - (period === "1" ? 24 : Number(period) * 24));
    return date;
  }, [period]);

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [clientsResult, keysResult] = await Promise.all([
        supabase.from("clients").select("status"),
        supabase.from("api_keys").select("status, token_limit, tokens_used, last_used_at, expires_at, created_at, plano"),
      ]);
      const clients = clientsResult.data ?? [];
      const keys = keysResult.data ?? [];
      const usable = keys.filter((key) => key.status !== "revoked");
      return {
        clients: clients.length,
        activeClients: clients.filter((client) => client.status === "active").length,
        activeKeys: keys.filter((key) => key.status === "active").length,
        usedTokens: usable.reduce((sum, key) => sum + Number(key.tokens_used), 0),
        tokenLimit: usable.filter((key) => key.token_limit != null).reduce((sum, key) => sum + Number(key.token_limit), 0),
        lastActivity: usable.map((key) => key.last_used_at).filter(Boolean).sort().at(-1) ?? null,
      };
    },
    refetchInterval: 30000,
  });

  type Summary = {
    hours: { hour: string; requests: number; errors: number; tokens: number; excluded_502?: number; excluded_502_errors?: number; rate_excluded_502?: number; rate_excluded_502_errors?: number }[];
    models: { model: string | null; tokens: number }[];
    clients: { name: string; tokens: number }[];
    providers: { provider: string; requests: number }[];
    p50: number | null; p95: number | null;
    recent: { id: string; created_at: string; model: string | null; total_tokens: number; status_code: number }[];
  };
  const { data: summary } = useQuery({
    queryKey: ["admin-dashboard-summary", start.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_dashboard_summary", { _start: start.toISOString() });
      if (error) throw error;
      return data as unknown as Summary;
    },
    refetchInterval: 30000,
  });
  const hours = summary?.hours ?? [];

  const timeline = useMemo(() => {
    const slots = new Map<string, { label: string; requests: number; errors: number; tokens: number }>();
    if (period === "1") {
      for (let index = 23; index >= 0; index -= 1) {
        const point = new Date();
        point.setMinutes(0, 0, 0);
        point.setHours(point.getHours() - index);
        const key = `${point.getFullYear()}-${point.getMonth()}-${point.getDate()}-${point.getHours()}`;
        slots.set(key, { label: `${String(point.getHours()).padStart(2, "0")}h`, requests: 0, errors: 0, tokens: 0 });
      }
    } else {
      for (let index = Number(period) - 1; index >= 0; index -= 1) {
        const point = new Date();
        point.setHours(0, 0, 0, 0);
        point.setDate(point.getDate() - index);
        const key = `${point.getFullYear()}-${point.getMonth()}-${point.getDate()}`;
        slots.set(key, { label: point.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), requests: 0, errors: 0, tokens: 0 });
      }
    }
    for (const h of hours) {
      const date = new Date(h.hour);
      const key = period === "1"
        ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`
        : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const slot = slots.get(key);
      if (!slot) continue;
      slot.requests += Number(h.requests);
      slot.tokens += Number(h.tokens);
      slot.errors += Number(h.errors);
    }
    return [...slots.values()];
  }, [hours, period]);

  const models = useMemo(() => {
    const totals = new Map<string, number>();
    for (const m of summary?.models ?? []) {
      const name = shortModel(m.model);
      totals.set(name, (totals.get(name) ?? 0) + Number(m.tokens));
    }
    return [...totals].map(([name, tokens]) => ({ name, tokens })).sort((a, b) => b.tokens - a.tokens).slice(0, 5);
  }, [summary]);

  const clients = useMemo(() => (summary?.clients ?? []).map((c) => ({ name: c.name, tokens: Number(c.tokens) })), [summary]);

  const providers = useMemo(() => providerShares(summary?.providers ?? []), [summary]);

  const requests = hours.reduce((s, h) => s + Number(h.requests), 0);
  const errors = hours.reduce((s, h) => s + Number(h.errors), 0);
  const tokens = hours.reduce((s, h) => s + Number(h.tokens), 0);
  const p50 = summary?.p50 ?? 0;
  const p95 = summary?.p95 ?? 0;
  const rateExcluded = hours.reduce((s, h) => s + Number(h.rate_excluded_502 ?? 0), 0);
  const rateExcludedErrors = hours.reduce((s, h) => s + Number(h.rate_excluded_502_errors ?? 0), 0);
  const success = successRate(requests, requests - errors - rateExcluded + rateExcludedErrors, rateExcluded);
  const requestsToday = hours.filter((h) => sameLocalDay(h.hour)).reduce((s, h) => s + Number(h.requests), 0);
  const maxModelTokens = models[0]?.tokens ?? 1;
  const maxClientTokens = clients[0]?.tokens ?? 1;
  const recent = summary?.recent ?? [];

  return (
    <div className="ops-dashboard">
      <header className="ops-header">
        <div>
          <p className="ops-eyebrow"><span /> Operação em tempo real</p>
          <h1>Painel operacional</h1>
          <p>Desempenho, consumo e saúde do roteador.</p>
        </div>
        <div className="ops-periods" aria-label="Período do dashboard">
          {PERIODS.map((item) => (
            <Button key={item.k} variant="ghost" size="sm" className={period === item.k ? "is-active" : ""} onClick={() => setPeriod(item.k)}>
              {item.label}
            </Button>
          ))}
        </div>
      </header>

      <section className="ops-metrics" aria-label="Indicadores principais">
        <Metric label="Pedidos" value={fmt(period === "1" ? requestsToday : requests)} note={period === "1" ? "hoje" : `últimos ${period} dias · ${fmt(requestsToday)} hoje`} icon={<Activity />} />
        <Metric label="Tokens" value={fmt(tokens)} note="entrada + saída" icon={<Zap />} />
        <Metric label="Taxa de sucesso" value={`${success.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`} note={`${fmt(errors - rateExcludedErrors)} falhas do site/fornecedor · ${fmt(rateExcluded)} fora da taxa`} icon={<CheckCircle2 />} />
        <Metric label="Latência P50" value={p50 ? `${(p50 / 1000).toFixed(1)}s` : "0.0s"} note={`p95 ${(p95 / 1000).toFixed(1)}s`} icon={<Clock3 />} />
        <Metric label="Chaves ativas" value={fmt(stats?.activeKeys ?? 0)} note="carteira saudável" icon={<KeyRound />} />
      </section>

      <div className="ops-primary-grid">
        <ChartPanel title="Volume de pedidos" subtitle="Pedidos e falhas ao longo do período" legend>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeline} margin={{ top: 18, right: 12, left: -24, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--ops-grid)" strokeDasharray="2 4" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={18} tick={{ fill: "var(--ops-muted)", fontSize: 10 }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "var(--ops-muted)", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "var(--ops-panel)", border: "1px solid var(--ops-line)", borderRadius: 4 }} />
              <Line type="monotone" dataKey="requests" name="Pedidos" stroke="var(--ops-lime)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="errors" name="Erros" stroke="var(--ops-danger)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <section className="ops-panel ops-status">
          <PanelTitle title="Status do sistema" subtitle="Leitura do período selecionado" />
          <div className="ops-health"><CheckCircle2 /><div><strong>{errors ? "Operação com alertas" : "Todos os pedidos saudáveis"}</strong><span>Atualização automática a cada 30 segundos</span></div></div>
          <dl>
            <div><dt>Roteador</dt><dd>Operacional</dd></div>
            <div><dt>Clientes ativos</dt><dd>{fmt(stats?.activeClients ?? 0)}</dd></div>
            <div><dt>Chaves ativas</dt><dd>{fmt(stats?.activeKeys ?? 0)}</dd></div>
            <div><dt>Sucesso</dt><dd>{success.toFixed(1)}%</dd></div>
          </dl>
           <Button asChild variant="outline" className="ops-action"><Link to="/admin/infraestrutura">Abrir infraestrutura <ArrowRight /></Link></Button>
        </section>
      </div>

      <div className="ops-triple-grid">
        <ChartPanel title="Consumo por período" subtitle="Tokens processados">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeline} margin={{ top: 18, right: 10, left: -24, bottom: 0 }}>
              <defs><linearGradient id="tokensArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--ops-lime)" stopOpacity={0.38} /><stop offset="100%" stopColor="var(--ops-lime)" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="var(--ops-grid)" strokeDasharray="2 4" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={22} tick={{ fill: "var(--ops-muted)", fontSize: 9 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--ops-muted)", fontSize: 9 }} tickFormatter={(value) => fmt(value)} />
              <Tooltip contentStyle={{ background: "var(--ops-panel)", border: "1px solid var(--ops-line)", borderRadius: 4 }} formatter={(value: number) => [fmt(value), "Tokens"]} />
              <Area type="monotone" dataKey="tokens" stroke="var(--ops-lime)" fill="url(#tokensArea)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>

        <RankingPanel title="Modelos mais usados" subtitle="Distribuição por tokens" items={models} max={maxModelTokens} empty="Sem dados neste período." />
        <RankingPanel title="Clientes com maior uso" subtitle="Consumo por cliente" items={clients} max={maxClientTokens} empty="Sem dados neste período." />
      </div>

      <div className="ops-secondary-grid">
        <section className="ops-panel ops-activity">
          <div className="ops-panel-heading"><PanelTitle title="Atividade recente" subtitle="Últimos pedidos roteados" /><Link to="/admin/logs">Ver histórico <ArrowRight /></Link></div>
          {recent.length ? <div className="ops-activity-list">{recent.map((log) => (
            <div key={log.id}><span className={log.status_code >= 400 ? "is-error" : ""} /><time>{new Date(log.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time><strong>{shortModel(log.model)}</strong><small>{fmt(log.total_tokens)} tokens</small><b>{log.status_code}</b></div>
          ))}</div> : <EmptyState text="Sem dados neste período." />}
        </section>

        <section className="ops-panel ops-provider">
          <PanelTitle title="Fornecedores" subtitle="Participação nos pedidos" />
          {providers.length ? <>
            <div
              className="ops-provider-ring"
              style={{ background: `conic-gradient(${providers.map((p) => `${p.color} ${p.start}% ${p.end}%`).join(", ")}, var(--ops-line) 0)` }}
            >
              <div><strong>{fmt(requests)}</strong><span>pedidos</span></div>
            </div>
            <div className="ops-provider-legend-list">
              {providers.map((p) => (
                <div key={p.name} className="ops-provider-legend">
                  <span style={{ background: p.color }} />
                  <b>{p.name}</b>
                  <em>{p.pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% · {fmt(p.requests)} {p.requests === 1 ? "pedido" : "pedidos"}</em>
                </div>
              ))}
            </div>
          </> : <EmptyState text="Sem dados neste período." />}
          <Button asChild variant="outline" className="ops-action"><Link to="/admin/configuracoes">Gerenciar fornecedor <ArrowRight /></Link></Button>
        </section>
      </div>

      <section className="ops-panel ops-endpoints">
        <PanelTitle title="Endereços de conexão" subtitle="Use estes endereços nos programas dos clientes." />
        <div>
          <Endpoint icon={<Radio />} label="Claude Code" value={ROOT_URL} />
          <Endpoint icon={<Server />} label="OpenAI, Cursor e Continue" value={`${ROOT_URL}/v1`} />
          <Endpoint icon={<CircleGauge />} label="Modelos" value={`${ROOT_URL}/v1/models`} />
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, note, icon }: { label: string; value: string; note: string; icon: React.ReactNode }) {
  return <article className="ops-metric"><div><span>{label}</span>{icon}</div><strong>{value}</strong><small>{note}</small></article>;
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="ops-title"><h2>{title}</h2><p>{subtitle}</p></div>;
}

function ChartPanel({ title, subtitle, legend = false, children }: { title: string; subtitle: string; legend?: boolean; children: React.ReactNode }) {
  return <section className="ops-panel ops-chart"><div className="ops-panel-heading"><PanelTitle title={title} subtitle={subtitle} />{legend && <div className="ops-legend"><span />Pedidos <span />Erros</div>}</div><div className="ops-chart-area">{children}</div></section>;
}

function RankingPanel({ title, subtitle, items, max, empty }: { title: string; subtitle: string; items: { name: string; tokens: number }[]; max: number; empty: string }) {
  return <section className="ops-panel ops-ranking"><PanelTitle title={title} subtitle={subtitle} />{items.length ? <div className="ops-ranking-list">{items.map((item, index) => <div key={item.name}><div><span>{index + 1}. {item.name}</span><b>{fmt(item.tokens)}</b></div><i><em style={{ width: `${Math.max(3, item.tokens / max * 100)}%` }} /></i></div>)}</div> : <EmptyState text={empty} />}</section>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="ops-empty">{text}</div>;
}

function Endpoint({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <article><span>{icon}</span><div><strong>{label}</strong><code>{value}</code></div></article>;
}