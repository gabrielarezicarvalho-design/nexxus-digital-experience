import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { saveTokenOffer } from "@/lib/promotion.functions";
import { tokenOfferQuery, usePromotionRealtime } from "@/lib/promotion-query";
import { promotionSchema, type PromotionInput } from "@/lib/promotion-rules";
import type { Database } from "@/integrations/supabase/types";

type PlanRow = Database["public"]["Tables"]["plans"]["Row"];
const localDate = (value: string) => { const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16); };

export function PromotionEditor({ plan }: { plan: PlanRow | undefined }) {
  const query = useQuery(tokenOfferQuery);
  usePromotionRealtime();
  const qc = useQueryClient();
  const save = useServerFn(saveTokenOffer);
  const [form, setForm] = useState<PromotionInput | null>(null);
  const [price, setPrice] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!query.data || !plan || dirty) return;
    const { offer } = query.data;
    setForm({ enabled: offer.enabled && plan.active, headline: offer.headline, description: offer.description, badge: offer.badge, button_label: offer.button_label, starts_at: new Date(offer.starts_at).toISOString(), ends_at: new Date(offer.ends_at).toISOString(), name: plan.name, title: plan.title || plan.name, token_limit: plan.token_limit ?? 25000000, price_cents: plan.price_cents, rpm_limit: plan.rpm_limit });
    setPrice((plan.price_cents / 100).toFixed(2).replace(".", ","));
  }, [query.data, plan, dirty]);
  function change<K extends keyof PromotionInput>(key: K, value: PromotionInput[K]) {
    if (!form) return;
    setDirty(true); setMessage(""); setForm({ ...form, [key]: value });
  }
  async function persist(next: PromotionInput) {
    const previous = form;
    setSaving(true); setMessage("");
    try {
      const value = promotionSchema.parse({ ...next, price_cents: Math.round(Number(price.replace(",", ".")) * 100) });
      await save({ data: value });
      setDirty(false); setForm(value);
      await Promise.all(["token-offer", "admin-plans-all", "public-plans"].map(key => qc.invalidateQueries({ queryKey: [key] })));
      setMessage("Oferta salva.");
    } catch (error) { setForm(previous); setMessage(error instanceof Error ? error.message : "Não foi possível salvar a oferta."); }
    finally { setSaving(false); }
  }
  if (!form) return <section className="mb-6 rounded-xl border border-border bg-card p-5"><h2 className="text-lg font-semibold">Oferta especial</h2><p className="text-sm text-muted-foreground">{query.isError ? "Não foi possível carregar a oferta." : "Carregando oferta…"}</p></section>;
  return <section className="mb-6 rounded-xl border border-border bg-card p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-4"><h2 className="text-lg font-semibold">Oferta especial</h2><label className="flex items-center gap-3 text-sm font-medium"><Switch aria-label="Oferta ligada" checked={form.enabled} disabled={saving} onCheckedChange={enabled => { void persist({ ...form, enabled }); }} />{form.enabled ? "Ligada" : "Desligada"}</label></div>
    <form onSubmit={e => { e.preventDefault(); void persist(form); }} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Nome da oferta"><Input required value={form.name} onChange={e => change("name", e.target.value)} /></Field>
      <Field label="Título no checkout"><Input required value={form.title} onChange={e => change("title", e.target.value)} /></Field>
      <Field label="Selo"><Input required value={form.badge} onChange={e => change("badge", e.target.value)} /></Field>
      <Field label="Quantidade de tokens"><Input required type="number" min="1" step="1" value={form.token_limit} onChange={e => change("token_limit", Number(e.target.value))} /></Field>
      <Field label="Preço da oferta (R$)"><Input required inputMode="decimal" value={price} onChange={e => { setPrice(e.target.value); setDirty(true); }} /></Field>
      <Field label="Pedidos por minuto"><Input required type="number" min="1" step="1" value={form.rpm_limit} onChange={e => change("rpm_limit", Number(e.target.value))} /></Field>
      <Field label="Título do cartão"><Input required value={form.headline} onChange={e => change("headline", e.target.value)} /></Field>
      <Field label="Texto do botão"><Input required value={form.button_label} onChange={e => change("button_label", e.target.value)} /></Field>
      <Field label="Descrição"><textarea required rows={4} className="w-full min-h-28 rounded-md border border-input bg-background p-2 text-sm leading-relaxed" value={form.description} onChange={e => change("description", e.target.value)} /></Field>
      <Field label="Início (horário local)"><Input required type="datetime-local" value={localDate(form.starts_at)} onChange={e => { if (e.target.value) change("starts_at", new Date(e.target.value).toISOString()); }} /></Field>
      <Field label="Encerramento (horário local)"><Input required type="datetime-local" value={localDate(form.ends_at)} onChange={e => { if (e.target.value) change("ends_at", new Date(e.target.value).toISOString()); }} /></Field>
      <div className="flex items-end gap-3"><Button type="submit" disabled={saving}><Save />{saving ? "Salvando…" : "Salvar oferta"}</Button></div>
    </form>
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
  </section>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid content-start gap-1.5 text-sm font-medium">{label}{children}</label>;
}