import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminResellerApiIps, adminSaveResellerIps } from "@/lib/reseller.functions";

export function ResellerApiIps({ reseller }: { reseller: { id: string; name: string; api_allowed_ips: string[] } }) {
  const qc = useQueryClient();
  const save = useServerFn(adminSaveResellerIps);
  const list = useServerFn(adminResellerApiIps);
  const [text, setText] = useState(reseller.api_allowed_ips.join("\n"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const { data: ips = [], isLoading, error: loadError } = useQuery({
    queryKey: ["reseller-api-ips", reseller.id], queryFn: () => list({ data: { id: reseller.id } }), refetchInterval: 30000,
  });
  async function submit() {
    const approved = text.split(/[\s,;]+/).filter(Boolean);
    if (approved.length === 0 && !confirm("Sem IP autorizado, a geração e gestão pela API ficam bloqueadas. Salvar lista vazia?")) return;
    setBusy(true); setError(""); setSaved(false);
    try {
      await save({ data: { id: reseller.id, ips: approved } });
      await qc.invalidateQueries({ queryKey: ["admin-resellers"] });
      setSaved(true);
    } catch { setError("Não foi possível salvar. Informe apenas IPs válidos, sem faixas ou endereços de sites."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3 border-t border-border py-4">
    <h3 className="flex items-center gap-2 font-semibold"><ShieldCheck size={16} /> IPs autorizados · {reseller.name}</h3>
    <p className={reseller.api_allowed_ips.length ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
      {reseller.api_allowed_ips.length ? `${reseller.api_allowed_ips.length} IP(s) autorizado(s)` : "API bloqueada: nenhum IP autorizado"}
    </p>
    <label className="block text-sm" htmlFor={`approved-ips-${reseller.id}`}>IPs autorizados para geração e gestão</label>
    <textarea id={`approved-ips-${reseller.id}`} className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm" value={text} onChange={(e) => { setText(e.target.value); setSaved(false); }} placeholder="203.0.113.10" />
    <Button size="sm" disabled={busy} onClick={submit}><Save size={14} /> {busy ? "Salvando…" : "Salvar IPs autorizados"}</Button>
    {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    {saved && <p className="text-sm text-accent" role="status">IPs autorizados salvos.</p>}
    <h4 className="text-sm font-medium">Acessos à chave de geração · últimos 7 dias</h4>
    {isLoading ? <p className="text-sm text-muted-foreground">Carregando acessos…</p> : loadError ? <p className="text-sm text-destructive">Não foi possível carregar os acessos.</p> : ips.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum acesso registrado desde a ativação da proteção.</p> :
      <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th>IP</th><th>Pedidos</th><th>Recusados</th><th>Último acesso</th></tr></thead>
        <tbody>{ips.map((ip) => <tr key={ip.ip ?? "unknown"} className="border-t border-border"><td className="py-2 font-mono">{ip.ip ?? "IP não identificado"}</td><td>{ip.requests}</td><td className={ip.denied ? "text-destructive" : "text-muted-foreground"}>{ip.denied}</td><td>{new Date(ip.last_seen).toLocaleString("pt-BR")}</td></tr>)}</tbody></table></div>}
  </div>;
}