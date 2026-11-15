import { useEffect, useState } from 'react';
import { Check, Copy, Download, Info, MonitorDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const APP_DOWNLOAD_URL = 'https://hmavtysevfyvicfahbzq.supabase.co/storage/v1/object/public/downloads/Nexa-Claude-Setup.exe';

export function WindowsAppCard({ apiKey }: { apiKey?: string | undefined }) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch(APP_DOWNLOAD_URL, { method: 'HEAD' }).then(r => alive && setAvailable(r.ok)).catch(() => alive && setAvailable(false));
    return () => { alive = false; };
  }, []);
  async function copyKey() {
    if (!apiKey) return;
    try { await navigator.clipboard.writeText(apiKey); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  }
  return (
    <section id="baixar-app-windows" className="client-section"><div className="client-panel" style={{ borderColor: 'var(--orange)' }}>
      <div className="client-section-heading"><div><h2>Baixar o app para Windows</h2><p>Conecte sua chave NEXA ao Claude, Claude Code ou Codex em poucos cliques</p></div><MonitorDown size={20} style={{ color: 'var(--orange)' }} /></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: '12px 0' }}>
        {available ? <Button asChild size="lg" style={{ background: 'var(--orange)', color: 'var(--paper)' }}><a href={APP_DOWNLOAD_URL} download><Download />Baixar Nexa Claude para Windows</a></Button>
          : <Button size="lg" disabled><Download />{available === null ? 'Verificando…' : 'Em breve'}</Button>}
        <Button size="lg" variant="outline" disabled={!apiKey} onClick={() => void copyKey()}>{copied ? <Check /> : <Copy />}{copied ? 'Copiada' : 'Copiar minha chave'}</Button>
      </div>
      <ol style={{ display: 'grid', gap: 4, margin: '8px 0', paddingLeft: 0, listStyle: 'none' }}>
        <li>1. Baixe e abra o instalador</li>
        <li>2. Cole a sua chave sk-nx-… quando o app pedir</li>
        <li>3. Escolha onde usar (Claude, Claude Code ou Codex) e clique em conectar</li>
      </ol>
      <p className="client-plan-note" style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}><Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />Se o Windows mostrar "O Windows protegeu seu computador", clique em Mais informações e depois em Executar assim mesmo. Isso acontece porque o app é novo.</p>
    </div></section>
  );
}
