import { asFamily, FAMILY_LABELS, MODEL_FAMILIES, type ModelFamily } from "@/lib/model-family";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { KeyIpLimitEditor } from "@/components/KeyIpLimitEditor";
import { LiveIndicator } from "@/lib/admin-ui";
import { StatusBadge, fmt, fmtDate } from "@/lib/admin-ui";
import { adminDeliveryMessage } from "@/lib/reseller-delivery-message";
import { TRIAL_PLAN_NAME, TRIAL_TOKENS } from "@/lib/free-trial";
import { adminCreateClient, adminDeleteClient, adminFindClientByKey, adminPurgeKeylessClients, adminGenerateKey, adminKeyIps, adminRegenerateKey, adminRenewKey, adminSetClientStatus, adminSetKeyStatus, adminSetKeyProvider, adminUpdateClient } from "@/lib/admin.functions";
import { filterAdminClients, isFullApiKeySearch, visibleKeysForSearch } from "@/lib/admin-client-search";
import { Copy, KeyRound, Network, Search, X } from "lucide-react";
import { hasTokenLimit } from "@/lib/plan-limits";
import { adminKeyFamily, adminPlanTab } from "@/lib/admin-plan-tabs";
import { canUpgradeTokens } from '@/lib/token-upgrade';
import { adminAddKeyTokens } from '@/lib/token-upgrade.functions';
import { AdminClientUsageDialog } from '@/components/AdminClientUsageDialog';

const HIDDEN_ADMIN_PLAN_CODES = ["cc_3d", "cc_7d"];

export const Route = createFileRoute("/admin/clientes")({
  head: () => ({ meta: [
    { title: "Clientes e chaves — NEXA CLOUD" },
    { name: "description", content: "Gerencie clientes e chaves de API da NEXA CLOUD." },
    { property: "og:title", content: "Clientes e chaves — NEXA CLOUD" },
    { property: "og:description", content: "Gerencie clientes e chaves de API da NEXA CLOUD." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Clientes,
});

type Key = { id: string; key_prefix: string | null; plano?: string | null; model_family?: string | null; status: string; token_limit: number | null; daily_token_limit: number | null; tokens_used: number; requests_count: number; expires_at: string | null; last_used_at: string | null; created_at: string; forced_provider?: string | null };
type Row = {
  id: string; name: string; email: string; company: string | null; phone: string | null; status: string; plan_id: string | null;
  plans: { name: string } | null;
  api_keys: Key[];
};
const inputCls = "w-full min-w-0 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent";
// Aceita "15000000", "15.000.000" ou "15 000 000" e devolve o número inteiro.
export const parseTokens = (s: string) => {
  const digits = s.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
};

function Clientes() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [modo, setModo] = useState<"novo" | "existente">("novo");
  const [nome, setNome] = useState(""); const [email, setEmail] = useState(""); const [empresa, setEmpresa] = useState("");
  const [clientId, setClientId] = useState(""); const [planId, setPlanId] = useState(""); const [family, setFamily] = useState<ModelFamily>("claude");
  const [tokens, setTokens] = useState(""); const [dias, setDias] = useState(""); const [rpm, setRpm] = useState("60");
  const [form, setForm] = useState<null | Partial<Row & { token_limit: string; expires_at: string }>>(null);
  const [novaChave, setNovaChave] = useState<string | null>(null);
  const [novaMsg, setNovaMsg] = useState<string | null>(null);
  const entregar = (key: string, mail?: string | null) => { setNovaChave(key); setNovaMsg(adminDeliveryMessage(mail, key)); };
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [renovar, setRenovar] = useState<Row | null>(null);
  const [ver, setVer] = useState<Row | null>(null);
  const [ipsDe, setIpsDe] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState<{ key: Key; name: string; requestId: string } | null>(null);
  const [extraTokens, setExtraTokens] = useState('');
  const addTokens = useServerFn(adminAddKeyTokens);

  const create = useServerFn(adminCreateClient), update = useServerFn(adminUpdateClient), setStatus = useServerFn(adminSetClientStatus);
  const del = useServerFn(adminDeleteClient), regen = useServerFn(adminRegenerateKey), renew = useServerFn(adminRenewKey);
  const gen = useServerFn(adminGenerateKey), setKeyStatus = useServerFn(adminSetKeyStatus);
  const findClientByKey = useServerFn(adminFindClientByKey);
  const purgeKeyless = useServerFn(adminPurgeKeylessClients);
  const [exactKeyMatch, setExactKeyMatch] = useState<{ term: string; clientId: string | null; keyId: string | null } | null>(null);
  const [keySearchPending, setKeySearchPending] = useState(false);
  const [keySearchError, setKeySearchError] = useState<string | null>(null);

  useEffect(() => {
    const term = busca.trim();
    setExactKeyMatch(null);
    setKeySearchError(null);
    if (!isFullApiKeySearch(term)) {
      setKeySearchPending(false);
      return;
    }

    let cancelled = false;
    setKeySearchPending(true);
    const timer = window.setTimeout(async () => {
      try {
        const result = await findClientByKey({ data: { key: term } });
        if (!cancelled) setExactKeyMatch({ term, clientId: result.clientId, keyId: result.keyId });
      } catch {
        if (!cancelled) setKeySearchError("Não foi possível buscar a chave. Tente novamente.");
      } finally {
        if (!cancelled) setKeySearchPending(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [busca, findClientByKey]);

  const { data: rows = [], isLoading, error: queryError } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients")
        .select("id, name, email, company, phone, status, plan_id, plans(name), api_keys(id, key_prefix, plano, model_family, status, token_limit, daily_token_limit, tokens_used, requests_count, expires_at, last_used_at, created_at, forced_provider)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Row[];
    },
  });
  const { data: plans = [] } = useQuery({
    queryKey: ["admin-plans"], queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").eq("active", true).order("price_cents");
      if (error) throw error;
      // Claude 5x/20x antigos (50 e 150 tokens) não aparecem para emissão no admin.
      return (data ?? []).filter(hasTokenLimit).filter((p) => !HIDDEN_ADMIN_PLAN_CODES.includes(p.code ?? ""));
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-clients"] });
  const keyOf = (r: Row) => [...r.api_keys].filter((k) => k.status !== "revoked").sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const run = async (fn: () => Promise<unknown>) => { setErro(null); try { await fn(); await refresh(); } catch (e) { setErro((e as Error).message); } };
  const choosePlan = (id: string) => {
    setPlanId(id);
    const p = plans.find((x) => x.id === id);
    setTokens(p?.token_limit?.toString() ?? ""); setDias(p?.duration_days?.toString() ?? ""); setRpm(String(p?.rpm_limit ?? 60));
  };
  async function gerar(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErro(null);
    try {
      const days = dias ? Number(dias) : 0;
      const token_limit = tokens ? parseTokens(tokens) : null;
      if (modo === "novo") {
        const r = await create({ data: { name: nome, email, company: empresa || null, plan_id: planId || null, token_limit, family: adminKeyFamily(family, plans.find((p) => p.id === planId)?.code),
          expires_at: days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null, status: "active" } });
        entregar(r.apiKey, email); setNome(""); setEmail(""); setEmpresa("");
      } else {
        if (!clientId) throw new Error("Escolha um cliente.");
        const r = await gen({ data: { clientId, plan_id: planId || null, token_limit, days, rpm_limit: Number(rpm) || 60, plano: plans.find((p) => p.id === planId)?.name ?? null, family: adminKeyFamily(family, plans.find((p) => p.id === planId)?.code) } });
        entregar(r.apiKey, rows.find((c) => c.id === clientId)?.email);
      }
      await refresh();
    } catch (e) { setErro((e as Error).message); } finally { setBusy(false); }
  }
  async function salvar(e: React.FormEvent) {
    e.preventDefault(); if (!form) return;
    const payload = { name: form.name ?? "", email: form.email ?? "", company: form.company || null, plan_id: form.plan_id || null,
      status: (form.status as "active" | "blocked") ?? "active", token_limit: form.token_limit ? parseTokens(form.token_limit) : null,
      expires_at: form.expires_at ? new Date(form.expires_at + "T23:59:59").toISOString() : null };
    await run(async () => {
      if (form.id) await update({ data: { id: form.id, ...payload } });
      else { const r = await create({ data: payload }); entregar(r.apiKey, payload.email); }
      setForm(null);
    });
  }
  const exactKeyClientId = exactKeyMatch?.term === busca.trim() ? exactKeyMatch.clientId : null;
  const exactKeyId = exactKeyMatch?.term === busca.trim() ? exactKeyMatch.keyId : null;
  const lista = filterAdminClients(rows, busca, exactKeyClientId);
  const planCards = (() => {
    const now = Date.now();
    const groups: Record<string, { clients: Set<string>; keys: number }> = {};
    const label = (pl: string) => {
      const n = pl.replace(/^GPT\s+/i, "").trim().toLowerCase();
      if (n === "teams") return "Teams"; if (n === "enterprise") return "Enterprise"; if (n === "max") return "Max"; if (n === "pro") return "Pro";
      if (/^(essencial|pack)|milh/i.test(pl)) return "Planos por tokens";
      return null;
    };
    for (const g of ["Teams", "Enterprise", "Max", "Pro", "Planos por tokens"]) groups[g] = { clients: new Set(), keys: 0 };
    for (const r of rows) for (const k of r.api_keys) {
      if (k.status !== "active" || (k.expires_at && new Date(k.expires_at).getTime() <= now) || !k.plano) continue;
      const g = label(k.plano); if (!g) continue;
      const grp = groups[g]; if (!grp) continue; grp.clients.add(r.id); grp.keys++;
    }
    return Object.entries(groups);
  })();
  return (
    <div className="w-full space-y-6">
      <div className="border-b border-border pb-6"><LiveIndicator /><h1 className="text-2xl font-bold">Clientes e chaves</h1><p className="mt-1 text-sm text-muted-foreground">Gerencie clientes, planos, validade e consumo de cada chave.</p></div>
      <section aria-label="Clientes por plano" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {planCards.map(([name, g]) => <div key={name} className="rounded-md border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">{name}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{g.clients.size}</p>
          <p className="text-xs text-muted-foreground">{g.clients.size === 1 ? "cliente" : "clientes"} · {g.keys} {g.keys === 1 ? "chave ativa" : "chaves ativas"}</p>
        </div>)}
      </section>
      {erro && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}
      <section className="rounded-md border border-border bg-card p-4 sm:p-5" aria-labelledby="gerar-chave-titulo">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="gerar-chave-titulo" className="font-semibold">Gerar chave</h2>
          <div className="flex gap-1" role="group" aria-label="Tipo de cliente">
            <Button type="button" size="sm" variant={modo === "novo" ? "default" : "outline"} className={modo === "novo" ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""} onClick={() => setModo("novo")}>Novo cliente</Button>
            <Button type="button" size="sm" variant={modo === "existente" ? "default" : "outline"} className={modo === "existente" ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""} onClick={() => setModo("existente")}>Cliente existente</Button>
          </div>
        </div>
        <form onSubmit={gerar} className="space-y-4">
          {modo === "novo" ? <div className="grid gap-2 sm:grid-cols-3">
            <input required aria-label="Nome do cliente" placeholder="Nome do cliente" className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} />
            <input required type="email" aria-label="E-mail" placeholder="E-mail" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
            <input aria-label="Empresa" placeholder="Empresa (opcional)" className={inputCls} value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
          </div> : <ClientPicker rows={rows} value={clientId} onChange={setClientId} />}
          <fieldset><legend className="mb-2 text-xs font-medium text-muted-foreground">Tipo da chave</legend>
            <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Tipo da chave">{MODEL_FAMILIES.map((f) => <Button type="button" key={f} size="sm" role="radio" aria-checked={family === f} variant={family === f ? "default" : "outline"} className={family === f ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""} onClick={() => { setFamily(f); choosePlan(""); }}>{FAMILY_LABELS[f]}</Button>)}</div>
          </fieldset>
          <fieldset><legend className="mb-2 text-xs font-medium text-muted-foreground">Plano</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Button type="button" variant="outline" onClick={() => choosePlan("")} className={`h-auto min-h-16 flex-col items-start whitespace-normal border p-3 text-left ${!planId ? "border-accent bg-accent/10" : ""}`}><strong>Personalizado</strong><span className="text-xs font-normal text-muted-foreground">Definir manualmente</span></Button>
              {plans.filter((p) => adminPlanTab(p) === family).sort((a, b) => Number(a.kind !== "tokens") - Number(b.kind !== "tokens")).map((p) => <Button type="button" key={p.id} variant="outline" onClick={() => choosePlan(p.id)} className={`h-auto min-h-16 flex-col items-start whitespace-normal border p-3 text-left ${planId === p.id ? "border-accent bg-accent/10" : ""}`}><strong>{p.name}</strong><span className="text-xs font-normal text-muted-foreground">{fmt(p.daily_token_limit ?? p.token_limit)} tokens{p.daily_token_limit ? "/dia" : ""} · {p.duration_days ? `${p.duration_days} dias` : "sem prazo"}</span></Button>)}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs text-muted-foreground">Dias de validade<input type="number" min="0" max="3650" placeholder="Sem expiração" className={`mt-1 ${inputCls}`} value={dias} onChange={(e) => setDias(e.target.value)} /></label>
            <label className="text-xs text-muted-foreground">Limite total de tokens<input type="text" inputMode="numeric" required={!plans.find(p => p.id === planId)?.daily_token_limit} placeholder="Ex.: 15.000.000" className={`mt-1 ${inputCls}`} value={tokens} onChange={(e) => setTokens(e.target.value)} /></label>
            {modo === "existente" && <label className="text-xs text-muted-foreground">Requisições por minuto<input type="number" min="1" max="10000" className={`mt-1 ${inputCls}`} value={rpm} onChange={(e) => setRpm(e.target.value)} /></label>}
          </div>
          <Button disabled={busy} type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90"><KeyRound />{busy ? "Gerando…" : "Gerar chave"}</Button>
        </form>
      </section>
      {novaChave && <section className="rounded-md border border-accent bg-accent/10 p-4" aria-live="polite"><div className="flex items-center justify-between"><p className="text-sm font-semibold">Chave gerada — copie agora</p><Button size="icon" variant="ghost" aria-label="Fechar chave" onClick={() => { setNovaChave(null); setNovaMsg(null); }}><X /></Button></div><p className="text-xs text-muted-foreground">Ela também ficará visível para o cliente em Minha chave.</p><div className="mt-3 flex flex-wrap items-center gap-2"><code className="max-w-full break-all rounded bg-background px-2 py-1 text-sm">{novaChave}</code><Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(novaChave)}><Copy /> Copiar</Button></div>{novaMsg && <div className="mt-4 space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-semibold">Mensagem para o cliente</p><Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(novaMsg)}><Copy /> Copiar mensagem</Button></div><textarea className="w-full resize-y rounded border bg-background p-2 text-sm" aria-label="Mensagem para o cliente" readOnly rows={18} value={novaMsg} /></div>}</section>}
      <section aria-labelledby="chaves-titulo" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="chaves-titulo" className="text-lg font-semibold">Clientes cadastrados <span className="text-sm font-normal text-muted-foreground">({lista.length})</span></h2>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => { const n = rows.filter((r) => r.api_keys.length === 0).length; if (confirm(`Excluir ${n} clientes sem nenhuma chave (e a conta de login deles)? Admins, revendedores e afiliados são preservados.`)) run(async () => { const r = await purgeKeyless(); setErro(r.failed.length ? `Não foi possível excluir: ${r.failed.join(", ")}` : null); alert(`${r.deleted} contas sem chave excluídas.`); }); }}>Excluir clientes sem chave</Button>
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input aria-label="Buscar clientes ou chaves" placeholder="Buscar cliente ou chave…" value={busca} onChange={(e) => setBusca(e.target.value)} className={`${inputCls} pl-9 sm:w-64`} /></div></div>
        {keySearchPending && <p className="text-sm text-muted-foreground" role="status">Buscando a chave completa…</p>}
        {keySearchError && <p className="text-sm text-destructive" role="alert">{keySearchError}</p>}
        {queryError && <p role="alert" className="text-sm text-destructive">Não foi possível carregar os clientes: {queryError.message}</p>}
        {isLoading && <p className="text-sm text-muted-foreground">Carregando clientes…</p>}
        {!isLoading && !queryError && !keySearchPending && lista.length === 0 && <p className="rounded-md border border-border p-6 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</p>}
        {lista.map((r) => { const k = keyOf(r); return <article key={r.id} className="rounded-md border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3><Button variant="link" className="h-auto whitespace-normal p-0 text-left font-semibold text-foreground hover:text-accent" onClick={() => setVer(r)}>{r.name}</Button></h3><StatusBadge status={r.status} />{k && k.status !== "active" && <StatusBadge status={k.status} />}</div><p className="mt-1 text-xs text-muted-foreground">{r.email}{r.company ? ` · ${r.company}` : ""} · {r.plans?.name ?? "Sem plano"}{r.phone && <> · <a className="text-accent underline-offset-2 hover:underline" href={`https://wa.me/55${r.phone}`} target="_blank" rel="noreferrer">WhatsApp {r.phone.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3")}</a></>}</p></div>
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="outline" onClick={() => setVer(r)}>Ver uso</Button>
            <Button size="sm" variant="outline" onClick={() => setForm({ ...r, token_limit: k?.token_limit?.toString() ?? "", expires_at: k?.expires_at?.slice(0, 10) ?? "" })}>Editar</Button>
            {k && <Button size="sm" variant="outline" onClick={() => setRenovar(r)}>Renovar</Button>}
            <Button size="sm" variant="outline" onClick={() => confirm(`Gerar teste grátis de 5 milhões de tokens para ${r.name}?`) && run(async () => entregar((await gen({ data: { clientId: r.id, plan_id: null, token_limit: TRIAL_TOKENS, days: 0, rpm_limit: 60, plano: TRIAL_PLAN_NAME, family: "claude" } })).apiKey, r.email))}>Teste grátis 5M</Button>
            {k && <Button size="sm" variant="outline" onClick={() => confirm("Gerar uma nova chave? As chaves atuais param de funcionar.") && run(async () => entregar((await regen({ data: { clientId: r.id } })).apiKey, r.email))}>Regenerar</Button>}
            <Button size="sm" variant="outline" onClick={() => run(() => setStatus({ data: { id: r.id, status: r.status === "active" ? "blocked" : "active" } }))}>{r.status === "active" ? "Bloquear" : "Desbloquear"}</Button>
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => confirm(`Excluir ${r.name}? Isso apaga as chaves dele.`) && run(() => del({ data: { id: r.id } }))}>Excluir</Button>
          </div></div>
          {r.api_keys.length === 0 && <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">Sem chaves. Selecione este cliente em Gerar chave.</p>}
          {visibleKeysForSearch(r.api_keys, busca, exactKeyId).sort((a,b) => b.created_at.localeCompare(a.created_at)).map((key) => <div key={key.id} className="mt-4 border-t border-border pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2 text-xs"><code className="font-mono">{key.key_prefix ? `${key.key_prefix}…` : "Chave antiga"}</code><StatusBadge status={key.status} /><span className="rounded border border-border px-1.5 py-0.5 font-medium">{FAMILY_LABELS[asFamily(key.model_family)]}</span><span className="text-muted-foreground">Expira: {fmtDate(key.expires_at)} · Último uso: {fmtDate(key.last_used_at)}</span></div>
            <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => setIpsDe(ipsDe === key.id ? null : key.id)}><Network /> IPs</Button>{key.status !== "revoked" && <><Button size="sm" variant="outline" onClick={() => run(() => setKeyStatus({ data: { id: key.id, status: key.status === "active" ? "blocked" : "active" } }))}>{key.status === "active" ? "Bloquear chave" : "Ativar chave"}</Button><Button size="sm" variant="outline" className="text-destructive" onClick={() => confirm("Revogar esta chave de vez?") && run(() => setKeyStatus({ data: { id: key.id, status: "revoked" } }))}>Revogar</Button></>}</div></div>
            <div className="mt-2 flex flex-wrap justify-between gap-1 text-xs text-muted-foreground"><span>{key.daily_token_limit ? `${fmt(key.tokens_used)} tokens consumidos · ${fmt(key.daily_token_limit)} tokens/dia` : `${fmt(key.tokens_used)} / ${fmt(key.token_limit)} tokens`}</span><span>{fmt(key.requests_count)} requisições</span></div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-muted" role="progressbar" aria-label={`Uso da chave de ${r.name}`} aria-valuenow={key.token_limit ? Math.min(100, Math.round(key.tokens_used / key.token_limit * 100)) : 0} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded bg-accent" style={{ width: `${key.token_limit ? Math.min(100, key.tokens_used / key.token_limit * 100) : 0}%` }} /></div>
            {key.status !== "revoked" && <KeyProviderPicker keyId={key.id} current={key.forced_provider ?? null} />}
            {ipsDe === key.id && <KeyIps keyId={key.id} />}
            {canUpgradeTokens(key) && <Button size="sm" variant="outline" className="mt-3" onClick={() => { setExtraTokens(''); setUpgrade({ key, name: r.name, requestId: crypto.randomUUID() }); }}>Adicionar tokens</Button>}
          </div>)}
        </article>; })}
      </section>
      {form && <Modal onClose={() => setForm(null)} title={form.id ? "Editar cliente" : "Novo cliente"}><form onSubmit={salvar} className="grid gap-3">
        <input required aria-label="Nome" placeholder="Nome" className={inputCls} value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input required type="email" aria-label="E-mail" placeholder="E-mail" className={inputCls} value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input aria-label="Empresa" placeholder="Empresa (opcional)" className={inputCls} value={form.company ?? ""} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        <select aria-label="Plano" className={inputCls} value={form.plan_id ?? ""} onChange={(e) => setForm({ ...form, plan_id: e.target.value })}><option value="">Sem plano</option>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <label className="text-xs text-muted-foreground">Limite de tokens<input type="text" inputMode="numeric" placeholder="Ex.: 15.000.000" className={inputCls} value={form.token_limit ?? ""} onChange={(e) => setForm({ ...form, token_limit: e.target.value })} /></label>
        <label className="text-xs text-muted-foreground">Expiração<input type="date" className={inputCls} value={form.expires_at ?? ""} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></label>
        <select aria-label="Status" className={inputCls} value={form.status ?? "active"} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Ativo</option><option value="blocked">Bloqueado</option></select>
        <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">Salvar</Button>
      </form></Modal>}
      {renovar && <RenovarModal row={renovar} onClose={() => setRenovar(null)} onSave={(days, addTokens) => run(async () => { await renew({ data: { clientId: renovar.id, days, addTokens } }); setRenovar(null); })} />}
      {ver && <AdminClientUsageDialog key={ver.id} clientId={ver.id} name={ver.name} onClose={() => setVer(null)} />}
      {upgrade && <Modal title={`Adicionar tokens · ${upgrade.name}`} onClose={() => setUpgrade(null)}><form className="grid gap-4" onSubmit={async e => { e.preventDefault(); setBusy(true); await run(async () => { await addTokens({ data: { keyId: upgrade.key.id, tokens: parseTokens(extraTokens), requestId: upgrade.requestId } }); setUpgrade(null); }); setBusy(false); }}><p className="text-sm text-muted-foreground">{upgrade.key.key_prefix}… · Limite atual: {fmt(upgrade.key.token_limit)} tokens. A chave, o consumo e a validade serão preservados.</p><label className="grid gap-2 text-sm">Tokens adicionais<input required inputMode="numeric" aria-label="Tokens adicionais" className={inputCls} placeholder="Ex.: 100.000.000" value={extraTokens} onChange={e => setExtraTokens(e.target.value)} /></label><Button type="submit" disabled={busy || parseTokens(extraTokens) <= 0} className="bg-accent text-accent-foreground hover:bg-accent/90">{busy ? 'Adicionando…' : 'Confirmar tokens adicionais'}</Button></form></Modal>}
    </div>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><Button size="icon" variant="ghost" onClick={onClose} aria-label="Fechar"><X /></Button></div>
        {children}
      </div>
    </div>
  );
}

function ClientPicker({ rows, value, onChange }: { rows: Row[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = rows.find((r) => r.id === value);
  const term = q.trim().toLocaleLowerCase();
  const list = term ? rows.filter((r) => `${r.name} ${r.email} ${r.company ?? ""}`.toLocaleLowerCase().includes(term)) : rows;
  const initials = (n: string) => n.trim().slice(0, 2).toUpperCase();
  return (
    <>
      <button type="button" onClick={() => { setQ(""); setOpen(true); }} className="flex w-full items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5 text-left text-sm transition-colors hover:border-accent focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" aria-haspopup="dialog">
        {selected ? <>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/15 text-xs font-bold text-accent">{initials(selected.name)}</span>
          <span className="min-w-0 flex-1"><span className="block truncate font-medium text-foreground">{selected.name}</span><span className="block truncate text-xs text-muted-foreground">{selected.email}</span></span>
        </> : <span className="flex-1 text-muted-foreground">Escolha o cliente…</span>}
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {open && <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4" onClick={() => setOpen(false)}>
        <div role="dialog" aria-modal="true" aria-label="Escolha o cliente" className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="border-b border-border p-4">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-bold text-foreground">Escolha o cliente</h2><Button size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Fechar"><X /></Button></div>
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input autoFocus aria-label="Buscar cliente" placeholder="Buscar por nome ou e-mail…" value={q} onChange={(e) => setQ(e.target.value)} className={`${inputCls} pl-9`} /></div>
            <p className="mt-2 text-xs text-muted-foreground">{list.length} {list.length === 1 ? "cliente" : "clientes"}</p>
          </div>
          <ul className="flex-1 overflow-y-auto p-2">
            {list.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</li>}
            {list.map((r) => { const active = r.id === value; const keys = r.api_keys.filter((k) => k.status === "active").length; return <li key={r.id}>
              <button type="button" onClick={() => { onChange(r.id); setOpen(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent/10 ${active ? "bg-accent/10 ring-1 ring-accent" : ""}`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/15 text-xs font-bold text-accent">{initials(r.name)}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-foreground">{r.name}</span><span className="block truncate text-xs text-muted-foreground">{r.email}</span></span>
                <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">{keys} {keys === 1 ? "chave" : "chaves"}</span>
              </button>
            </li>; })}
          </ul>
        </div>
      </div>}
    </>
  );
}

function RenovarModal({ row, onClose, onSave }: { row: Row; onClose: () => void; onSave: (d: number, t: number) => void }) {
  const [days, setDays] = useState("0"); const [tokens, setTokens] = useState("0");
  return (
    <Modal title={`Renovar ${row.name}`} onClose={onClose}>
      <div className="grid gap-3">
        <label className="text-xs text-muted-foreground">Adicionar dias</label>
        <input type="number" min={0} className={inputCls} value={days} onChange={(e) => setDays(e.target.value)} />
        <label className="text-xs text-muted-foreground">Adicionar tokens</label>
        <input type="text" inputMode="numeric" placeholder="Ex.: 5.000.000" className={inputCls} value={tokens} onChange={(e) => setTokens(e.target.value)} />
        <Button onClick={() => onSave(Number(days), parseTokens(tokens))} className="bg-accent text-accent-foreground hover:bg-accent/90">Renovar e reativar</Button>
      </div>
    </Modal>
  );
}

function KeyProviderPicker({ keyId, current }: { keyId: string; current: string | null }) {
  const save = useServerFn(adminSetKeyProvider);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const { data: providers = [] } = useQuery({ queryKey: ["admin-provider-names"], staleTime: 60000, queryFn: async () => {
    const { data, error } = await supabase.from("provider_accounts").select("name, active").order("priority");
    if (error) throw error;
    return (data ?? []) as { name: string; active: boolean }[];
  } });
  const options = current && !providers.some((p) => p.name === current) ? [...providers, { name: current, active: false }] : providers;
  return (
    <label className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      Fornecedor fixo
      <select aria-label="Fornecedor fixo da chave" disabled={busy} value={current ?? ""} className="h-8 rounded-md border border-input bg-background px-2 text-foreground"
        onChange={async (e) => {
          const provider = e.target.value || null;
          setBusy(true); setMsg(null);
          try { await save({ data: { keyId, provider } }); setMsg(provider ? "Chave fixada; ela usa todos os modelos desse fornecedor." : "Chave voltou ao automático."); await qc.invalidateQueries(); }
          catch (err) { setMsg(err instanceof Error ? err.message : "Não foi possível salvar."); }
          finally { setBusy(false); }
        }}>
        <option value="">Automático (prioridade dos fornecedores)</option>
        {options.map((p) => <option key={p.name} value={p.name}>{p.name}{p.active ? "" : " (inativo)"}</option>)}
      </select>
      {msg && <span>{msg}</span>}
    </label>
  );
}

function KeyIps({ keyId }: { keyId: string }) {
  const fetchIps = useServerFn(adminKeyIps);
  const { data, isLoading, error } = useQuery({
    queryKey: ["key-ips", keyId],
    queryFn: () => fetchIps({ data: { keyId } }),
  });
  const ips = data?.ips ?? [];
  const allowance = data?.ip_limit ?? 2;
  const suspeito = ips.length > allowance;
  return (
    <div className={`mt-2 rounded-md border p-3 text-xs ${suspeito ? "border-destructive bg-destructive/10" : "border-border bg-muted/40"}`}>
      {isLoading && <p className="text-muted-foreground">Carregando IPs…</p>}
      {error && <p className="text-destructive">Não foi possível carregar os IPs.</p>}
      {!isLoading && !error && <>
        <p className="font-semibold">
          {ips.length === 0 ? "Nenhum IP registrado nos últimos 7 dias" : `${ips.length} IP${ips.length > 1 ? "s" : ""} nos últimos 7 dias`}
          <span className="ml-2 text-muted-foreground">· limite autorizado: {allowance}</span>
          {suspeito && <span className="ml-2 text-destructive">— limite de IPs excedido</span>}
        </p>
        {ips.length > 0 && <div className="mt-2 grid gap-1">
          {ips.map((i) => (
            <div key={i.ip} className="flex flex-wrap justify-between gap-2 border-b border-border/60 py-1 last:border-0">
              <code className="font-mono">{i.ip}</code>
              <span className="text-muted-foreground">{fmt(i.requests)} requisições · último: {fmtDate(i.last_seen)}</span>
            </div>
          ))}
        </div>}
        {data && <KeyIpLimitEditor keyId={keyId} current={allowance} />}
      </>}
    </div>
  );
}

