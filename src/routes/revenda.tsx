import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, BarChart3, Check, Code2, Copy, Eye, EyeOff, Globe, KeyRound, Landmark, Pencil, Plus, Power, QrCode, RefreshCw, Store, Trash2 } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { useClientIdentity } from "@/components/client-auth-context";
import { ClientLogin, ClientHeader } from "@/components/ClientLogin";
import { ResellerPlans } from "@/components/ResellerPlans";
import { getResellerPanel, resellerCheckCustomDomain, resellerCheckPix, resellerDeleteKey, resellerGenerateKey, resellerGenerateTrialKey, resellerGenerateHourTrialKey, resellerPayPix, resellerRenameKey, resellerRotateApiKey, resellerSetCustomDomain, resellerSetKeyStatus, resellerSaveDeliveryMessage } from "@/lib/reseller.functions";
import { DEFAULT_DELIVERY_TEMPLATE } from "@/lib/reseller-delivery-message";
import { nextInstallmentCents, readSettlement } from "@/lib/reseller-settlement";
import { ESTIMATED_SALE_CENTS, payToGenerateCents, resellerEstimates } from "@/lib/reseller-rules";
import { familyPriceCents } from "@/lib/model-family";

export const Route = createFileRoute("/revenda")({
  head: () => ({ meta: [
    { title: "Painel de revenda — NEXA CLOUD" },
    { name: "description", content: "Gere chaves NEXA, acompanhe vendas e pague seus repasses." },
    { property: "og:title", content: "Painel de revenda — NEXA CLOUD" },
    { property: "og:description", content: "Gere chaves NEXA, acompanhe vendas e pague seus repasses." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Revenda,
});

const money = (c: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);
const when = (s: string | null) => (s ? new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Sem prazo");

function Revenda() {
  const { user, ready } = useClientIdentity();
  if (!ready) return <div className="client-page client-loading">Carregando…</div>;
  return user ? <Painel /> : <ClientLogin />;
}

function Painel() {
  const qc = useQueryClient();
  const load = useServerFn(getResellerPanel);
  const { data, isPending, error } = useQuery({ queryKey: ["reseller"], queryFn: () => load(), refetchInterval: 10000 });
  const [tab, setTab] = useState("geral");
  const gen = useServerFn(resellerGenerateKey), genTrial = useServerFn(resellerGenerateTrialKey), genHour = useServerFn(resellerGenerateHourTrialKey), rotate = useServerFn(resellerRotateApiKey), pay = useServerFn(resellerPayPix), check = useServerFn(resellerCheckPix), rename = useServerFn(resellerRenameKey), setKeyStatus = useServerFn(resellerSetKeyStatus), delKey = useServerFn(resellerDeleteKey);
  const [plan, setPlan] = useState(""); const [label, setLabel] = useState(""); const [family, setFamily] = useState<"claude" | "openai" | "combo">("claude");
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const [deliveryMessage, setDeliveryMessage] = useState<string | null>(null);
  const [show, setShow] = useState(false); const [copied, setCopied] = useState("");
  const [pix, setPix] = useState<null | { id: string; qrCode: string; qrBase64: string; amount: number }>(null);
  const [pixStatus, setPixStatus] = useState("");
  const [pendingGen, setPendingGen] = useState<null | { plan: string; label?: string | undefined; family: "claude" | "openai" | "combo" }>(null);
  const [topup, setTopup] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["reseller"] });
  async function copy(v: string, id: string) { try { await navigator.clipboard.writeText(v); setCopied(id); setTimeout(() => setCopied(""), 2000); } catch { setMsg("Não foi possível copiar."); } }
  async function run(fn: () => Promise<unknown>) { setBusy(true); setMsg(""); try { await fn(); await refresh(); } catch (e) { setMsg(e instanceof Error ? e.message : "Erro"); } finally { setBusy(false); } }

  useEffect(() => {
    if (!pix || pixStatus === "approved") return;
    const t = setInterval(async () => { const r = await check({ data: { id: pix.id } }); setPixStatus(r.status); if (r.status === "approved") { await refresh(); if (pendingGen) { const g = pendingGen; setPendingGen(null); void run(async () => { const created = await gen({ data: g }); setDeliveryMessage(created.mensagem ?? null); setLabel(""); setPix(null); }); } } }, 5000);
    return () => clearInterval(t);
  }, [pix, pixStatus]);

  const header = <ClientHeader><Button asChild variant="outline"><Link to="/minha-chave"><ArrowLeft />Meu painel</Link></Button></ClientHeader>;
  if (isPending) return <div className="client-page">{header}<main className="client-dashboard"><div className="client-empty">Carregando painel de revenda…</div></main></div>;
  if (error) return <div className="client-page">{header}<main className="client-dashboard"><div className="client-empty" role="alert">Não foi possível carregar o painel.</div></main></div>;
  if (!data?.reseller) return <div className="client-page">{header}<main className="client-dashboard"><div className="client-empty">Sua conta ainda não é de revenda. Fale com o suporte para liberar.</div></main></div>;

  const { reseller: r, keys, payouts, plans, balance, customPlans, deliveryTemplate, apiUrls, trialsLeft, hourTrial } = data;
  const blocked = r.status !== "active";
  const settlement = readSettlement(r);
  const installmentCents = settlement ? nextInstallmentCents(settlement, balance.pending) : 0;
  const pct = Math.min(100, (balance.pending / r.debt_limit_cents) * 100);
  const activeKeys = keys.filter((k) => k.status === "active" && (!k.expires_at || new Date(k.expires_at) > new Date())).length;
  const tabs = [{ id: "geral", label: "Geral", icon: BarChart3 }, { id: "chaves", label: "Chaves", icon: KeyRound }, { id: "planos", label: "Planos", icon: Store }, { id: "repasses", label: "Repasses", icon: Landmark }, { id: "api", label: "API", icon: Code2 }];
  const visibleTab = blocked ? "repasses" : tab;
  const keyCost = familyPriceCents(family, r.cost_cents);
  const payNow = payToGenerateCents(balance, keyCost);
  const startPix = (topupCents?: number) => run(async () => { const p = await pay({ data: topupCents ? { topup_cents: topupCents } : {} }); setPix(p); setPixStatus("pending"); });
  const pixBox = pix && <section className="client-section reseller-pix">{pixStatus === "approved" ? <p><Check /> Pagamento aprovado!{pendingGen ? " Gerando sua chave…" : " Saldo atualizado."}</p> : <><img src={`data:image/png;base64,${pix.qrBase64}`} alt="QR Code PIX" /><div><h2>{money(Math.round(pix.amount * 100))}</h2><p>Escaneie o QR Code ou copie o código. {pendingGen ? "A chave é gerada automaticamente assim que o pagamento for aprovado." : "O saldo entra automaticamente."}</p><Button variant="outline" onClick={() => copy(pix.qrCode, "pix")}><Copy />{copied === "pix" ? "Copiado" : "Copiar código PIX"}</Button></div></>}</section>;

  return <div className="client-page">{header}
    <main className="client-dashboard reseller">
      <div className="reseller-title"><span><Store /></span><div><h1>PAINEL DE <em>REVENDA</em></h1><p>NEXA CLOUD · {r.name}</p></div></div>
      {balance.pending > 0 && <div className={`reseller-alert ${blocked ? "is-blocked" : ""}`} role="status"><AlertTriangle /><div><strong>{blocked ? "REVENDA BLOQUEADA" : "REPASSE PENDENTE"}</strong><p>Você deve <b>{money(balance.pending)}</b> de um limite de <b>{money(r.debt_limit_cents)}</b>. {blocked ? "Suas chaves e o painel ficam bloqueados até o pagamento." : "Ao atingir o limite, suas chaves e o painel são bloqueados."}</p></div></div>}
      {r.status === "active" && balance.pending === 0 && payouts.some((p) => p.status === "approved" && p.approved_at && Date.now() - new Date(p.approved_at).getTime() < 7 * 86400000) && <div className="reseller-alert is-ok" role="status"><CheckCircle2 /><div><strong>REVENDA DISPONÍVEL NOVAMENTE</strong><p>Repasse recebido. Suas chaves e as dos seus clientes foram liberadas automaticamente.</p></div></div>}
      {r.status === "disabled" && <div className="reseller-alert is-blocked"><AlertTriangle /><div><strong>REVENDA DESATIVADA</strong><p>Fale com o suporte.</p></div></div>}
      {settlement && balance.pending > 0 && <div className="reseller-alert" role="status"><Landmark /><div><strong>PROPOSTA DE REGULARIZAÇÃO</strong><p>Regularize as 18 chaves irregulares pagando <b>R$ 30 por chave</b>: <b>{money(settlement.totalCents)}</b> em uma vez{settlement.installments > 1 ? <> ou em até <b>{settlement.installments}x de {money(Math.ceil(settlement.totalCents / settlement.installments))}</b></> : null}. Após a quitação, seu painel é liberado automaticamente.</p></div></div>}
      <nav className="reseller-tabs">{tabs.map((t) => <button key={t.id} disabled={blocked && t.id !== "repasses"} className={visibleTab === t.id ? "is-active" : ""} onClick={() => setTab(t.id)}><t.icon size={15} />{t.label}</button>)}</nav>
      {msg && <p className="client-error" role="alert">{msg}</p>}

      {visibleTab === "geral" && <Geral keys={keys} cost={r.cost_cents} pending={balance.pending} limit={r.debt_limit_cents} />}

      {visibleTab === "planos" && <ResellerPlans plans={customPlans} busy={busy} run={run} cost={money(r.cost_cents)} />}

      {visibleTab === "chaves" && <>
        <div className="reseller-actions">
          <input className="reseller-input" placeholder="Nome do cliente (opcional)" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} />
          <select className="reseller-input" value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Plano"><option value="">Selecione o plano</option>{plans.map((p) => <option key={p.code ?? p.name} value={p.code ?? ""}>{p.name}</option>)}</select>
          <select className="reseller-input" value={family} onChange={(e) => setFamily(e.target.value as typeof family)} aria-label="Modelos da chave"><option value="claude">Claude</option><option value="openai">GPT</option><option value="combo">Combo Claude + GPT</option></select>
          {payNow > 0
            ? <Button className="client-primary" disabled={!plan || busy} onClick={() => { setDeliveryMessage(null); setPendingGen({ plan, label: label || undefined, family }); void startPix(Math.max(100, keyCost - balance.credit)); }}><QrCode />Pagar {money(payNow)} via PIX e gerar</Button>
            : <Button className="client-primary" disabled={!plan || busy} onClick={() => run(async () => { setDeliveryMessage(null); const created = await gen({ data: { plan, label: label || undefined, family } }); setDeliveryMessage(created.mensagem ?? null); setLabel(""); })}><Plus />Gerar nova chave ({money(keyCost)})</Button>}
          <Button variant="outline" disabled={busy || trialsLeft <= 0} onClick={() => run(async () => { setDeliveryMessage(null); const created = await genTrial({ data: { label: label || undefined, family } }); setDeliveryMessage(created.mensagem ?? null); setLabel(""); })}>Gerar teste grátis (5M) · {trialsLeft} de 20 restantes</Button>
          {hourTrial && <Button variant="outline" disabled={busy} onClick={() => run(async () => { setDeliveryMessage(null); const created = await genHour({ data: { label: label || undefined, family } }); setDeliveryMessage(created.mensagem ?? null); setLabel(""); })}>Gerar teste grátis de 30 minutos · tokens ilimitados</Button>}
        </div>
        <p className="client-plan-note">Cada chave é paga na hora: custa {money(keyCost)} e sai do seu saldo pré-pago ({money(balance.credit)} disponível).{balance.pending > 0 ? ` Inclui ${money(balance.pending)} de repasse antigo em aberto.` : ""}</p>
        {pixBox}
        {deliveryTemplate !== null && <DeliveryTemplateEditor initial={deliveryTemplate} busy={busy} run={run} />}
        {deliveryMessage && <section className="client-section"><div className="client-section-heading"><h2>Mensagem para o cliente</h2><Button variant="outline" onClick={() => copy(deliveryMessage, "delivery")}><Copy />{copied === "delivery" ? "Copiado" : "Copiar mensagem"}</Button></div><textarea className="reseller-input w-full resize-y" aria-label="Mensagem para o cliente" readOnly rows={26} value={deliveryMessage} /></section>}
        <section className="client-section client-card"><div className="client-section-heading"><h2>Chaves geradas</h2></div>
          {keys.length ? <div className="reseller-table"><table><thead><tr><th>Chave</th><th>Cliente</th><th>Plano</th><th>Comandos</th><th>Tokens usados</th><th>Custo</th><th>Criada em</th><th>Validade</th><th>Status</th><th /></tr></thead><tbody>{keys.map((k) => <tr key={k.id}><td><code>{k.api_key.slice(0, 10)}…{k.api_key.slice(-4)}</code></td><td><span className="reseller-key-label">{k.label ?? <em>Sem nome</em>}</span><Button size="icon" variant="ghost" aria-label="Editar nome do cliente" disabled={busy} onClick={() => { const v = prompt("Nome do cliente dessa chave:", k.label ?? ""); if (v !== null) void run(() => rename({ data: { id: k.id, label: v } })); }}><Pencil /></Button></td><td>{k.plano}</td><td>{k.requests_count}</td><td>{Number(k.tokens_used).toLocaleString("pt-BR")}{k.token_limit ? ` / ${Number(k.token_limit).toLocaleString("pt-BR")}` : ""}</td><td>{money(k.reseller_cost_cents)}</td><td>{when(k.created_at)}</td><td>{when(k.expires_at)}</td><td><span className="client-badge">{k.expires_at && new Date(k.expires_at) < new Date() ? "Expirada" : k.status === "active" ? "Ativa" : "Bloqueada"}</span></td><td><div className="flex justify-end gap-1"><Button size="icon" variant="outline" aria-label="Copiar chave" onClick={() => copy(k.api_key, k.id)}>{copied === k.id ? <Check /> : <Copy />}</Button>{!k.reseller_blocked && (k.status === "active" || k.status === "blocked") && <Button size="icon" variant="outline" aria-label={k.status === "active" ? "Desativar chave" : "Reativar chave"} disabled={busy} onClick={() => run(() => setKeyStatus({ data: { id: k.id, active: k.status !== "active" } }))}><Power /></Button>}<Button size="icon" variant="outline" aria-label="Excluir chave" disabled={busy} onClick={() => { if (confirm("Excluir essa chave? Ela para de funcionar na hora. Se nunca foi usada, o valor volta para o seu saldo.")) void run(() => delKey({ data: { id: k.id } })); }}><Trash2 /></Button></div></td></tr>)}</tbody></table></div> : <div className="client-empty">Nenhuma chave gerada ainda.</div>}
        </section>
      </>}

      {visibleTab === "repasses" && <>
        <section className="reseller-debt">
          <div><span>$ SALDO DEVEDOR À NEXA</span><strong>{money(balance.pending)}</strong><p>Valor das chaves geradas que ainda não foram pagas.</p>
            <div className="reseller-limit"><small>Limite da sua revenda</small><small>{money(r.debt_limit_cents)}</small></div><progress max={100} value={pct} /><small>{balance.pending >= r.debt_limit_cents ? "Limite atingido — revenda bloqueada." : `Faltam ${money(r.debt_limit_cents - balance.pending)} para bloquear.`}</small></div>
          {settlement && balance.pending > 0 ? <div className="flex flex-wrap gap-2">
            <Button className="client-primary" disabled={busy} onClick={() => run(async () => { const p = await pay({ data: { full: true } }); setPix(p); setPixStatus("pending"); })}><QrCode />Pagar {money(balance.pending)} em uma vez</Button>
            {settlement.installments > 1 && balance.pending > installmentCents && <Button variant="outline" disabled={busy} onClick={() => run(async () => { const p = await pay({ data: {} }); setPix(p); setPixStatus("pending"); })}><QrCode />Pagar parcela de {money(installmentCents)}</Button>}
          </div> : <Button className="client-primary" disabled={busy || balance.pending <= 0} onClick={() => run(async () => { const p = await pay({ data: {} }); setPix(p); setPixStatus("pending"); })}><QrCode />Pagar agora via PIX</Button>}
        </section>
        <section className="client-section client-card"><div className="client-section-heading"><div><h2>Saldo pré-pago</h2><p>Cada chave nova desconta do saldo na hora, pelo painel ou pela API.</p></div><span>{money(balance.credit)} DISPONÍVEL</span></div>
          <div className="reseller-actions"><input className="reseller-input" inputMode="decimal" placeholder="Valor da recarga (R$)" value={topup} onChange={(e) => setTopup(e.target.value)} aria-label="Valor da recarga" />
            <Button className="client-primary" disabled={busy || !(Number(topup.replace(",", ".")) >= 1)} onClick={() => { setPendingGen(null); void startPix(Math.round(Number(topup.replace(",", ".")) * 100)); }}><QrCode />Recarregar via PIX</Button></div>
          {balance.pending > 0 && <p className="client-plan-note">A recarga inclui o repasse antigo em aberto ({money(balance.pending)}).</p>}</section>
        {pixBox}
        <div className="client-metrics reseller-three">{[["TOTAL GERADO", balance.generated], ["JÁ PAGO", balance.paid], ["PENDENTE", balance.pending]].map(([a, b]) => <article key={a as string}><div><span>{a}</span></div><strong>{money(b as number)}</strong></article>)}</div>
        <section className="client-section client-card"><div className="client-section-heading"><h2>Histórico de repasses</h2></div>
          {payouts.filter((p) => p.status === "approved").length ? <div className="client-model-usage">{payouts.filter((p) => p.status === "approved").map((p) => <div key={p.id}><strong>{money(p.amount_cents)}</strong><span>Pago</span><span>{when(p.approved_at)}</span></div>)}</div> : <div className="client-empty">Nenhum repasse registrado ainda.</div>}
        </section>
      </>}

      {visibleTab === "api" && <>
        <section className="client-section client-card"><div className="client-section-heading"><div><h2>Credenciais de API</h2><p>Gere chaves NEXA automaticamente pelo seu site ou sistema.</p></div></div>
          {r.api_key ? <div className="client-copy-row"><code>{show ? r.api_key : `${r.api_key.slice(0, 7)}${"•".repeat(14)}${r.api_key.slice(-4)}`}</code><div><Button size="icon" variant="ghost" aria-label="Mostrar ou ocultar" onClick={() => setShow(!show)}>{show ? <EyeOff /> : <Eye />}</Button><Button size="icon" variant="outline" aria-label="Copiar" onClick={() => { if (r.api_key) void copy(r.api_key, "api"); }}>{copied === "api" ? <Check /> : <Copy />}</Button></div></div> : <div className="client-empty">Você ainda não tem uma API key de revenda.</div>}
          <div className="mt-4 mb-6"><Button variant="outline" disabled={busy} onClick={() => { if (!r.api_key || confirm("Gerar uma nova API key? A antiga para de funcionar.")) void run(() => rotate()); }}>{r.api_key ? "Gerar nova API key" : "Criar API key"}</Button></div>
          <pre className="client-code">{`POST ${apiUrls.keys}\nAuthorization: Bearer <sua_api_key>\nContent-Type: application/json\n\n{ "plano": "${plans[0]?.code ?? "cc_7d"}", "cliente": "Nome do cliente" }\n\nResposta: { "chave": "sk-nx-...", "plano": "...", "validade": "...", "limite_tokens": ... }`}</pre>
          <p className="client-plan-note">Planos: {plans.map((p) => p.code).join(", ")}. Cada chave gerada desconta {money(r.cost_cents)} do saldo pré-pago; sem saldo, a API responde 402 e você recarrega na aba Repasses.</p>
        </section>
        <section className="client-section client-card"><div className="client-section-heading"><div><h2><Globe size={16} style={{ verticalAlign: "-2px" }} /> Base URL para seus clientes</h2><p>Endereço exclusivo de revenda, sem o nome NEXA. Passe para seus clientes junto com a chave.</p></div></div>
          <div className="client-copy-row"><div><small>Base URL (Claude Code / Anthropic)</small><code>{apiUrls.base}</code></div><Button size="icon" variant="outline" aria-label="Copiar base URL" onClick={() => copy(apiUrls.base, "rbase")}>{copied === "rbase" ? <Check /> : <Copy />}</Button></div>
          <div className="client-copy-row"><div><small>Base URL (compatível OpenAI)</small><code>{apiUrls.openai}</code></div><Button size="icon" variant="outline" aria-label="Copiar base URL OpenAI" onClick={() => copy(apiUrls.openai, "rbase1")}>{copied === "rbase1" ? <Check /> : <Copy />}</Button></div>
        </section>
      </>}
      <footer className="client-footer"><span className="client-footer-copy">© 2026 NEXA CLOUD. Todos os direitos reservados.</span><nav className="client-footer-nav"><Link to="/termos">Termos de uso</Link><Link to="/reembolso">Reembolso</Link></nav><small className="client-footer-credit">Desenvolvido pela Nexa Pro</small></footer>
    </main></div>;
}

type K = { id: string; status: string; created_at: string; expires_at: string | null; reseller_cost_cents: number; price_cents: number; requests_count: number; tokens_used: number; token_limit: number | null; plano: string };
const COLORS = ["var(--orange)", "var(--muted-foreground)", "var(--destructive)"];
function Geral({ keys, cost, pending, limit }: { keys: K[]; cost: number; pending: number; limit: number }) {
  const now = Date.now();
  const expired = keys.filter((k) => k.expires_at && new Date(k.expires_at).getTime() < now);
  const blocked = keys.filter((k) => k.status !== "active" && !expired.includes(k));
  const active = keys.length - expired.length - blocked.length;
  const { revenue, costs, profit } = resellerEstimates(keys);
  const day = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const days = Array.from({ length: 30 }, (_, i) => { const d = day(new Date(now - (29 - i) * 86400000)); const ks = keys.filter((k) => day(new Date(k.created_at)) === d); return { d, chaves: ks.length, faturamento: ks.length * ESTIMATED_SALE_CENTS / 100 }; });
  const byPlan = Object.values(keys.reduce<Record<string, { plano: string; chaves: number }>>((acc, k) => { const p = k.plano.split(" · ")[0] ?? k.plano; (acc[p] ??= { plano: p, chaves: 0 }).chaves++; return acc; }, {}));
  const pie = [{ name: "Ativas", value: active }, { name: "Expiradas", value: expired.length }, { name: "Bloqueadas", value: blocked.length }].filter((x) => x.value > 0);
  const tick = { fill: "var(--muted-foreground)", fontSize: 12 };
  const label = (v: string) => `${v.slice(8, 10)}/${v.slice(5, 7)}`;
  return <>
    <div className="client-metrics">
      {[["FATURAMENTO ESTIMADO", money(revenue), "Considerando R$ 59,90 por chave"], ["LUCRO ESTIMADO", money(profit), `Faturamento menos repasse de ${money(costs / Math.max(1, keys.length))} por chave`], ["CHAVES ATIVAS", String(active), `${keys.length} geradas no total`], ["CHAVES EXPIRADAS", String(expired.length), "Prazo vencido"]].map(([a, b, c]) => <article key={a}><div><span>{a}</span></div><strong>{b}</strong><small>{c}</small></article>)}
    </div>
    <section className="client-section client-card"><div className="client-section-heading"><div><h2>Faturamento por dia</h2><p>Estimativa · últimos 30 dias</p></div><span>{money(days.reduce((s, d) => s + d.faturamento * 100, 0))} NO PERÍODO</span></div>
      <div className="client-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={days} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="d" tickFormatter={label} minTickGap={40} tick={tick} axisLine={false} tickLine={false} /><YAxis tick={tick} axisLine={false} tickLine={false} /><Tooltip labelFormatter={(v) => String(v).split("-").reverse().join("/")} formatter={(v: number) => money(v * 100)} /><Area type="monotone" dataKey="faturamento" name="Faturamento" stroke="var(--orange)" fill="var(--orange)" fillOpacity={0.1} strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div></section>
    <div className="reseller-grid">
      <section className="client-section client-card"><div className="client-section-heading"><div><h2>Situação das chaves</h2><p>Ativas, expiradas e bloqueadas</p></div></div>
        {pie.length ? <div className="reseller-pie"><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} isAnimationActive={false}>{pie.map((p) => <Cell key={p.name} fill={COLORS[["Ativas", "Expiradas", "Bloqueadas"].indexOf(p.name)]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><ul>{pie.map((p) => <li key={p.name}><i style={{ background: COLORS[["Ativas", "Expiradas", "Bloqueadas"].indexOf(p.name)] }} />{p.name}<b>{p.value}</b></li>)}</ul></div> : <div className="client-empty">Nenhuma chave ainda.</div>}</section>
      <section className="client-section client-card"><div className="client-section-heading"><div><h2>Chaves por plano</h2><p>Quais planos você mais vende</p></div></div>
        {byPlan.length ? <div className="client-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={byPlan} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="plano" tick={tick} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={tick} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="chaves" name="Chaves" fill="var(--orange)" radius={[6, 6, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div> : <div className="client-empty">Nenhuma chave ainda.</div>}</section>
    </div>
    <section className="client-section client-card"><div className="client-section-heading"><div><h2>Chaves expiradas</h2><p>Bom momento para oferecer renovação</p></div></div>
      {expired.length ? <div className="client-model-usage">{expired.slice(0, 10).map((k) => <div key={k.id}><strong>{k.plano}</strong><span>{k.requests_count} comandos · {Number(k.tokens_used).toLocaleString("pt-BR")} tokens</span><span>Expirou {when(k.expires_at)}</span></div>)}</div> : <div className="client-empty">Nenhuma chave expirada.</div>}</section>
    <section className="client-section client-card"><div className="client-section-heading"><div><h2>Uso do limite de repasse</h2><p>Ao chegar a {money(limit)}, tudo é bloqueado até o pagamento</p></div><span>{money(pending)} / {money(limit)}</span></div><progress className="reseller-progress" max={limit} value={Math.min(pending, limit)} /><small>Cada chave custa {money(cost)}.</small></section>
  </>;
}

type R = { custom_domain: string | null; custom_domain_status: string };
function DominioProprio({ reseller: r, busy, run, copy, copied }: { reseller: R; busy: boolean; run: (fn: () => Promise<unknown>) => Promise<void>; copy: (v: string, id: string) => Promise<void>; copied: string }) {
  const saveDomain = useServerFn(resellerSetCustomDomain), checkDomain = useServerFn(resellerCheckCustomDomain);
  const [domain, setDomain] = useState(r.custom_domain ?? ""); const [info, setInfo] = useState("");
  const active = r.custom_domain && r.custom_domain_status === "active";
  return <section className="client-section"><div className="client-section-heading"><div><h2><Globe size={16} style={{ verticalAlign: "-2px" }} /> Domínio próprio</h2><p>Use a API com o endereço da sua marca, sem aparecer o nome NEXA para seus clientes.</p></div>{r.custom_domain && <span className={`client-badge ${active ? "" : "is-pending"}`}>{active ? "Ativo" : "Aguardando DNS"}</span>}</div>
    <div className="reseller-actions">
      <input className="reseller-input" placeholder="api.sualoja.com" value={domain} onChange={(e) => setDomain(e.target.value)} maxLength={253} aria-label="Domínio próprio" />
      <Button className="client-primary" disabled={busy} onClick={() => run(async () => { const res = await saveDomain({ data: { domain } }); setInfo(res.domain ? (res.status === "active" ? "✓ DNS encontrado — domínio ativo." : "Domínio salvo. O DNS ainda não aponta para a NEXA.") : "Domínio removido."); })}><Check />Salvar domínio</Button>
      {r.custom_domain && <Button variant="outline" disabled={busy} onClick={() => run(async () => { setInfo("Verificando…"); const res = await checkDomain(); setInfo(res.status === "active" ? "✓ DNS encontrado — domínio ativo." : `Ainda não encontramos o registro de ${r.custom_domain}. Confira o DNS e aguarde a propagação.`); })}><RefreshCw />{busy ? "Verificando…" : "Verificar agora"}</Button>}
    </div>
    {info && <p className="client-plan-note" role="status">{info}</p>}
    {r.custom_domain && <div className="client-copy-row"><div><small>Base URL da sua API</small><code>https://{r.custom_domain}/api/public/v1</code></div><Button size="icon" variant="outline" aria-label="Copiar base URL" onClick={() => copy(`https://${r.custom_domain}/api/public/v1`, "baseurl")}>{copied === "baseurl" ? <Check /> : <Copy />}</Button></div>}
    <pre className="client-code">{`Como ativar (no painel do seu domínio, ex.: Registro.br, GoDaddy, Cloudflare):

1. Subdomínio (ex.: api.sualoja.com) — crie um CNAME:
   Nome:  ${domain && domain.split(".").length > 2 ? domain.split(".")[0] : "api"}
   Valor: cloudnexa.com.br

   Domínio raiz (ex.: sualoja.com) — crie um registro A:
   Nome:  @
   Valor: 185.158.133.1

2. Aguarde a propagação (até 72h, geralmente minutos).

3. Volte aqui e clique em "Verificar agora".`}</pre>
    <p className="client-plan-note">Depois de ativo, avise o suporte NEXA para conectar o domínio à hospedagem — sem esse passo o endereço não responde.</p>
  </section>;
}

function DeliveryTemplateEditor({ initial, busy, run }: { initial: string; busy: boolean; run: (fn: () => Promise<unknown>) => Promise<void> }) {
  const save = useServerFn(resellerSaveDeliveryMessage);
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(false);
  return <section className="client-section"><div className="client-section-heading"><h2>Mensagem de entrega</h2><div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={() => { setText(DEFAULT_DELIVERY_TEMPLATE); setSaved(false); }}>Restaurar padrão</Button><Button className="client-primary" disabled={busy} onClick={() => run(async () => { await save({ data: { text } }); setSaved(true); })}><Check />{saved ? "Salva" : "Salvar mensagem"}</Button></div></div>
    <p className="text-sm text-muted-foreground">Escreva <b>{"{chave}"}</b> onde a chave do cliente deve aparecer. Ela é trocada automaticamente sempre que você gera uma chave nova.</p>
    <textarea className="reseller-input mt-2 w-full resize-y" aria-label="Mensagem de entrega" rows={16} maxLength={4000} value={text} onChange={(e) => { setText(e.target.value); setSaved(false); }} /></section>;
}
