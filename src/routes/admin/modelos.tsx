import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Panel } from "@/lib/admin-ui";
import { pageHead } from '@/lib/page-head';
import { providerModelAllowed } from "@/lib/provider-catalog";

export const Route = createFileRoute("/admin/modelos")({ validateSearch: (search: Record<string, unknown>) => ({ fornecedor: typeof search['fornecedor'] === "string" ? search['fornecedor'] : "" }), head: () => pageHead('Gestão de modelos', 'Administre os modelos disponíveis para as chaves NEXA CLOUD.'), component: Modelos });

function Modelos() {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const { fornecedor } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftLabel, setDraftLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { data = [] } = useQuery({ queryKey: ["admin-models"], refetchInterval: 10000, queryFn: async () => {
    const { data, error } = await supabase.from("models").select("*").order("name");
    if (error) throw error;
    return data ?? [];
  } });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-models"] });
  useEffect(() => {
    const channel = supabase.channel("admin-models-live").on("postgres_changes", { event: "*", schema: "public", table: "models" }, () => { void qc.invalidateQueries({ queryKey: ["admin-models"] }); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [qc]);
  const visible = data.filter((model) => (!fornecedor || model.provider === fornecedor) && providerModelAllowed(model.provider, model.internal_id || model.name));
  return (
    <>
      <PageTitle title="Modelos" description="Catálogo de modelos por fornecedor" />
      <label className="mb-4 block text-sm">Fornecedor<select aria-label="Filtrar fornecedor" value={fornecedor} onChange={(event) => void navigate({ search: { fornecedor: event.target.value } })} className="mt-1 block h-10 w-full rounded-md border border-border bg-background px-3 sm:max-w-sm"><option value="">Todos os fornecedores</option>{[...new Set(data.map((model) => model.provider))].sort().map((provider) => <option key={provider} value={provider}>{provider}</option>)}</select></label>
      {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
      <Panel className="grid gap-2">
        {!visible.length && <p className="py-4 text-sm text-muted-foreground">Nenhum modelo encontrado.</p>}
        {visible.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-0">
            <div className="min-w-0 flex-1"><p className="break-all font-mono text-sm">{m.display_name || m.internal_id || m.name}</p><p className="mt-1 text-xs text-muted-foreground">{m.provider}{m.internal_id ? ` · interno: ${m.internal_id}` : ""}</p>
              {editing === m.id ? (
                <form className="mt-2 flex flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); const name = draftName.trim(); if (!name) return; setError(null); const { error } = await supabase.from("models").update({ name, display_name: draftLabel.trim() || name }).eq("id", m.id); if (error) setError(error.message.includes("models_name_key") ? "Já existe um modelo com esse nome." : error.message); else { setEditing(null); void refresh(); } }}>
                  <input aria-label="Nome no aplicativo" placeholder="Nome no aplicativo (ex.: claude-opus-5-5)" value={draftName} onChange={(e) => setDraftName(e.target.value)} className="min-w-48 flex-1 rounded-md border border-border bg-card px-3 py-1.5 font-mono text-sm" />
                  <input aria-label="Nome de exibição" placeholder="Nome de exibição" value={draftLabel} onChange={(e) => setDraftLabel(e.target.value)} className="min-w-40 flex-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm" />
                  <Button size="sm" type="submit">Salvar</Button>
                  <Button size="sm" type="button" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
                </form>
              ) : <p className="mt-1 break-all text-xs text-muted-foreground">Nome no aplicativo: <span className="font-mono text-foreground">{m.name}</span></p>}
            </div>
            <div className="flex shrink-0 items-center gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={m.enabled} onChange={async (e) => { setError(null); const enabled = e.target.checked; const { error } = await supabase.from("models").update({ enabled, catalog_approved: enabled }).eq("id", m.id); if (error) setError(error.message); else void refresh(); }} />Ativo</label>
              <Button size="sm" variant="outline" onClick={() => { setEditing(m.id); setDraftName(m.name); setDraftLabel(m.display_name ?? ""); }}>Editar nome</Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => { const { error } = await supabase.from("models").delete().eq("id", m.id); if (error) setError(error.message); else void refresh(); }}>Remover</Button>
            </div>
          </div>
        ))}
        <form className="mt-2 flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (!nome.trim()) return; await supabase.from("models").insert({ name: nome.trim() }); setNome(""); refresh(); }}>
          <input placeholder="ex.: claude-sonnet-4.5" value={nome} onChange={(e) => setNome(e.target.value)} className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm" />
          <Button type="submit">Adicionar</Button>
        </form>
      </Panel>
    </>
  );
}
