import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageTitle, Panel } from "@/lib/admin-ui";
import { pageHead } from "@/lib/page-head";
import { comboNameProblem } from "@/lib/model-combos";
import { adminDeleteCombo, adminSaveCombo, adminTestCombo } from "@/lib/model-combos.functions";

export const Route = createFileRoute("/admin/combos")({ head: () => pageHead("Combos", "Monte combos com modelos de vários fornecedores."), component: Combos });

type Item = { provider: string; model: string };
type Combo = { id: string; name: string; display_name: string | null; description: string | null; strategy: "fallback" | "round_robin"; enabled: boolean; model_combo_items: (Item & { position: number })[] };
type Draft = { id?: string; name: string; display_name: string; description: string; strategy: "fallback" | "round_robin"; enabled: boolean; items: Item[] };
type TestResult = Awaited<ReturnType<typeof adminTestCombo>>;

const empty: Draft = { name: "", display_name: "", description: "", strategy: "fallback", enabled: true, items: [{ provider: "", model: "" }] };
const inputCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";
const STRATEGY: Record<Draft["strategy"], string> = { fallback: "Em ordem: tenta o próximo se o anterior falhar", round_robin: "Rodízio: cada pedido começa em um modelo diferente" };

function friendly(cause: unknown) {
  const m = cause instanceof Error ? cause.message : String(cause);
  try { const p = JSON.parse(m) as { message?: string }[]; if (Array.isArray(p)) return p.map((x) => x.message).join(" "); } catch { /* texto */ }
  return m;
}

function Combos() {
  const qc = useQueryClient();
  const save = useServerFn(adminSaveCombo);
  const remove = useServerFn(adminDeleteCombo);
  const test = useServerFn(adminTestCombo);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tests, setTests] = useState<Record<string, TestResult | "rodando">>({});

  const combos = useQuery({ queryKey: ["admin-combos"], queryFn: async () => {
    const { data, error } = await (supabase as any).from("model_combos").select("id, name, display_name, description, strategy, enabled, model_combo_items(position, provider, model)").order("name");
    if (error) throw error;
    return (data ?? []) as Combo[];
  } });
  const providers = useQuery({ queryKey: ["admin-combo-providers"], queryFn: async () => {
    const { data, error } = await supabase.from("provider_accounts").select("name, active, paused, available_models").order("priority");
    if (error) throw error;
    return (data ?? []) as { name: string; active: boolean; paused: boolean; available_models: string[] | null }[];
  } });
  const modelsOf = (provider: string) => providers.data?.find((p) => p.name === provider)?.available_models ?? [];

  const edit = (c: Combo) => { setError(null); setDraft({ id: c.id, name: c.name, display_name: c.display_name ?? "", description: c.description ?? "", strategy: c.strategy, enabled: c.enabled, items: [...c.model_combo_items].sort((a, b) => a.position - b.position).map(({ provider, model }) => ({ provider, model })) }); };
  const setItem = (i: number, patch: Partial<Item>) => draft && setDraft({ ...draft, items: draft.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const moveItem = (i: number, dir: -1 | 1) => {
    if (!draft) return;
    const j = i + dir;
    if (j < 0 || j >= draft.items.length) return;
    const items = [...draft.items];
    [items[i], items[j]] = [items[j]!, items[i]!];
    setDraft({ ...draft, items });
  };
  const nameProblem = draft ? comboNameProblem(draft.name.trim().toLowerCase(), draft.items.filter((it) => it.provider && it.model.trim())) : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const items = draft.items.filter((it) => it.provider && it.model.trim());
    setBusy(true); setError(null);
    try {
      await save({ data: { ...draft, name: draft.name.trim().toLowerCase(), items } });
      setNotice(`Combo ${draft.name} salvo. Os clientes já podem usar esse nome.`);
      setDraft(null);
      await qc.invalidateQueries({ queryKey: ["admin-combos"] });
    } catch (cause) { setError(friendly(cause)); } finally { setBusy(false); }
  };
  const runTest = async (name: string) => {
    setTests((t) => ({ ...t, [name]: "rodando" }));
    try { const r = await test({ data: { name } }); setTests((t) => ({ ...t, [name]: r })); }
    catch (cause) { setTests((t) => ({ ...t, [name]: { ok: false, status: 0, provider: null, model: null, ms: 0, reply: friendly(cause), failures: [] } })); }
  };

  return (
    <>
      <PageTitle title="Combos" description="Junte modelos de vários fornecedores em um nome da sua marca. O cliente pede o nome do combo e o gateway tenta os modelos na ordem (ou em rodízio), passando para o próximo se um falhar.">
        <Button onClick={() => { setError(null); setDraft({ ...empty, items: [{ provider: "", model: "" }] }); }} className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus /> Criar combo</Button>
      </PageTitle>
      {notice && <p className="mb-4 rounded-md border border-accent/30 bg-accent/10 p-3 text-sm text-accent">{notice}</p>}

      {draft && (
        <Panel className="mb-6 p-5">
          <h2 className="mb-4 font-semibold">{draft.id ? `Editar ${draft.name}` : "Criar combo"}</h2>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs text-muted-foreground">Nome do combo (o cliente usa este nome)
                <input required className={`mt-1 font-mono ${inputCls}`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value.toLowerCase() })} placeholder="turbo-max" />
                <span className={`mt-1 block ${nameProblem ? "text-destructive" : ""}`}>{nameProblem ?? "Qualquer nome. Se usar nome de Claude, GPT ou Gemini, todos os modelos do combo precisam ser dessa família."}</span>
              </label>
              <label className="text-xs text-muted-foreground">Nome de exibição<input className={`mt-1 ${inputCls}`} value={draft.display_name} onChange={(e) => setDraft({ ...draft, display_name: e.target.value })} placeholder="Nexa Turbo" /></label>
              <label className="text-xs text-muted-foreground">Estratégia
                <select className={`mt-1 ${inputCls}`} value={draft.strategy} onChange={(e) => setDraft({ ...draft, strategy: e.target.value as Draft["strategy"] })}>
                  {(Object.keys(STRATEGY) as Draft["strategy"][]).map((k) => <option key={k} value={k}>{STRATEGY[k]}</option>)}
                </select>
              </label>
              <label className="text-xs text-muted-foreground">Descrição (opcional)<input className={`mt-1 ${inputCls}`} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Rápido para tarefas do dia a dia" /></label>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} /> Ativo (aparece para os clientes)</label>

            <div>
              <p className="mb-2 text-sm font-medium">Modelos do combo <span className="font-normal text-muted-foreground">· na ordem em que são tentados</span></p>
              <div className="grid gap-2">
                {draft.items.map((it, i) => (
                  <div key={i} className="grid items-center gap-2 rounded-md border border-border p-2 md:grid-cols-[2rem_1fr_1.4fr_auto]">
                    <span className="text-center text-xs font-semibold text-muted-foreground">{i + 1}</span>
                    <select aria-label={`Fornecedor ${i + 1}`} className={inputCls} value={it.provider} onChange={(e) => setItem(i, { provider: e.target.value, model: "" })}>
                      <option value="">Escolha o fornecedor</option>
                      {(providers.data ?? []).map((p) => <option key={p.name} value={p.name}>{p.name}{p.active && !p.paused ? "" : " (inativo)"}</option>)}
                    </select>
                    <input aria-label={`Modelo ${i + 1}`} list={`models-${i}`} className={`font-mono ${inputCls}`} value={it.model} onChange={(e) => setItem(i, { model: e.target.value })} placeholder={it.provider ? "Escolha ou digite o modelo" : "Escolha o fornecedor primeiro"} disabled={!it.provider} />
                    <datalist id={`models-${i}`}>{modelsOf(it.provider).map((m) => <option key={m} value={m} />)}</datalist>
                    <div className="flex gap-1">
                      <Button type="button" size="icon" variant="ghost" aria-label="Subir" onClick={() => moveItem(i, -1)}><ArrowUp /></Button>
                      <Button type="button" size="icon" variant="ghost" aria-label="Descer" onClick={() => moveItem(i, 1)}><ArrowDown /></Button>
                      <Button type="button" size="icon" variant="ghost" aria-label="Remover" className="text-destructive" onClick={() => setDraft({ ...draft, items: draft.items.filter((_, j) => j !== i) })}><Trash2 /></Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setDraft({ ...draft, items: [...draft.items, { provider: "", model: "" }] })}><Plus /> Adicionar modelo</Button>
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={busy || Boolean(nameProblem)} className="bg-accent text-accent-foreground hover:bg-accent/90">{busy ? "Salvando…" : "Salvar combo"}</Button>
              <Button type="button" variant="ghost" onClick={() => setDraft(null)}>Cancelar</Button>
            </div>
          </form>
        </Panel>
      )}

      <section className="grid gap-3">
        {combos.isLoading && <p className="text-sm text-muted-foreground">Carregando combos…</p>}
        {combos.isError && <p className="text-sm text-destructive">Não foi possível carregar os combos.</p>}
        {combos.data?.length === 0 && <Panel className="p-8 text-center text-sm text-muted-foreground">Nenhum combo ainda. Clique em "Criar combo".</Panel>}
        {combos.data?.map((c) => {
          const items = [...c.model_combo_items].sort((a, b) => a.position - b.position);
          const t = tests[c.name];
          return (
            <Panel key={c.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono font-semibold">{c.name} {!c.enabled && <span className="ml-2 rounded border border-border px-1.5 py-0.5 font-sans text-xs text-muted-foreground">desativado</span>}</p>
                  <p className="text-xs text-muted-foreground">{c.display_name && c.display_name !== c.name ? `${c.display_name} · ` : ""}{c.strategy === "round_robin" ? "Rodízio" : "Em ordem"} · {items.length} modelo(s){c.description ? ` · ${c.description}` : ""}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {items.map((it, i) => <span key={i} className="rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-[11px]">{i + 1}. {it.provider} · {it.model}</span>)}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="outline" disabled={t === "rodando"} onClick={() => void runTest(c.name)}><Zap /> {t === "rodando" ? "Testando…" : "Testar"}</Button>
                  <Button size="sm" variant="outline" onClick={() => edit(c)}>Editar</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => { if (!confirm(`Excluir o combo ${c.name}? Clientes que usam esse nome vão receber erro.`)) return; try { await remove({ data: { id: c.id } }); await qc.invalidateQueries({ queryKey: ["admin-combos"] }); } catch (cause) { setError(friendly(cause)); } }}>Excluir</Button>
                </div>
              </div>
              {t && t !== "rodando" && (
                <div className={`mt-3 rounded-md border p-3 text-xs ${t.ok ? "border-accent/30 bg-accent/5" : "border-destructive/30 bg-destructive/10"}`}>
                  {t.ok ? <p><strong>Respondeu em {(t.ms / 1000).toFixed(1)} s</strong> · {t.provider} · <span className="font-mono">{t.model}</span>{t.reply ? ` · "${t.reply}"` : ""}</p>
                    : <p className="text-destructive"><strong>Falhou</strong>{t.status ? ` (HTTP ${t.status})` : ""} · {t.reply}</p>}
                  {t.failures.length > 0 && <p className="mt-1 text-muted-foreground">Antes falharam: {t.failures.map((f) => `${f.provider} · ${f.model} (HTTP ${f.status}, ${(f.latencyMs / 1000).toFixed(1)} s)`).join(" → ")}</p>}
                </div>
              )}
            </Panel>
          );
        })}
      </section>
    </>
  );
}
