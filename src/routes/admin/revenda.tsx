import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { KeyIpLimitEditor } from "@/components/KeyIpLimitEditor";
import { PageTitle, Panel } from "@/lib/admin-ui";
import { adminListResellerKeys, adminListResellers, adminMarkPayoutPaid, adminSetResellerStatus, adminUpsertReseller } from "@/lib/reseller.functions";
import { adminKeyIps, adminSetKeyStatus } from "@/lib/admin.functions";
import { ResellerSettlement } from '@/components/ResellerSettlement';
import { ResellerApiIps } from '@/components/ResellerApiIps';

export const Route = createFileRoute("/admin/revenda")({
  head: () => ({ meta: [
    { title: "Revenda — NEXA CLOUD" },
    { name: "description", content: "Libere revendedores e acompanhe repasses." },
    { property: "og:title", content: "Revenda — NEXA CLOUD" },
    { property: "og:description", content: "Libere revendedores e acompanhe repasses." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: AdminRevenda,
});

const money = (c: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);
const toCents = (v: string) => Math.round(Number(v.replace(",", ".")) * 100);
const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";
const LABEL: Record<string, string> = { active: "Ativa", blocked: "Bloqueada (repasse)", disabled: "Desativada" };

function AdminRevenda() {
  const qc = useQueryClient();
  const list = useServerFn(adminListResellers), upsert = useServerFn(adminUpsertReseller), setStatus = useServerFn(adminSetResellerStatus), paid = useServerFn(adminMarkPayoutPaid);
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-resellers"], queryFn: () => list(), refetchInterval: 30000 });
  const [email, setEmail] = useState(""); const [cost, setCost] = useState("29,90"); const [limit, setLimit] = useState("200,00");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<unknown>) { setBusy(true); setErr(""); try { await fn(); await qc.invalidateQueries({ queryKey: ["admin-resellers"] }); } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); } finally { setBusy(false); } }

  return <div>
    <PageTitle title="Revenda" />
    <Suspense fallback={<p className="mb-6 text-sm text-muted-foreground">Carregando repasses…</p>}><ResellerSettlement /></Suspense>
    <Panel className="mb-6">
      <h2 className="mb-1 font-semibold">Liberar ou editar revendedor</h2>
      <p className="mb-4 text-sm text-muted-foreground">O cliente precisa ter conta no site. Cada chave que ele gerar soma o custo ao repasse; ao atingir o limite, chaves e painel são bloqueados.</p>
      <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
        <input className={inputCls} placeholder="E-mail da conta" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="text-xs text-muted-foreground">Custo por chave (R$)<input className={inputCls} value={cost} onChange={(e) => setCost(e.target.value)} /></label>
        <label className="text-xs text-muted-foreground">Limite do repasse (R$)<input className={inputCls} value={limit} onChange={(e) => setLimit(e.target.value)} /></label>
        <Button className="self-end" disabled={busy || !email} onClick={() => run(() => upsert({ data: { email, cost_cents: toCents(cost), debt_limit_cents: toCents(limit) } }))}>Salvar</Button>
      </div>
      {err && <p className="mt-3 text-sm text-destructive" role="alert">{err}</p>}
    </Panel>
    <Panel>
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : data.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum revendedor ainda.</p> :
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Revendedor</th><th>Status</th><th>Custo/chave</th><th>Gerado</th><th>Pago</th><th>Pendente / limite</th><th /></tr></thead>
          <tbody>{data.map((r: any) => <tr key={r.id} className="border-t border-border">
            <td className="py-3"><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.email}</div></td>
            <td><span className={r.status === "active" ? "text-accent" : "text-destructive"}>{LABEL[r.status] ?? r.status}</span></td>
            <td>{money(r.cost_cents)}</td><td>{money(r.balance.generated)}</td><td>{money(r.balance.paid)}</td>
            <td>{money(r.balance.pending)} / {money(r.debt_limit_cents)}</td>
            <td className="flex flex-wrap justify-end gap-2 py-3">
              <Button size="sm" variant="outline" onClick={() => { setEmail(r.email); setCost((r.cost_cents / 100).toFixed(2).replace(".", ",")); setLimit((r.debt_limit_cents / 100).toFixed(2).replace(".", ",")); }}>Editar</Button>
              {r.balance.pending > 0 && <Button size="sm" variant="outline" disabled={busy} onClick={() => { if (confirm(`Marcar ${money(r.balance.pending)} como pago?`)) void run(() => paid({ data: { id: r.id } })); }}>Marcar pago</Button>}
              <Button size="sm" variant={r.status === "disabled" ? "default" : "destructive"} disabled={busy} onClick={() => run(() => setStatus({ data: { id: r.id, enabled: r.status === "disabled" } }))}>{r.status === "disabled" ? "Ativar" : "Desativar"}</Button>
            </td></tr>)}</tbody></table></div>}
    </Panel>
    <Panel className="mt-6">
      <h2 className="mb-4 font-semibold">Proteção da API de geração</h2>
      {data.map((r: any) => <ResellerApiIps key={r.id} reseller={r} />)}
    </Panel>
    <ResellerKeys resellers={data} />
  </div>;
}

const KEY_LABEL: Record<string, string> = { active: "Ativa", blocked: "Bloqueada", revoked: "Revogada", exhausted: "Esgotada", expired: "Expirada" };

function ResellerKeys({ resellers }: { resellers: any[] }) {
  const qc = useQueryClient();
  const listKeys = useServerFn(adminListResellerKeys), setKey = useServerFn(adminSetKeyStatus);
  const { data: keys = [], isLoading } = useQuery({ queryKey: ["admin-reseller-keys"], queryFn: () => listKeys(), refetchInterval: 30000 });
  const [busy, setBusy] = useState<string | null>(null);
  const [ipsDe, setIpsDe] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const names = new Map(resellers.map((r: any) => [r.id, r]));
  const groups = new Map<string, any[]>();
  for (const k of keys) {
    const owner = names.get(k.reseller_id);
    if (filter && !`${k.api_key} ${k.plano} ${owner?.name ?? ""} ${owner?.email ?? ""}`.toLowerCase().includes(filter.toLowerCase())) continue;
    groups.set(k.reseller_id, [...(groups.get(k.reseller_id) ?? []), k]);
  }
  async function toggle(k: any) {
    setBusy(k.id);
    try { await setKey({ data: { id: k.id, status: k.status === "active" ? "blocked" : "active" } }); await qc.invalidateQueries({ queryKey: ["admin-reseller-keys"] }); }
    catch (e) { alert(e instanceof Error ? e.message : "Erro"); } finally { setBusy(null); }
  }
  return <Panel className="mt-6">
    <h2 className="mb-1 font-semibold">Chaves geradas pelos revendedores</h2>
    <label className="mb-4 block text-sm">Buscar chave ou revendedor<input className={inputCls} value={filter} onChange={(e) => setFilter(e.target.value)} /></label>
    {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : keys.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma chave gerada por revendedores ainda.</p> :
      <div className="space-y-6">{[...groups.entries()].map(([rid, list]) => <div key={rid}>
        <p className="mb-2 text-sm font-semibold">{names.get(rid)?.name ?? "Revendedor"} <span className="font-normal text-muted-foreground">· {names.get(rid)?.email} · {list.length} chave(s)</span></p>
        <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Chave</th><th>Plano</th><th>Status</th><th>Tokens</th><th>Criada</th><th>Validade</th><th>IPs · 7 dias</th></tr></thead>
          <tbody>{list.map((k) => <tr key={k.id} className="border-t border-border">
            <td className="py-2 font-mono text-xs"><span className="break-all">{k.api_key.slice(0, 10)}…{k.api_key.slice(-6)}</span>{ipsDe === k.id && <ResellerKeyIps keyId={k.id} />}</td>
            <td>{k.plano}</td>
            <td><span className={k.status === "active" ? "text-accent" : "text-destructive"}>{KEY_LABEL[k.status] ?? k.status}</span></td>
            <td>{Number(k.tokens_used).toLocaleString("pt-BR")}{k.token_limit ? ` / ${Number(k.token_limit).toLocaleString("pt-BR")}` : ""}</td>
            <td>{new Date(k.created_at).toLocaleDateString("pt-BR")}</td>
            <td>{k.expires_at ? new Date(k.expires_at).toLocaleDateString("pt-BR") : "—"}</td>
            <td className="py-2 text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" aria-expanded={ipsDe === k.id} onClick={() => setIpsDe(ipsDe === k.id ? null : k.id)}>Ver IPs</Button>{(k.status === "active" || k.status === "blocked") && <Button size="sm" variant={k.status === "active" ? "destructive" : "default"} disabled={busy === k.id} onClick={() => toggle(k)}>{k.status === "active" ? "Desativar" : "Ativar"}</Button>}</div></td>
          </tr>)}</tbody></table></div>
      </div>)}</div>}
  </Panel>;
}

function ResellerKeyIps({ keyId }: { keyId: string }) {
  const fetchIps = useServerFn(adminKeyIps);
  const { data, isLoading, error } = useQuery({ queryKey: ["key-ips", keyId], queryFn: () => fetchIps({ data: { keyId } }), refetchInterval: 30000 });
  const ips = data?.ips ?? [];
  const allowance = data?.ip_limit ?? 2;
  const suspeito = ips.length > allowance;
  return <div className={`mt-2 rounded-md border p-3 font-sans text-xs ${suspeito ? "border-destructive bg-destructive/10" : "border-border bg-muted/40"}`}>
    {isLoading ? <p className="text-muted-foreground">Carregando IPs…</p> : error ? <p className="text-destructive">Não foi possível carregar os IPs.</p> : <>
      <p className="font-semibold">{ips.length === 0 ? "Nenhum IP registrado nos últimos 7 dias" : `${ips.length} IP${ips.length > 1 ? "s" : ""} nos últimos 7 dias`}
        <span className="ml-2 text-muted-foreground">· limite autorizado: {allowance}</span>
        {suspeito && <span className="ml-2 text-destructive">— limite de IPs excedido</span>}</p>
      {ips.map((i) => <div key={i.ip} className="mt-1 flex flex-wrap justify-between gap-2 border-b border-border/60 py-1 last:border-0">
        <code className="font-mono">{i.ip}</code>
        <span className="text-muted-foreground">{i.requests.toLocaleString("pt-BR")} requisições · último: {new Date(i.last_seen).toLocaleString("pt-BR")}</span>
      </div>)}
      {data && <KeyIpLimitEditor keyId={keyId} current={allowance} />}
    </>}
  </div>;
}
