import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Send, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminTestProviderInference } from "@/lib/providers.functions";
import type { InferenceResult } from "@/lib/provider-inference";
import { providerCatalogModels } from "@/lib/provider-catalog";

type TestProvider = { id: string; name: string; available_models: string[]; default_model?: string | null };
const field = "mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:border-accent focus:outline-none";

export function ProviderInferenceTest({ providers }: { providers: TestProvider[] }) {
  const [providerId, setProviderId] = useState("");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [error, setError] = useState("");
  const test = useServerFn(adminTestProviderInference);
  const selected = providers.find((provider) => provider.id === providerId) ?? providers[0];
  const availableModels = selected ? providerCatalogModels(selected.name, selected.available_models) : [];
  const selectedModel = model || (selected?.default_model && availableModels.includes(selected.default_model) ? selected.default_model : availableModels[0]) || "";
  return <section className="border-y border-border py-5" aria-labelledby="inference-title">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 id="inference-title" className="font-semibold">Teste de mensagem</h2>
      <span className="text-xs text-muted-foreground">Envio real · pode consumir saldo do fornecedor</span>
    </div>
    <form className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]" onSubmit={async (event) => {
      event.preventDefault();
      if (!selected || !selectedModel.trim() || busy) return;
      setBusy(true); setResult(null); setError("");
      try { setResult(await test({ data: { id: selected.id, model: selectedModel.trim() } })); }
      catch { setError("Não foi possível realizar o teste. Confira sua sessão e tente novamente."); }
      finally { setBusy(false); }
    }}>
      <label className="text-xs text-muted-foreground">Fornecedor do teste
        <select aria-label="Fornecedor do teste" disabled={busy || !providers.length} className={field} value={selected?.id ?? ""} onChange={(event) => { setProviderId(event.target.value); setModel(""); setResult(null); setError(""); }}>
          {!providers.length && <option value="">Nenhum fornecedor</option>}
          {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
        </select>
      </label>
      <label className="text-xs text-muted-foreground">Modelo do teste
        <input required maxLength={200} aria-label="Modelo do teste" list="provider-test-models" disabled={busy} className={`${field} font-mono`} value={selectedModel} onChange={(event) => { setModel(event.target.value); setResult(null); }} />
        <datalist id="provider-test-models">{availableModels.map((name) => <option key={name} value={name} />)}</datalist>
      </label>
      <Button type="submit" disabled={busy || !selected || !selectedModel.trim()} className="h-10 bg-accent text-accent-foreground hover:bg-accent/90">
        {busy ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <Send />}{busy ? "Testando…" : "Enviar oi"}
      </Button>
    </form>
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    {result && <div role="status" className="mt-4 space-y-2 border-t border-border pt-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <strong className={result.ok ? "text-accent" : "text-destructive"}>{result.ok ? "Mensagem entregue" : "Falha na entrega"}</strong>
        <span className="font-mono text-muted-foreground">{result.status ? `HTTP ${result.status} · ` : ""}{result.latencyMs} ms</span>
      </div>
      <p className="break-words text-xs text-muted-foreground">Modelo retornado: <span className="font-mono">{result.model}</span></p>
      {result.reply && <p className="whitespace-pre-wrap break-words text-sm text-foreground">{result.reply}</p>}
      {result.error && <p className="whitespace-pre-wrap break-words text-sm text-destructive">{result.error}</p>}
    </div>}
  </section>;
}