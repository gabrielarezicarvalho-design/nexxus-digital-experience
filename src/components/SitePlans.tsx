import { Button } from '@/components/ui/button';
import { MonthlyPlanCards } from '@/components/MonthlyPlanCards';
import { MONTHLY_PLAN_FAMILY } from '@/lib/plan-models';
import { gptMonthlyPlanPreviews, monthlyPlanPreviews } from '@/lib/monthly-plan-preview';
import { tokenOfferQuery, usePromotionRealtime } from '@/lib/promotion-query';
import { TokenPromotion } from '@/components/TokenPromotion';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { checkPixPayment, createPixPayment } from '@/lib/pix.functions';
import { BRL_TO_EUR } from '@/lib/eur-rate';
import { familyPriceCents, type ModelFamily } from '@/lib/model-family';
import { trackMeta } from '@/lib/meta-pixel';
import { useLang } from '@/lib/i18n';
import { ArrowRight, Check } from 'lucide-react';
import ess30Asset from "../assets/nexus/essencial-30m-nexa.jpg.asset.json";
import ess50Asset from "../assets/nexus/essencial-50m-nexa.jpg.asset.json";
import ess250 from "../assets/nexus/essencial-250m-v-MNDfGA.webp";
import ess500 from "../assets/nexus/essencial-500m-DXGa6c95.webp";
import ess750 from "../assets/nexus/essencial-750m-Ci9Kp4TZ.webp";
import ess1b from "../assets/nexus/essencial-1b-DYlk2eVG.webp";
import unlimited3Asset from "../assets/nexus/ilimitado-3d-nexa.jpg.asset.json";
import unlimited7Asset from "../assets/nexus/ilimitado-7d-nexa.jpg.asset.json";
import unlimited15Asset from "../assets/nexus/ilimitado-15d-nexa.jpg.asset.json";
import unlimited30Asset from "../assets/nexus/ilimitado-30d-nexa.png.asset.json";

const ess30 = ess30Asset.url;
const ess50 = ess50Asset.url;
const unlimited3 = unlimited3Asset.url;
const unlimited7 = unlimited7Asset.url;
const unlimited15 = unlimited15Asset.url;
const unlimited30 = unlimited30Asset.url;

type Plan = { image: string; title: string; price: string; detail: string; action: string; href: string; best?: boolean; old?: string | undefined; discount?: string | undefined; badge?: string | undefined };

const tokenPlans: Plan[] = [
  { image: ess30, title: "30 MILHÕES · SEM PRAZO", price: "29,99", detail: "≈ R$ 1,00 por milhão", action: "LEVAR 30 MILHÕES", href: "https://nexxus-pro.online/checkout?plan=cc_ess_50m" },
  { image: ess50, title: "50 MILHÕES · SEM PRAZO", price: "52,99", detail: "≈ R$ 1,06 por milhão", action: "LEVAR 50 MILHÕES", href: "https://nexxus-pro.online/checkout?plan=cc_ess_100m" },
  { image: ess250, title: "250 MILHÕES · SEM PRAZO", price: "109,99", detail: "≈ R$ 0,44 por milhão", action: "LEVAR 250 MILHÕES", href: "https://nexxus-pro.online/checkout?plan=cc_ess_250m" },
  { image: ess500, title: "500 MILHÕES · SEM PRAZO", price: "184,99", detail: "≈ R$ 0,37 por milhão", action: "LEVAR 500 MILHÕES", href: "https://nexxus-pro.online/checkout?plan=cc_ess_500m" },
  { image: ess750, title: "750 MILHÕES · SEM PRAZO", price: "249,99", detail: "≈ R$ 0,33 por milhão", action: "LEVAR 750 MILHÕES", href: "https://nexxus-pro.online/checkout?plan=cc_ess_750m" },
  { image: ess1b, title: "1 BILHÃO · SEM PRAZO", price: "299,99", detail: "≈ R$ 0,30 por milhão", action: "LEVAR 1 BILHÃO", href: "https://nexxus-pro.online/checkout?plan=cc_ess_1b", best: true },
];

const unlimitedPlans: Plan[] = [
  { image: unlimited30, title: "5X · MENSAL", price: "149,90", detail: "Até 250 milhões de tokens por dia", action: "ESCOLHER 5X", href: "https://checkout.local/?plan=cc_mensal_5x" },
  { image: unlimited30, title: "20X · MENSAL", price: "209,90", detail: "Até 500 milhões de tokens por dia", action: "ESCOLHER 20X", href: "https://checkout.local/?plan=cc_mensal_20x", best: true },
];

const DEFAULT_IMAGES: Record<string, string> = {
  cc_ess_50m: ess30, cc_ess_100m: ess50, cc_ess_250m: ess250, cc_ess_500m: ess500, cc_ess_750m: ess750, cc_ess_1b: ess1b,
  cc_3d: unlimited3, cc_7d: unlimited7, cc_15d: unlimited15, cc_30d: unlimited30,
};
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function toPlan(r: any): Plan {
  const days = r.kind === "days";
  return {
    image: r.image_url || DEFAULT_IMAGES[r.code] || (days ? unlimited30 : ess50),
    title: r.title || r.name, price: brl(r.price_cents), detail: r.detail || "",
    action: r.action_label || (days ? "ESCOLHER" : "COMPRAR"), href: `https://checkout.local/?plan=${r.code}`,
    best: !!r.best, old: r.old_price_cents ? `R$ ${brl(r.old_price_cents)}` : undefined, discount: r.discount || undefined, badge: r.badge || undefined,
  };
}

function useLivePlans() {
  usePromotionRealtime();
  const { data } = useQuery({
    queryKey: ["public-plans"], staleTime: 30_000, refetchInterval: 60_000,
    queryFn: async () => (await supabase.from("plans").select("*").eq("active", true).eq("show_on_site", true).order("sort_order").order("price_cents")).data ?? null,
  });
  if (!data) return { tokens: tokenPlans, unlimited: unlimitedPlans };
  const valid = data.filter((r: any) => r.code);
  return { tokens: valid.filter((r: any) => r.kind !== "days").map(toPlan), unlimited: valid.filter((r: any) => r.kind === "days").map(toPlan) };
}

const PLAN_MODELS = {
  claude: ["Opus 5.5", "Sonnet 5", "Fable 5.1"],
  openai: ["Astra 6", "Terra 5.6", "Luna 5.6"],
};

const DAILY_LIMIT_LABEL: Record<string, string> = {
  cc_mensal_5x: "250 milhões de tokens diários",
  cc_mensal_20x: "500 milhões de tokens diários",
};

function PlanCard({ plan, onBuy, byPeriod, family }: { plan: Plan; onBuy: (plan: Plan) => void; byPeriod: boolean; family: ModelFamily }) {
  const { t } = useLang();
  const parts = plan.title.split(" · ");
  const includedModels = family === "combo" ? [...PLAN_MODELS.claude, ...PLAN_MODELS.openai] : PLAN_MODELS[family];
  const planCode = /[?&]plan=([^&]+)/.exec(plan.href)?.[1] ?? "";
  const dailyLimit = byPeriod ? DAILY_LIMIT_LABEL[planCode] : undefined;
  const familyPrefix = family === "claude" ? "Claude" : family === "openai" ? "GPT" : "Claude + GPT";
  const sizeLabel = byPeriod ? `${familyPrefix} ${parts[0]}` : parts[0];
  return <article className={`plan-card${plan.best ? " best" : ""}`}>
    <div className="plan-body"><span className="gateway-plan-tag">{plan.best ? t("MELHOR VALOR") : "NEXA CLOUD"}</span><h3>{parts[1] || t('ACESSO À API')}</h3><div className={`gateway-plan-size${byPeriod && family === "combo" ? " gateway-plan-size--combo" : ""}`}>{sizeLabel} <small>{t(byPeriod ? "de acesso" : "de tokens")}</small></div><div className="price"><small>R$</small>{plan.price}</div>
      {plan.old ? <><p className="deal"><s>{plan.old}</s> <b>{plan.discount}</b></p><p>{plan.detail}</p></> : <p>{plan.detail || t('Pagamento único via PIX')}</p>}
      <div className="mt-4">
        <span className="text-xs font-semibold text-foreground">{t("Modelos incluídos")}</span>
        <ul className="gateway-plan-checks"><li><Check size={12} /> {includedModels.join(", ")}</li>{dailyLimit ? <li><Check size={12} /> {t(dailyLimit)}</li> : null}{byPeriod ? null : <li><Check size={12} /> {t("1M contexto em todos os modelos")}</li>}<li><Check size={12} /> {t("Claude Code e OpenCode")}</li><li><Check size={12} /> {t("Consumo no seu painel")}</li><li><Check size={12} /> {t("Entrega após aprovação")}</li><li><Check size={12} /> {t("Suporte em português")}</li></ul>
      </div>
      <Button type="button" className="buy-button" onClick={() => onBuy(plan)}>{t("Contratar plano")} <ArrowRight size={13} /></Button>
    </div>
  </article>;
}

function FakeQr({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    let h = 2166136261;
    for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    const rand = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 4294967296; };
    const n = 25, out: boolean[] = [];
    const finder = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (finder(x, y)) {
        const lx = x < 7 ? x : x - (n - 7), ly = y < 7 ? y : y - (n - 7);
        out.push(lx === 0 || lx === 6 || ly === 0 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4));
      } else out.push(rand() > 0.52);
    }
    return out;
  }, [seed]);
  return <div className="pix-qr" aria-hidden="true">{cells.map((on, i) => <i key={i} className={on ? "on" : ""} />)}</div>;
}

function PixModal({ plan, family, onClose, customer, onApproved }: { plan: Plan; family: ModelFamily; onClose: () => void; customer?: { name: string; email: string } | undefined; onApproved?: (() => void) | undefined }) {
  const { t } = useLang();
  const createFn = useServerFn(createPixPayment);
  const checkFn = useServerFn(checkPixPayment);
  const [seconds, setSeconds] = useState(30 * 60);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [name, setName] = useState(customer?.name ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [pix, setPix] = useState<{ id: string; qrCode: string; qrBase64: string } | null>(null);
  const [aprovado, setAprovado] = useState(false);
  const [metodo, setMetodo] = useState<"pix" | "revolut">("pix");
  const eur = (Number(String(plan.price).replace(/\./g, "").replace(",", ".")) * BRL_TO_EUR).toFixed(2).replace(".", ",");
  useEffect(() => { if (aprovado) onApproved?.(); }, [aprovado, onApproved]);
  const planCode = new URL(plan.href).searchParams.get("plan") ?? "";
  useEffect(() => {
    if (!pix) return;
    const t = setInterval(() => setSeconds(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [pix]);
  useEffect(() => {
    if (!pix || aprovado) return;
    const t = setInterval(async () => {
      try { const r = await checkFn({ data: { id: pix.id } }); if (r.status === "approved") { setAprovado(true); trackMeta("Purchase", { value: Number(String(plan.price).replace(",", ".")) || undefined, currency: "BRL", content_name: plan.title }, `purchase-${pix.id}`); } } catch { /* tenta de novo */ }
    }, 5000);
    return () => clearInterval(t);
  }, [pix, aprovado, checkFn]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const gerar = async (e: { preventDefault: () => void }) => {
    e.preventDefault(); setErro(""); setBusy(true); trackMeta("InitiateCheckout", { value: Number(String(plan.price).replace(",", ".")) || undefined, currency: "BRL", content_name: plan.title });
    try { setPix(await createFn({ data: { plan: planCode, name, email, family } })); }
    catch (err) { setErro(err instanceof Error ? err.message : t("Erro ao gerar o PIX.")); }
    finally { setBusy(false); }
  };
  const copy = async () => {
    if (!pix) return;
    try { await navigator.clipboard.writeText(pix.qrCode); } catch { /* sem permissão */ }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const verify = async () => {
    if (!pix) return;
    setChecking(true); setMsg("");
    try {
      const r = await checkFn({ data: { id: pix.id } });
      if (r.status === "approved") setAprovado(true); else setMsg(t("Pagamento ainda não identificado. Aguarde alguns segundos."));
    } catch { setMsg(t("Não foi possível verificar agora.")); }
    finally { setChecking(false); }
  };
  return <div className="pix-overlay" onClick={onClose}>
    <div className="pix-modal" role="dialog" aria-modal="true" aria-label={t("Repasse via PIX")} onClick={e => e.stopPropagation()}>
      <Button variant="ghost" size="icon" type="button" className="pix-close" onClick={onClose} aria-label={t("Fechar")}>×</Button>
      <p className="pix-eyebrow">{aprovado ? t("Tudo certo") : t("Checkout seguro")}</p>
      <h3>{aprovado ? t("Pagamento aprovado!") : t("Finalizar Assinatura")}</h3>
      <div className="pix-summary">
        <div>
          <span className="pix-summary-plan">{plan.title}</span>
          <span className="pix-summary-family">{family === "claude" ? "Claude" : family === "openai" ? "GPT" : "Combo Claude + GPT"}{plan.badge && <span className="monthly-plan-badge">{t(plan.badge)}</span>}</span>
        </div>
        <b className="pix-summary-price">{metodo === "revolut" ? `€ ${eur}` : `R$ ${plan.price}`}</b>
      </div>
      {aprovado ? <>
        <p className="pix-timer">{t("Sua chave sk-nx foi gerada. Entre ou crie sua conta com o e-mail")} <b>{email}</b> {t("para ver a chave.")}</p>
        {customer ? <Button className="pix-verify" onClick={onClose}>{t("Ver meu plano")}</Button> : <Button asChild className="pix-verify"><Link to="/minha-chave">{t("Ver minha chave →")}</Link></Button>}
      </> : !pix ? <>
        <div className="gateway-price-tabs" aria-label={t("Forma de pagamento")} style={{ marginBottom: 10 }}>
          <Button variant="ghost" type="button" aria-pressed={metodo === "pix"} onClick={() => setMetodo("pix")}>PIX</Button>
          <Button variant="ghost" type="button" aria-pressed={metodo === "revolut"} onClick={() => setMetodo("revolut")}>Revolut (€)</Button>
        </div>
        {metodo === "revolut" ? <div style={{ display: "grid", gap: 6, textAlign: "left" }}>
          <p className="pix-valor">{t("Valor:")} <b>€ {eur}</b></p>
          <p className="pix-timer" style={{ textAlign: "center", marginTop: -12 }}>{t("Para pagar em Euro via Revolut, clique aqui para falar com o suporte no WhatsApp")}</p>
          <Button asChild className="pix-verify"><a href="https://chat.whatsapp.com/EVdOAcdCyRlBQKfA0PkK9O" target="_blank" rel="noopener noreferrer">{t("Falar com o suporte")}</a></Button>
        </div> : <form onSubmit={gerar} style={{ display: "grid", gap: 10 }}>
        <input className="pix-code" required minLength={2} placeholder={t("Seu nome")} value={name} onChange={e => setName(e.target.value)} />
        <input className="pix-code" required type="email" readOnly={!!customer} aria-label={t("Seu e-mail (a chave fica nele)")} placeholder={t("Seu e-mail (a chave fica nele)")} value={email} onChange={e => setEmail(e.target.value)} />
        <Button variant="ghost" type="submit" className="pix-verify" disabled={busy}>{busy ? t("Abrindo…") : t("Gerar QR Code PIX")}</Button>
        {erro && <p className="pix-timer">{erro}</p>}
      </form>}
      </> : pix ? <>
        {pix.qrBase64 ? <img src={`data:image/png;base64,${pix.qrBase64}`} alt="QR Code PIX" style={{ width: 220, height: 220, margin: "0 auto", display: "block" }} /> : <FakeQr seed={pix.id} />}
        <Button variant="ghost" type="button" className="pix-code" onClick={copy} title={t("Clique para copiar")}>{pix.qrCode}</Button>
        <Button variant="ghost" type="button" className="pix-copy" onClick={copy}>{copied ? t("✓ Código copiado!") : t("⧉ Copiar Código PIX")}</Button>
        <Button variant="ghost" type="button" className="pix-verify" onClick={verify} disabled={checking}>{checking ? t("Verificando…") : t("✓ Já paguei, verificar agora")}</Button>
        <p className="pix-timer">{msg || `${t("Aguardando pagamento…")} ${mm}:${ss}`}</p>
      </> : null}
    </div>
  </div>;
}


export function SitePlans({ customer, onApproved }: { customer?: { name: string; email: string }; onApproved?: () => void }) {
  const [selected, setSelected] = useState<Plan | null>(null);
  const [family, setFamily] = useState<ModelFamily>('claude');
  const [tab, setTab] = useState<'tokens' | 'mensal' | 'gpt' | 'combo'>('mensal');
  const { tokens, unlimited } = useLivePlans();
  const { data: offer } = useQuery(tokenOfferQuery);
  const navigate = useNavigate();
  // No painel do cliente mantém o pop-up; no site abre o checkout em nova aba.
  const openCheckout = (plan: Plan, fam: ModelFamily) => {
    if (customer) { setFamily(fam); setSelected(plan); return; }
    const code = /[?&]plan=([^&]+)/.exec(plan.href)?.[1] ?? "";
    void navigate({ to: "/checkout", search: { plan: code, family: fam } });
  };
  const priced = (plan: Plan): Plan => {
    const cents = Math.round(Number(plan.price.replace(/\./g, '').replace(',', '.')) * 100) || 0;
    return { ...plan, price: brl(familyPriceCents('combo', cents)), old: undefined, discount: undefined };
  };
  return <>
    <div className="gateway-price-tabs" aria-label="Tipos de plano">{([['tokens', 'Tokens'], ['mensal', 'Mensal'], ['gpt', 'GPT'], ['combo', 'Combo']] as const).map(([id, label]) => <Button key={id} variant="ghost" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</Button>)}</div>
    {tab === 'tokens' && offer && <TokenPromotion initialData={offer} onBuy={plan => openCheckout(toPlan(plan), 'claude')} />}
    {tab === 'tokens'
      ? <div className="token-grid">{tokens.map(plan => <PlanCard key={plan.href} plan={plan} family="claude" onBuy={p => openCheckout(p, 'claude')} byPeriod={false} />)}</div>
      : tab === 'combo'
      ? <div className="token-grid token-grid--pair">{unlimited.map(plan => <PlanCard key={plan.href} plan={priced(plan)} family="combo" onBuy={p => openCheckout(p, 'combo')} byPeriod />)}</div>
      : <MonthlyPlanCards key={tab} previews={tab === 'gpt' ? gptMonthlyPlanPreviews : monthlyPlanPreviews} onBuy={p => openCheckout({ image: '', title: `MENSAL · ${p.name.toUpperCase()}`, price: brl(p.priceCents), detail: '', action: 'Assinar', badge: p.badge || undefined, href: `https://checkout.local/?plan=${p.code}` }, MONTHLY_PLAN_FAMILY[p.code] ?? 'claude')} />}
    {selected && <PixModal plan={selected} family={family} customer={customer} onApproved={onApproved} onClose={() => setSelected(null)} />}
  </>;
}
