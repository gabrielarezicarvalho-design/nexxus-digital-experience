import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Panel, fmt } from "@/lib/admin-ui";
import { Plus } from "lucide-react";
import { pageHead } from '@/lib/page-head';
import { PromotionEditor } from '@/components/PromotionEditor';
import { hasTokenLimit } from '@/lib/plan-limits';
import { Button } from '@/components/ui/button';
const toast = { success: (m: string) => alert(m), error: (m: string) => alert(m) };

export const Route = createFileRoute("/admin/planos")({ head: () => pageHead('Gestão de planos', 'Administre os planos, preços e limites NEXA CLOUD.'), component: Planos });

const inputCls = "w-full rounded-md border border-border bg-card px-2 py-1 text-sm";
type Row = any;
const isUnlimited = (p: Row) => /^cc_monthly_/.test(p?.code ?? "");
const groups = [
  { title: "Mensais ilimitados", match: (p: Row) => isUnlimited(p) },
  { title: "Mensais com limite diário", match: (p: Row) => p.kind === "days" && !isUnlimited(p) },
  { title: "Pacotes de tokens", match: (p: Row) => p.kind !== "days" },
];

const toCents = (v: string) => Math.round(Number((v || "0").replace(/\./g, "").replace(",", ".")) * 100);
const fromCents = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));

/** Reduz a imagem e devolve em formato texto (data URL) para salvar junto do plano. */
async function fileToDataUrl(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const max = 800, scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  const context = c.getContext("2d");
  if (!context) throw new Error("Não foi possível ler a imagem");
  context.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/webp", 0.82);
}

const empty = { name: "", title: "", detail: "", action_label: "", kind: "tokens", token_limit: "", daily_token_limit: "", duration_days: "", price: "", old_price: "", discount: "", rpm_limit: "60", sort_order: "0", best: false, active: true, image_url: "", badge: "" };

function Planos() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin-plans-all"], queryFn: async () => (await supabase.from("plans").select("*").order("kind").order("sort_order").order("price_cents")).data ?? [] });
  const [edit, setEdit] = useState<{ id: string | null; f: typeof empty } | null>(null);
  const refresh = () => ["admin-plans-all", "admin-plans", "public-plans"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  function abrir(p?: Row) {
    if (!p) return setEdit({ id: null, f: { ...empty } });
    setEdit({ id: p.id, f: {
      name: p.name ?? "", title: p.title ?? "", detail: p.detail ?? "", action_label: p.action_label ?? "", kind: p.kind,
      token_limit: p.token_limit?.toString() ?? "", daily_token_limit: p.daily_token_limit?.toString() ?? "", duration_days: p.duration_days?.toString() ?? "", price: fromCents(p.price_cents),
      old_price: fromCents(p.old_price_cents), discount: p.discount ?? "", rpm_limit: String(p.rpm_limit), sort_order: String(p.sort_order ?? 0),
      best: !!p.best, active: !!p.active, image_url: p.image_url ?? "", badge: p.badge ?? "",
    } });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); if (!edit) return undefined;
    const f = edit.f;
    const monthly = isUnlimited(data.find((p: Row) => p.id === edit.id));
    if (!monthly && !hasTokenLimit({ token_limit: f.kind === "tokens" ? Number(f.token_limit) : null, daily_token_limit: f.kind === "days" ? Number(f.daily_token_limit) : null })) { toast.error("Informe um limite de tokens."); return; }
    const row: Record<string, unknown> = {
      name: f.name, title: f.title || null, detail: f.detail || null, action_label: f.action_label || null, kind: f.kind,
      token_limit: f.kind === "tokens" && f.token_limit ? Number(f.token_limit) : null,
      daily_token_limit: f.kind === "days" && f.daily_token_limit ? Number(f.daily_token_limit) : null,
      duration_days: f.kind === "days" && f.duration_days ? Number(f.duration_days) : null,
      price_cents: toCents(f.price), old_price_cents: f.old_price ? toCents(f.old_price) : null, discount: f.discount || null,
      rpm_limit: Number(f.rpm_limit || 60), sort_order: Number(f.sort_order || 0), best: f.best, active: f.active, image_url: f.image_url || null, badge: f.badge.trim() || null,
    };
    let error;
    if (edit.id) ({ error } = await supabase.from("plans").update(row as never).eq("id", edit.id));
    else {
      const slug = f.name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24) || "plano";
      row["code"] = `cc_${slug}_${Math.random().toString(36).slice(2, 6)}`;
      ({ error } = await supabase.from("plans").insert(row as never));
    }
    if (error) { toast.error(error.message); return; }
    toast.success("Plano salvo — o site já foi atualizado"); setEdit(null); refresh();
  }

  async function excluir(p: Row) {
    if (!confirm(`Excluir o plano "${p.name}"? Ele some do site e do checkout.`)) return;
    await supabase.from("clients").update({ plan_id: null } as never).eq("plan_id", p.id);
    const { error } = await supabase.from("plans").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Plano excluído"); refresh();
  }

  async function onImg(file?: File) {
    if (!file || !edit) return;
    try { const url = await fileToDataUrl(file); setEdit({ ...edit, f: { ...edit.f, image_url: url } }); }
    catch { toast.error("Não foi possível ler a imagem"); }
  }

  const editingUnlimited = !!edit?.id && isUnlimited(data.find((p: Row) => p.id === edit.id));
  const set = (k: keyof typeof empty, v: unknown) => edit && setEdit({ ...edit, f: { ...edit.f, [k]: v } });

  return (
    <>
      <PageTitle title="Planos" description="Tudo que você muda aqui aparece automaticamente no site e no valor cobrado no PIX.">
        <Button onClick={() => abrir()} className="bg-accent text-accent-foreground"><Plus className="h-4 w-4" strokeWidth={2.5} />Novo plano</Button>
      </PageTitle>
      <PromotionEditor plan={data.find(p => p.code === 'cc_promo_25m')} />
      {groups.map(g => { const rows = data.filter(g.match); if (!rows.length) return null; return (
        <section key={g.title} className="mt-6">
          <div className="mb-3 flex items-baseline justify-between gap-3"><h2 className="text-base font-semibold">{g.title}</h2><span className="text-xs text-muted-foreground">{rows.length} {rows.length === 1 ? "plano" : "planos"}</span></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((p: Row) => { const unl = isUnlimited(p); return (
              <Panel key={p.id} className={`flex flex-col gap-3 p-4 ${p.active ? "" : "opacity-60"}`}>
                <div className="flex items-start gap-3">
                  {p.image_url ? <img src={p.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-sm font-bold text-accent">{p.name.slice(0, 2).toUpperCase()}</div>}
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><span className="font-semibold">{p.name}</span>{p.badge && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">{p.badge}</span>}</div><div className="truncate text-xs text-muted-foreground">{p.title ?? p.code}</div></div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.active ? "bg-accent/10 text-[color:var(--success-text)]" : "bg-muted text-muted-foreground"}`}>{p.active ? "ATIVO" : "DESLIGADO"}</span>
                </div>
                <div className="text-2xl font-bold">R$ {fromCents(p.price_cents)}{p.kind === "days" && <span className="text-sm font-normal text-muted-foreground"> / {p.duration_days ?? 30} dias</span>}</div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="rounded-md bg-muted px-2 py-1">{unl ? "Tokens ilimitados" : p.daily_token_limit ? `${fmt(p.daily_token_limit)} tokens/dia` : `${fmt(p.token_limit)} tokens`}</span>
                  <span className="rounded-md bg-muted px-2 py-1">{p.rpm_limit} RPM</span>
                  {p.spam_guard && <span className="rounded-md bg-muted px-2 py-1">Controle de spam</span>}
                </div>
                <div className="mt-auto flex justify-end gap-2 pt-1">
                  {p.code === 'cc_promo_25m' ? <span className="text-xs text-muted-foreground">Edite na oferta especial acima</span> : <><Button size="sm" variant="outline" onClick={() => abrir(p)}>Editar</Button>
                  {!unl && <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => excluir(p)}>Excluir</Button>}</>}
                </div>
              </Panel>); })}
          </div>
        </section>); })}

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={() => setEdit(null)}>
          <form onSubmit={salvar} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-card p-5 shadow-xl">
            <p className="mb-4 text-lg font-semibold">{edit.id ? "Editar plano" : "Novo plano"}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <L t="Nome interno"><input required className={inputCls} value={edit.f.name} onChange={(e) => set("name", e.target.value)} /></L>
              {editingUnlimited ? <L t="Tipo"><div className="rounded-md border border-border bg-muted px-2 py-1 text-sm">Mensal ilimitado</div></L> : <L t="Tipo"><select className={inputCls} value={edit.f.kind} onChange={(e) => set("kind", e.target.value)}><option value="tokens">Por tokens (sem prazo)</option><option value="days">Mensal (limite diário)</option></select></L>}
              <L t="Título no site"><input className={inputCls} placeholder="50 MILHÕES · SEM PRAZO" value={edit.f.title} onChange={(e) => set("title", e.target.value)} /></L>
              <L t="Texto do botão"><input className={inputCls} placeholder="LEVAR 50 MILHÕES" value={edit.f.action_label} onChange={(e) => set("action_label", e.target.value)} /></L>
              {edit.f.kind === "tokens"
                ? <L t="Quantidade de tokens"><input required min={1} type="number" className={inputCls} value={edit.f.token_limit} onChange={(e) => set("token_limit", e.target.value)} /></L>
                : <><L t="Dias"><input required min={1} type="number" className={inputCls} value={edit.f.duration_days} onChange={(e) => set("duration_days", e.target.value)} /></L>{!editingUnlimited && <L t="Tokens por dia"><input required min={1} type="number" className={inputCls} value={edit.f.daily_token_limit} onChange={(e) => set("daily_token_limit", e.target.value)} /></L>}</>}
              <L t="Selo no cartão (ex.: BLACK FRIDAY)"><input className={inputCls} maxLength={24} placeholder="Deixe vazio para sem selo" value={edit.f.badge} onChange={(e) => set("badge", e.target.value.toUpperCase())} /></L>
              <L t="Detalhe"><input className={inputCls} placeholder="≈ R$ 0,60 por milhão" value={edit.f.detail} onChange={(e) => set("detail", e.target.value)} /></L>
              <L t="Preço (R$)"><input required className={inputCls} placeholder="29,99" value={edit.f.price} onChange={(e) => set("price", e.target.value)} /></L>
              <L t="Preço antigo riscado (opcional)"><input className={inputCls} value={edit.f.old_price} onChange={(e) => set("old_price", e.target.value)} /></L>
              <L t="Desconto (opcional)"><input className={inputCls} placeholder="-39%" value={edit.f.discount} onChange={(e) => set("discount", e.target.value)} /></L>
              <L t="Pedidos por minuto"><input type="number" className={inputCls} value={edit.f.rpm_limit} onChange={(e) => set("rpm_limit", e.target.value)} /></L>
              <L t="Ordem no site"><input type="number" className={inputCls} value={edit.f.sort_order} onChange={(e) => set("sort_order", e.target.value)} /></L>
              <div className="flex items-end gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={edit.f.best} onChange={(e) => set("best", e.target.checked)} />Melhor valor</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={edit.f.active} onChange={(e) => set("active", e.target.checked)} />Ativo no site</label>
              </div>
              <L t="Imagem"><div className="flex items-center gap-3">
                {edit.f.image_url ? <img src={edit.f.image_url} alt="" className="h-16 w-16 rounded object-cover" /> : <span className="text-xs text-muted-foreground">Imagem padrão</span>}
                <input type="file" accept="image/*" className="text-xs" onChange={(e) => onImg(e.target.files?.[0])} />
                {edit.f.image_url && <button type="button" className="text-xs underline" onClick={() => set("image_url", "")}>remover</button>}
              </div></L>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEdit(null)} className="rounded-md border border-border px-3 py-2 text-sm">Cancelar</button>
              <button className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function L({ t, children }: { t: string; children: React.ReactNode }) {
  return <label className="block text-xs text-muted-foreground"><span className="mb-1 block">{t}</span>{children}</label>;
}
