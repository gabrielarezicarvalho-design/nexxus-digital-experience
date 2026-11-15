import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Lock, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { checkPixPayment, createPixPayment, previewCoupon } from "@/lib/pix.functions";
import { BRL_TO_EUR } from "@/lib/eur-rate";
import { familyPriceCents, type ModelFamily } from "@/lib/model-family";
import { MONTHLY_PLAN_FAMILY } from "@/lib/plan-models";
import { trackMeta } from "@/lib/meta-pixel";
import { useLang } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import logoAsset from "@/assets/nexus/nexa-logo.png.asset.json";

const FAMILIES = ["claude", "openai", "combo"] as const;

export const Route = createFileRoute("/checkout")({
  validateSearch: (s: Record<string, unknown>): { plan: string; family?: ModelFamily | undefined } => ({
    plan: typeof s["plan"] === "string" ? s["plan"] : "",
    family: FAMILIES.includes(s["family"] as ModelFamily) ? (s["family"] as ModelFamily) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Checkout · NEXA CLOUD" },
      { name: "description", content: "Finalize sua assinatura NEXA CLOUD com pagamento via PIX ou Revolut." },
      { property: "og:title", content: "Checkout · NEXA CLOUD" },
      { property: "og:description", content: "Finalize sua assinatura NEXA CLOUD com pagamento via PIX ou Revolut." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

const maskPhone = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 11); return d.length <= 2 ? d : d.length <= 7 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; };
const maskCpf = (v: string) => v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function CheckoutPage() {
  const { t } = useLang();
  const { plan: code, family: famParam } = Route.useSearch();
  const navigate = useNavigate();
  const family: ModelFamily = MONTHLY_PLAN_FAMILY[code] ?? famParam ?? "claude";
  const createFn = useServerFn(createPixPayment);
  const checkFn = useServerFn(checkPixPayment);
  const couponFn = useServerFn(previewCoupon);

  const { data: row, isLoading } = useQuery({
    queryKey: ["checkout-plan", code],
    enabled: !!code,
    queryFn: async () => (await supabase.from("plans").select("code,name,title,price_cents,badge,kind").eq("code", code).eq("active", true).maybeSingle()).data,
  });

  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [metodo, setMetodo] = useState<"pix" | "revolut">("pix");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [pix, setPix] = useState<{ id: string; qrCode: string; qrBase64: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [aprovado, setAprovado] = useState(false);
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [couponMsg, setCouponMsg] = useState("");
  const [applied, setApplied] = useState<{ code: string; discountCents: number } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u?.email) return;
      let n = String(u.user_metadata?.["display_name"] ?? u.user_metadata?.["name"] ?? u.user_metadata?.["full_name"] ?? "").trim();
      if (!n) n = ((await supabase.from("profiles").select("display_name").eq("id", u.id).maybeSingle()).data?.display_name ?? "").trim();
      if (!n) n = ((await supabase.from("clients").select("name").eq("user_id", u.id).maybeSingle()).data?.name ?? "").trim();
      setUser({ name: n, email: u.email }); setName(n); setEmail(u.email);
    });
  }, []);

  const cents = row ? (family === "combo" && !MONTHLY_PLAN_FAMILY[code] ? familyPriceCents("combo", row.price_cents) : row.price_cents) : 0;
  const discount = applied?.discountCents ?? 0;
  const totalCents = cents - discount;
  const fmt = (c: number) => metodo === "revolut" ? `€ ${((c / 100) * BRL_TO_EUR).toFixed(2).replace(".", ",")}` : `R$ ${brl(c)}`;
  const price = brl(totalCents);
  const title = row ? (row.kind === "days" || code.startsWith("cc_monthly") ? `${row.name}` : row.title || row.name) : "";
  const familyLabel = family === "claude" ? "Claude" : family === "openai" ? "GPT" : "Combo Claude + GPT";
  const sub = fmt(cents);
  const shown = fmt(totalCents);

  useEffect(() => {
    if (!pix || aprovado) return;
    const i = setInterval(async () => {
      try { const r = await checkFn({ data: { id: pix.id } }); if (r.status === "approved") setAprovado(true); } catch { /* tenta de novo */ }
    }, 5000);
    return () => clearInterval(i);
  }, [pix, aprovado, checkFn]);

  useEffect(() => {
    if (!aprovado) return;
    trackMeta("Purchase", { value: totalCents / 100, currency: "BRL", content_name: title }, `purchase-${pix?.id}`);
    const tm = setTimeout(() => void navigate({ to: "/minha-chave" }), 2500);
    return () => clearTimeout(tm);
  }, [aprovado]); // eslint-disable-line react-hooks/exhaustive-deps

  const gerar = async (e: { preventDefault: () => void }) => {
    e.preventDefault(); setErro(""); setBusy(true);
    trackMeta("InitiateCheckout", { value: totalCents / 100, currency: "BRL", content_name: title });
    try { setPix(await createFn({ data: { plan: code, name, email, family, ...(applied ? { coupon: applied.code } : {}) } })); }
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
    try { const r = await checkFn({ data: { id: pix.id } }); if (r.status === "approved") setAprovado(true); else setMsg(t("Pagamento ainda não identificado. Aguarde alguns segundos.")); }
    catch { setMsg(t("Não foi possível verificar agora.")); }
    finally { setChecking(false); }
  };

  if (!code || (!isLoading && !row)) {
    return <main className="co-page co-empty"><p>{t("Plano não encontrado.")}</p><Button asChild><Link to="/">{t("Ver os planos")}</Link></Button></main>;
  }

  return <main className="co-page">
    <div className="lg-lang co-lang"><LanguageToggle /></div>
    <section className="co-left">
      <div className="co-inner">
        <Link to="/" className="co-brand"><img src={logoAsset.url} alt="" width={26} height={26} /> NEXA <span className="co-brand-accent">CLOUD</span></Link>
        <p className="co-label">{t("Assinar")} {title}</p>
        <div className="co-big"><strong>{isLoading ? "…" : shown}</strong>{code.startsWith("cc_monthly") && <span>{t("por")}<br />{t("mês")}</span>}</div>
        <div className="co-item"><span className="co-item-ico"><img src={logoAsset.url} alt="" width={18} height={18} /></span><div><b>{title}</b><small>{familyLabel}</small></div><b>{sub}</b></div>
        <div className="co-row"><span>Subtotal</span><span>{sub}</span></div>
        {applied && <div className="co-row co-discount"><span>{t("Cupom")} {applied.code}</span><span>− {fmt(discount)}</span></div>}
        <div className="co-row co-muted"><span>{t("Taxas")}</span><span>{metodo === "revolut" ? "€ 0,00" : "R$ 0,00"}</span></div>
        <div className="co-row co-total"><span>{t("Total a pagar hoje")}</span><span>{shown}</span></div>
      </div>
      <footer className="co-foot"><Lock size={12} /> {t("Pagamento seguro")} <i /> <Link to="/termos" className="co-foot-link"><Lock size={12} /> {t("Termos")}</Link> <Link to="/reembolso" className="co-foot-link"><Lock size={12} /> {t("Reembolso")}</Link></footer>
    </section>

    <section className="co-right">
      <div className="co-inner">
        {aprovado ? <div className="co-done">
          <h2>{t("Pagamento aprovado!")}</h2>
          <p>{t("Sua chave sk-nx foi gerada. Redirecionando para Minha Chave…")}</p>
          <Button asChild className="co-pay"><Link to="/minha-chave">{t("Ver minha chave →")}</Link></Button>
        </div> : pix ? <div className="co-pix">
          <h2>{t("Escaneie o QR Code PIX")}</h2>
          {pix.qrBase64 && <img src={`data:image/png;base64,${pix.qrBase64}`} alt="QR Code PIX" width={220} height={220} />}
          <button type="button" className="co-code" onClick={copy}>{pix.qrCode}</button>
          <Button type="button" variant="outline" onClick={copy}>{copied ? t("✓ Código copiado!") : t("⧉ Copiar Código PIX")}</Button>
          <Button type="button" className="co-pay" onClick={verify} disabled={checking}>{checking ? t("Verificando…") : t("✓ Já paguei, verificar agora")}</Button>
          <p className="co-note">{msg || t("Aguardando pagamento… a página muda sozinha após a confirmação.")}</p>
        </div> : <>
          <p className="co-h">{t("Conta")}</p>
          <div className="co-box co-account"><img className="co-avatar" src={logoAsset.url} alt="" width={36} height={36} />
            {user ? <><div><b>{user.name || user.email}</b><small>{user.email}</small></div><Link to="/entrar" className="co-switch">{t("Trocar")}</Link></>
              : <div className="co-account-mail"><input required type="email" placeholder={t("Seu e-mail (a chave fica nele)")} value={email} onChange={e => setEmail(e.target.value)} form="co-form" /></div>}
          </div>
          <p className="co-h">{t("Forma de pagamento")}</p>
          <div className="co-box co-methods">
            <label className="co-method co-method-head"><input type="radio" checked={metodo === "pix"} onChange={() => setMetodo("pix")} /> <span className="co-pix-ico" aria-hidden="true">◆</span> PIX <small>{t("Aprovação na hora")}</small></label>
            {metodo === "pix" && <div className="co-fields">
              <label>{t("Nome completo")}<input required minLength={2} value={name} onChange={e => setName(e.target.value)} form="co-form" /></label>
              <label>{t("Telefone")}<input required inputMode="tel" minLength={14} placeholder="(11) 91234-5678" value={phone} onChange={e => setPhone(maskPhone(e.target.value))} form="co-form" /></label>
              <label>CPF<input required inputMode="numeric" placeholder="000.000.000-00" minLength={14} value={cpf} onChange={e => setCpf(maskCpf(e.target.value))} form="co-form" /></label>
            </div>}
            <label className="co-method"><input type="radio" checked={metodo === "revolut"} onChange={() => setMetodo("revolut")} /> Revolut (€) <small>{t("Via suporte")}</small></label>
          </div>
          {applied ? <div className="co-coupon-applied"><Ticket size={15} /> {t("Cupom")} <b>{applied.code}</b> {t("aplicado")}<button type="button" onClick={() => { setApplied(null); setCoupon(""); }}>{t("Remover")}</button></div>
          : couponOpen ? <form className="co-coupon" onSubmit={async e => {
            e.preventDefault(); if (!coupon.trim()) return; setCouponBusy(true); setCouponMsg("");
            try { const r = await couponFn({ data: { plan: code, family, code: coupon } }); if (r.ok) setApplied({ code: r.code, discountCents: r.discountCents }); else setCouponMsg(t(r.error)); }
            catch { setCouponMsg(t("Não foi possível verificar o cupom.")); }
            finally { setCouponBusy(false); }
          }}>
            <input value={coupon} onChange={e => { setCoupon(e.target.value.toUpperCase()); setCouponMsg(""); }} placeholder={t("Código do cupom")} />
            <Button type="submit" variant="outline" disabled={couponBusy}>{couponBusy ? "…" : t("Aplicar")}</Button>
            {couponMsg && <small className="co-err">{couponMsg}</small>}
          </form> : <button type="button" className="co-coupon-link" onClick={() => setCouponOpen(true)}><Ticket size={15} /> {t("Tem um cupom?")}</button>}
          {metodo === "revolut" ? <>
            <p className="co-note">{t("Para pagar em Euro via Revolut, clique aqui para falar com o suporte no WhatsApp")}</p>
            <Button asChild className="co-pay"><a href="https://chat.whatsapp.com/EVdOAcdCyRlBQKfA0PkK9O" target="_blank" rel="noopener noreferrer">{t("Falar com o suporte")}</a></Button>
          </> : <form id="co-form" onSubmit={gerar}>
            <Button type="submit" className="co-pay" disabled={busy || !row}>{busy ? t("Abrindo…") : `${t("Pagar")} R$ ${price}`}{""}</Button>
            {erro && <p className="co-note co-err">{erro}</p>}
          </form>}
          <p className="co-note">{t("Ao pagar, você concorda com os")} <Link to="/termos">{t("Termos")}</Link> {t("e a")} <Link to="/termos">{t("Política de Privacidade")}</Link>.<br />{t("Desistiu em até 3 dias? O reembolso é integral.")}</p>
        </>}
      </div>
    </section>
  </main>;
}
