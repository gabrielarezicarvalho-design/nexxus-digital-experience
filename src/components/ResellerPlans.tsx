import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Power, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveResellerPlan, setResellerPlanActive } from "@/lib/reseller-plans.functions";
import { RESELLER_PLAN_MAX_TOKENS } from "@/lib/reseller-plan-rules";

type Plan = { id: string; code: string; name: string; kind: string; token_limit: number | null; duration_days: number | null; active: boolean };
type Draft = { id?: string; name: string; kind: "tokens"; amount: string };

export function ResellerPlans({ plans, busy, run, cost }: { plans: Plan[]; busy: boolean; run: (fn: () => Promise<unknown>) => Promise<void>; cost: string }) {
  const save = useServerFn(saveResellerPlan);
  const setActive = useServerFn(setResellerPlanActive);
  const [draft, setDraft] = useState<Draft | null>(null);
  return <>
    <section className="client-section client-card">
      <div className="client-section-heading"><h2>Planos personalizados</h2><Button className="client-primary" disabled={busy} onClick={() => setDraft({ name: "", kind: "tokens", amount: "" })}><Plus />Novo plano</Button></div>
      <p className="client-plan-note">Repasse por chave: {cost}</p>
      {draft && <form className="my-5 grid gap-4 border-y border-border py-5 sm:grid-cols-2" onSubmit={(event) => {
        event.preventDefault();
        void run(async () => {
          await save({ data: { id: draft.id, name: draft.name, kind: "tokens", token_limit: Number(draft.amount), duration_days: null } });
          setDraft(null);
        });
      }}>
        <h3 className="font-semibold sm:col-span-2">{draft.id ? "Editar plano" : "Novo plano personalizado"}</h3>
        <label className="grid gap-2 text-sm">Nome do plano<input className="reseller-input min-w-0 w-full" required maxLength={60} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
        <label className="grid gap-2 text-sm">Tipo de plano<select className="reseller-input min-w-0 w-full" value="tokens" disabled><option value="tokens">Por tokens · sem prazo</option></select></label>
        <label className="grid gap-2 text-sm">Quantidade de tokens<input className="reseller-input min-w-0 w-full" required type="number" min={1} max={RESELLER_PLAN_MAX_TOKENS} step={1} value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /></label>
        <div className="flex flex-wrap items-end gap-2"><Button type="submit" className="client-primary" disabled={busy}><Save />Salvar plano</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setDraft(null)}><X />Cancelar</Button></div>
      </form>}
      {plans.length ? <div className="reseller-table"><table><thead><tr><th>Plano</th><th>Tokens</th><th>Validade</th><th>Status</th><th /></tr></thead><tbody>{plans.map((p) => <tr key={p.id}><td><strong>{p.name}</strong><br /><code className="text-xs">{p.code}</code></td><td>{Number(p.token_limit).toLocaleString("pt-BR")}</td><td>{p.duration_days === null ? "Sem prazo" : `${p.duration_days} dias`}</td><td><span className="client-badge">{p.active ? "Ativo" : "Desativado"}</span></td><td><div className="flex justify-end gap-1"><Button size="icon" variant="outline" title="Editar plano" aria-label={`Editar plano ${p.name}`} disabled={busy} onClick={() => setDraft({ id: p.id, name: p.name, kind: "tokens", amount: String(p.token_limit) })}><Pencil /></Button><Button size="icon" variant="outline" title={p.active ? "Desativar plano" : "Ativar plano"} aria-label={`${p.active ? "Desativar" : "Ativar"} plano ${p.name}`} disabled={busy} onClick={() => { if (!p.active || confirm("Desativar este plano para novas chaves? As chaves existentes continuam iguais.")) void run(() => setActive({ data: { id: p.id, active: !p.active } })); }}><Power /></Button></div></td></tr>)}</tbody></table></div> : <div className="client-empty">Nenhum plano personalizado criado.</div>}
    </section>
  </>;
}