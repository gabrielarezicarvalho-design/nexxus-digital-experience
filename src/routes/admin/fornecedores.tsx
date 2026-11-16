import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Activity, ArrowDown, ArrowUp, ChevronDown, Crown, ListFilter, Pencil, PlugZap, Power, Server, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { LiveIndicator } from "@/lib/admin-ui";
import { ProviderBalances } from "@/components/ProviderBalances";
import { ProviderInferenceTest } from "@/components/ProviderInferenceTest";
import { providerCatalogModels } from "@/lib/provider-catalog";
import { adminMakePrimaryProvider, adminCreateProvider, adminDeleteProvider, adminSetProviderState, adminTestProvider, adminUpdateProvider } from "@/lib/providers.functions";

export const Route = createFileRoute("/admin/fornecedores")({
  head: () => ({ meta: [
    { title: "Fornecedores — NEXA CLOUD" },
    { name: "description", content: "Gerencie as conexões dos fornecedores de modelos da NEXA CLOUD." },
    { property: "og:title", content: "Fornecedores — NEXA CLOUD" },
    { property: "og:description", content: "Gerencie as conexões dos fornecedores de modelos da NEXA CLOUD." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Providers,
});

type Provider = {
  id: string; name: string; provider_type: string; base_url: string; api_secret_name: string;
  priority: number; active: boolean; paused: boolean; available_models: string[]; updated_at: string; default_model?: string | null;
};
type Form = Omit<Provider, "id" | "active" | "paused" | "available_models" | "updated_at" | "default_model"> & { id?: string; api_key?: string };
type TestState = { state: "online" | "error" | "unconfigured"; latencyMs: number | null };
type StoredCheck = { state: "online" | "error" | "unconfigured"; at: number };

const ORDINALS = ["Principal", "Secundário", "Terciário", "Quaternário", "Quinto", "Sexto", "Sétimo", "Oitavo"];
const CHECK_STORE_KEY = "nexa-provider-checks";
const GREEN = "var(--client-dot-green)";
const checkedAgo = (at: number) => {
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  return `há ${Math.round(minutes / 60)} h`;
};

const inputClass = "h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent";
const defaults: Form = { name: "", provider_type: "Personalizado", base_url: "", api_secret_name: "", priority: 100, api_key: "" };
const presets: Record<string, { base: string; secret: string }> = {
  "CodeCraft API": { base: "https://www.codecraftapi.com/v1", secret: "CODECRAFT_API_KEY" },
  OpenAI: { base: "https://api.openai.com/v1", secret: "OPENAI_API_KEY" },
  Anthropic: { base: "https://api.anthropic.com/v1", secret: "ANTHROPIC_API_KEY" },
  OpenRouter: { base: "https://openrouter.ai/api/v1", secret: "OPENROUTER_API_KEY" },
  Personalizado: { base: "", secret: "" },
};

function Providers() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>(defaults);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tests, setTests] = useState<Record<string, TestState>>({});
  const create = useServerFn(adminCreateProvider);
  const update = useServerFn(adminUpdateProvider);
  const setState = useServerFn(adminSetProviderState);
  const remove = useServerFn(adminDeleteProvider);
  const test = useServerFn(adminTestProvider);
  const makePrimary = useServerFn(adminMakePrimaryProvider);
  const [openModels, setOpenModels] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [checks, setChecks] = useState<Record<string, StoredCheck>>({});
  useEffect(() => {
    try { setChecks(JSON.parse(localStorage.getItem(CHECK_STORE_KEY) ?? "{}") as Record<string, StoredCheck>); } catch { setChecks({}); }
  }, []);
  const catalog = useQuery({ queryKey: ["admin-model-names"], queryFn: async () => {
    const { data } = await supabase.from("models").select("name, internal_id, provider, enabled"); return data ?? [];
  } });

  const providers = useQuery({
    queryKey: ["admin-providers"],
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error: queryError } = await supabase.from("provider_accounts")
        .select("id, name, provider_type, base_url, api_secret_name, priority, active, paused, available_models, updated_at, default_model")
        .order("priority").order("created_at");
      if (queryError) throw queryError;
      return data as Provider[];
    },
  });
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin-providers"] }),
    queryClient.invalidateQueries({ queryKey: ["admin-model-names"] }),
    queryClient.invalidateQueries({ queryKey: ["admin-models"] }),
    queryClient.invalidateQueries({ queryKey: ["site-models-count"] }),
  ]);
  useEffect(() => {
    const channel = supabase.channel("admin-provider-selection")
      .on("postgres_changes", { event: "*", schema: "public", table: "provider_accounts" }, () => { void queryClient.invalidateQueries({ queryKey: ["admin-providers"] }); })
      .on("postgres_changes", { event: "*", schema: "public", table: "models" }, () => { void queryClient.invalidateQueries({ queryKey: ["admin-model-names"] }); void queryClient.invalidateQueries({ queryKey: ["admin-models"] }); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [queryClient]);
  const pinProvider = (provider: Provider) => run(async () => {
    const result = await makePrimary({ data: { id: provider.id } });
    setNotice(`${result.provider} selecionado · ${result.models} modelo(s) no catálogo ativo.`);
  });
  const run = async (action: () => Promise<unknown>) => {
    setError(null); setBusy(true);
    try { await action(); await refresh(); } catch (cause) { setError(friendlyError(cause)); } finally { setBusy(false); }
  };
  const chooseType = (provider_type: string) => {
    const preset = presets[provider_type] ?? presets["Personalizado"];
    if (!preset) return;
    setForm((current) => ({ ...current, provider_type, base_url: preset.base, api_secret_name: preset.secret }));
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await run(async () => {
      const { id, ...data } = { ...form, priority: Number(form.priority), api_key: form.api_key ?? "" };
      if (id) await update({ data: { ...data, id } });
      else await create({ data });
      setNotice(id ? `${form.name} · alterações salvas.` : `${form.name} · conta adicionada. Use "Puxar modelos" para carregar os modelos dela.`);
      setForm(defaults);
    });
  };
  const testAccount = async (provider: Provider, updateModels: boolean) => {
    setError(null); setBusy(true); setTests((current) => ({ ...current, [provider.id]: { state: "unconfigured", latencyMs: null } }));
    try {
      const result = await test({ data: { id: provider.id, updateModels } });
      setTests((current) => ({ ...current, [provider.id]: result }));
      const stored: Record<string, StoredCheck> = { ...checks, [provider.id]: { state: result.state, at: Date.now() } };
      setChecks(stored);
      try { localStorage.setItem(CHECK_STORE_KEY, JSON.stringify(stored)); } catch { /* ignore */ }
      if (updateModels) {
        if (result.state !== "online") throw new Error("Não foi possível puxar os modelos; o catálogo anterior foi mantido.");
        await refresh();
        setOpenModels(provider.id);
        setNotice(`${provider.name} · ${result.models.length} modelo(s) encontrados e atualizados na aba Modelos.`);
      }
    } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  };
  const move = (index: number, direction: -1 | 1) => {
    const list = providers.data;
    const current = list?.[index];
    const target = list?.[index + direction];
    if (!current || !target) return;
    const full = (item: Provider, priority: number) => ({
      id: item.id, name: item.name, provider_type: item.provider_type, base_url: item.base_url,
      api_secret_name: item.api_secret_name, priority,
    });
    void run(async () => {
      await update({ data: full(current, target.priority) });
      await update({ data: full(target, current.priority) });
    });
  };

  return (
    <div className="w-full space-y-7">
      <header className="border-b border-border pb-6">
        <LiveIndicator />
        <h1 className="text-3xl font-bold">Fornecedores</h1>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted-foreground">Cadastre e organize as contas que entregam os modelos. O fornecedor PRINCIPAL atende todos os pedidos; se ele cair, os RESERVAS assumem na ordem. Use "Tornar principal" para trocar.</p>
      </header>

      {notice && <p className="rounded-md border border-accent/30 bg-accent/10 p-3 text-sm text-accent">{notice}</p>}
      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <ProviderBalances />
      <ProviderInferenceTest providers={providers.data ?? []} />
      <section className="rounded-md border border-border bg-card p-5 shadow-sm" aria-labelledby="provider-form-title">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 id="provider-form-title" className="font-semibold">{form.id ? "Editar conta" : "Adicionar conta"}</h2>{form.id && <Button type="button" size="sm" variant="ghost" onClick={() => setForm(defaults)}>Cancelar</Button>}</div>
        <form onSubmit={submit} className="grid gap-3 lg:grid-cols-2">
          <label className="text-xs text-muted-foreground">Fornecedor<select aria-label="Fornecedor" className={`mt-1 ${inputClass}`} value={form.provider_type} onChange={(event) => chooseType(event.target.value)}>{Object.keys(presets).map((name) => <option key={name}>{name}</option>)}</select></label>
          <label className="text-xs text-muted-foreground">Nome da conta<input required aria-label="Nome da conta" className={`mt-1 ${inputClass}`} placeholder="Ex.: CodeCraft API 01" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="text-xs text-muted-foreground">API key<input type="password" autoComplete="off" required={!form.id && !form.api_secret_name} aria-label="API key" className={`mt-1 ${inputClass}`} placeholder={form.id ? "Em branco mantém a chave atual" : "Cole aqui a API key do fornecedor"} value={form.api_key ?? ""} onChange={(event) => setForm({ ...form, api_key: event.target.value })} /><span className="mt-1 block">A chave fica guardada no servidor e nunca volta a aparecer nesta tela.</span></label>
          <label className="text-xs text-muted-foreground">Nome do segredo (opcional)<input aria-label="Nome do segredo" className={`mt-1 ${inputClass}`} placeholder="Criado a partir do nome da conta" value={form.api_secret_name} onChange={(event) => setForm({ ...form, api_secret_name: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") })} /><span className="mt-1 block">Só para chaves já colocadas no servidor. Em branco, o painel cria um.</span></label>
          <label className="text-xs text-muted-foreground">URL base<input required type="url" aria-label="URL base" className={`mt-1 ${inputClass}`} value={form.base_url} onChange={(event) => setForm({ ...form, base_url: event.target.value })} /></label>
          <label className="text-xs text-muted-foreground">Prioridade<input required type="number" min="0" max="10000" aria-label="Prioridade" className={`mt-1 ${inputClass}`} value={form.priority} onChange={(event) => setForm({ ...form, priority: Number(event.target.value) })} /></label>
          {error && <p role="alert" className="text-sm text-destructive lg:col-span-2">{error}</p>}
          <div className="flex items-end"><Button disabled={busy} type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90"><PlugZap />{busy ? "Salvando…" : form.id ? "Salvar alterações" : "Salvar conta"}</Button></div>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Contas cadastradas">
        {providers.isLoading && <p className="text-sm text-muted-foreground">Carregando fornecedores…</p>}
        {providers.isError && <p className="text-sm text-destructive">Não foi possível carregar os fornecedores.</p>}
        {!providers.isLoading && providers.data?.length === 0 && <p className="rounded-md border border-border p-6 text-center text-sm text-muted-foreground lg:col-span-2">Nenhum fornecedor cadastrado.</p>}
        {providers.data?.map((provider, index) => {
          const result = tests[provider.id];
          const enabled = provider.active && !provider.paused;
          const primaryId = providers.data?.find((p) => p.active && !p.paused)?.id;
          const isPrimary = provider.id === primaryId;
          const enabledRank = (providers.data ?? []).filter((p) => p.active && !p.paused).findIndex((p) => p.id === provider.id);
          const rankLabel = !enabled ? "Inativo" : (ORDINALS[enabledRank] ?? `Reserva ${enabledRank}`);
          const stored = checks[provider.id];
          const checkState = result?.state ?? stored?.state;
          const checkedAt = stored?.at;
          const form = { id: provider.id, name: provider.name, provider_type: provider.provider_type, base_url: provider.base_url, api_secret_name: provider.api_secret_name, priority: provider.priority };
          const availableModels = providerCatalogModels(provider.name, provider.available_models);
          return <article key={provider.id} className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: "var(--client-tint)" }}>
                  {isPrimary && enabled ? <Crown className="h-5 w-5 text-accent" /> : <Server className="h-5 w-5 text-accent" />}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{provider.name}</h2>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{provider.base_url}</p>
                  <p className="mt-1.5 text-xs font-semibold">{rankLabel} · Prioridade {provider.priority}</p>
                </div>
              </div>
              {enabled && isPrimary
                ? <span className="shrink-0 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">Principal (automático)</span>
                : <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${enabled ? "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground"}`}>{enabled ? "Reserva" : "Inativo"}</span>}
            </div>
            <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Credencial</p>
                <p className="mt-2 flex items-center gap-2 text-sm font-medium">
                  {checkState === "unconfigured"
                    ? <><ShieldAlert className="h-4 w-4" style={{ color: "var(--client-danger)" }} /><span style={{ color: "var(--client-danger)" }}>Segredo não configurado</span></>
                    : <><ShieldCheck className="h-4 w-4" style={{ color: GREEN }} /><span style={{ color: GREEN }}>Configurada e protegida</span></>}
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{provider.api_secret_name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Conexão</p>
                <p className="mt-2">
                  {checkState === "online" && <span className="inline-block rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: "color-mix(in oklab, var(--client-dot-green) 15%, transparent)", color: GREEN }}>Operacional</span>}
                  {checkState === "error" && <span className="inline-block rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: "color-mix(in oklab, var(--client-danger) 12%, transparent)", color: "var(--client-danger)" }}>Falhou</span>}
                  {checkState === "unconfigured" && <span className="inline-block rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: "color-mix(in oklab, var(--client-danger) 12%, transparent)", color: "var(--client-danger)" }}>Segredo ausente</span>}
                  {!checkState && <span className="inline-block rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">Sem dados</span>}
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{checkedAt ? `checado: ${checkedAgo(checkedAt)}` : "ainda não checado"}</p>
                {result?.state === "online" && result.latencyMs != null && <p className="mt-0.5 font-mono text-xs text-muted-foreground">resposta em {result.latencyMs} ms</p>}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" disabled={busy || index === 0} aria-label="Subir prioridade" onClick={() => move(index, -1)}><ArrowUp /></Button>
              <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" disabled={busy || index === (providers.data?.length ?? 0) - 1} aria-label="Descer prioridade" onClick={() => move(index, 1)}><ArrowDown /></Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button size="sm" variant="outline" disabled={busy}><ListFilter /> Definir como <ChevronDown className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Função</DropdownMenuLabel>
                  <DropdownMenuItem disabled={busy} onSelect={() => void pinProvider(provider)}>Principal</DropdownMenuItem>
                  <DropdownMenuItem disabled={busy || enabled} onSelect={() => void run(() => setState({ data: { id: provider.id, active: true } }))}>Ativo</DropdownMenuItem>
                  <DropdownMenuItem disabled={busy || !enabled} onSelect={() => void run(() => setState({ data: { id: provider.id, active: false } }))}>Inativo</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Modelos</DropdownMenuLabel>
                  <DropdownMenuItem disabled={busy} onSelect={() => void testAccount(provider, true)}>Puxar modelos</DropdownMenuItem>
                  <DropdownMenuItem disabled={!provider.available_models.length} onSelect={() => { setOpenModels(openModels === provider.id ? null : provider.id); }}>Ver modelos…</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => void testAccount(provider, false)}><Activity /> Testar conexão</Button>
              <Button size="sm" variant="outline" onClick={() => setForm(form)}><Pencil /> Editar</Button>
              <Button size="sm" variant="outline" disabled={busy} title="Selecionar fornecedor e atualizar seus modelos" onClick={() => void pinProvider(provider)}><Power />{busy ? "Atualizando…" : "Fixar neste fornecedor"}</Button>
              <Button size="icon" variant="ghost" className="ml-auto h-9 w-9 shrink-0 text-destructive hover:text-destructive" disabled={busy} aria-label={`Excluir ${provider.name}`} onClick={() => confirm(`Excluir ${provider.name}?`) && void run(() => remove({ data: { id: provider.id } }))}><Trash2 /></Button>
            </div>
            {openModels === provider.id && <div className="mt-4 border-t border-border pt-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">Modelos disponíveis · {availableModels.length}</h3>
                <Button asChild size="sm" variant="outline"><Link to="/admin/modelos" search={{ fornecedor: provider.name }}>Ver na aba Modelos</Link></Button>
              </div>
              <ul className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
                {availableModels.map((model) => {
                  const registered = catalog.data?.find((item) => item.provider === provider.name && (item.internal_id || item.name) === model);
                  return <li key={model} className="min-w-0 border-b border-border py-2">
                    <p className="break-all font-mono text-xs">{model}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{registered ? registered.enabled ? "Ativo" : "No catálogo · Inativo" : "Ainda não registrado"}</p>
                  </li>;
                })}
              </ul>
            </div>}
          </article>;
        })}
      </section>
    </div>
  );
}

/** Mensagens de validação do servidor chegam como JSON; mostra só o texto útil. */
function friendlyError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  try {
    const parsed = JSON.parse(message) as Array<{ message?: string; path?: string[] }>;
    if (Array.isArray(parsed) && parsed.length) return parsed.map((issue) => issue.message).filter(Boolean).join(" ");
  } catch { /* não é JSON */ }
  return message;
}
