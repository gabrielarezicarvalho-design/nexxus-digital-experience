import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, Database, RefreshCw, Server, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveIndicator } from "@/lib/admin-ui";
import { supabase } from "@/integrations/supabase/client";
import { checkInfrastructure } from "@/lib/infrastructure.functions";

export const Route = createFileRoute("/admin/infraestrutura")({
  head: () => ({ meta: [
    { title: "Infraestrutura — NEXA CLOUD" },
    { name: "description", content: "Estado dos serviços e das requisições da NEXA CLOUD." },
    { property: "og:title", content: "Infraestrutura — NEXA CLOUD" },
    { property: "og:description", content: "Estado dos serviços e das requisições da NEXA CLOUD." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Infrastructure,
});

function Infrastructure() {
  const check = useServerFn(checkInfrastructure);
  const [lastRequested, setLastRequested] = useState<Date | null>(null);
  const health = useQuery({ queryKey: ["admin-infrastructure-check"], queryFn: () => check(), refetchInterval: 30000, retry: false });
  const traffic = useQuery({
    queryKey: ["admin-infrastructure-traffic"],
    queryFn: async () => {
      const since = new Date(Date.now() - 3600000).toISOString();
      const [requests, errors, latency] = await Promise.all([
        supabase.from("request_logs").select("id", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("request_logs").select("id", { count: "exact", head: true }).gte("created_at", since).gte("status_code", 400).or("error.is.null,error.not.in.(\"limite diário de tokens\",\"modelo não permitido\")"),
        supabase.from("request_logs").select("latency_ms").gte("created_at", since).not("latency_ms", "is", null).order("created_at", { ascending: false }).limit(1000),
      ]);
      if (requests.error || errors.error || latency.error) throw new Error("Não foi possível ler os pedidos recentes.");
      const values = (latency.data ?? []).map((row) => row.latency_ms).filter((ms): ms is number => ms != null);
      return { requests: requests.count ?? 0, errors: errors.count ?? 0, average: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null, sampled: values.length === 1000 };
    },
    refetchInterval: 30000,
    retry: false,
  });

  const refresh = () => { setLastRequested(new Date()); void health.refetch(); void traffic.refetch(); };
  const data = health.data;
  const stamp = data?.checkedAt ?? lastRequested?.toISOString();
  const card = (label: string, value: string, note?: string, alert = false) => (
    <article className="rounded-md border border-border bg-card p-5 shadow-sm" key={label}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-4 font-mono text-xl font-semibold ${alert ? "text-destructive" : "text-foreground"}`}>{value}</p>
      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
    </article>
  );
  const status = (state?: "online" | "error" | "unconfigured", latency?: number | null) => {
    if (!state) return health.isLoading ? "Verificando…" : "Indisponível";
    if (state === "error") return "Indisponível";
    if (state === "unconfigured") return "Não configurado";
    return `ok${latency == null ? "" : ` · ${latency} ms`}`;
  };

  return (
    <div className="w-full space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div><LiveIndicator /><h1 className="text-3xl font-bold">Infraestrutura</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Saúde dos serviços e atividade da última hora.</p></div>
        <Button variant="outline" onClick={refresh} disabled={health.isFetching || traffic.isFetching}><RefreshCw className={health.isFetching || traffic.isFetching ? "animate-spin" : ""} /> Verificar agora</Button>
      </header>

      {(health.isError || traffic.isError) && <div role="alert" className="flex items-center gap-2 text-sm text-destructive"><TriangleAlert className="h-4 w-4" /> {health.isError ? "Falha na verificação dos serviços." : "Falha ao consultar os pedidos."} Tente novamente.</div>}

      <section aria-label="Estado dos serviços" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {card("Servidor", health.isError ? "Indisponível" : data ? "online" : "Verificando…", "Resposta da verificação administrativa", health.isError)}
        {card("Banco de dados", status(data?.database.state, data?.database.latencyMs), "Consulta real aos modelos", data?.database.state === "error")}
        {card("IA da Lovable", data?.ai.state === "online" ? "Configurada" : status(data?.ai.state), "Configuração apenas; não testa uma resposta paga")}
        {card("Health check", stamp ? new Date(stamp).toLocaleTimeString("pt-BR") : "—", "Última verificação")}
      </section>

      <section aria-label="Atividade da última hora" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {card("Pedidos (1h)", traffic.isError ? "—" : String(traffic.data?.requests ?? "—"))}
        {card("Erros (1h)", traffic.isError ? "—" : String(traffic.data?.errors ?? "—"), undefined, !!traffic.data?.errors)}
        {card("Latência média (1h)", traffic.data?.average == null ? "—" : `${traffic.data.average} ms`, traffic.data?.sampled ? "Amostra dos últimos 1.000 pedidos" : "Pedidos com tempo registrado")}
        {card("Fornecedores ativos", data ? String(data.providers.filter((p) => p.state !== "unconfigured").length) : "—", "Contas habilitadas e configuradas")}
      </section>

      <section aria-label="Fornecedores" className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Server className="h-5 w-5 text-accent" /> Fornecedores</h2>
        {data && data.providers.length === 0 && <div className="rounded-md border border-border bg-card p-5 shadow-sm text-sm text-muted-foreground">Nenhum fornecedor cadastrado.</div>}
        {data?.providers.map((provider) => (
          <div key={provider.name} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-5 shadow-sm">
            <div><strong className="text-sm">{provider.name}</strong><p className="mt-1 text-xs text-muted-foreground">Conexão com o provedor de modelos</p></div>
            <span className={`font-mono text-sm font-medium ${provider.state === "error" ? "text-destructive" : provider.state === "unconfigured" ? "text-muted-foreground" : "text-accent"}`}>{status(provider.state, provider.latencyMs)}{provider.state === "unconfigured" ? " · inativo" : ""}</span>
          </div>
        ))}
      </section>
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Activity className="h-4 w-4" /> Atualização automática a cada 30 segundos <Database className="ml-2 h-4 w-4" /> Dados de pedidos registrados <Sparkles className="ml-2 h-4 w-4" /> IA sem chamada de teste</p>
    </div>
  );
}