import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from '@tanstack/react-router';
import { Check, Copy, ExternalLink, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { connectedToolGuide, connectedToolGuides, type ConnectedTool } from '@/lib/connected-tool-guides';
import toolIcons from '@/assets/nexa-tool-icons.webp.asset.json';
import logo from '@/assets/nexa-logo-white.png.asset.json';
import { useLang } from '@/lib/i18n';

export function ConnectedToolsIllustration() {
  const { lang } = useLang();
  const english = lang === 'en';
  const [selected, setSelected] = useState<ConnectedTool | null>(null);
  const [windows, setWindows] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  useEffect(() => { setWindows(/Windows/i.test(navigator.userAgent)); }, []);
  const guide = selected ? connectedToolGuide(selected, windows, english) : null;
  async function copy() {
    if (!guide) return;
    try { await navigator.clipboard.writeText(guide.code); setCopied(true); setCopyError(false); }
    catch { setCopyError(true); }
  }
  return <>
    <div className={`gateway-connected-tools-image gateway-tools-map${selected ? ' is-paused' : ''}`}>
      <div className="gateway-tools-orbit">
        <svg className="gateway-tools-connections" viewBox="0 0 100 100" aria-hidden="true">{connectedToolGuides.map(tool => <line key={tool.id} x1="50" y1="50" x2={50 + (tool.x - 51.4) * .87} y2={50 + (tool.y - 49.8) * .87} />)}</svg>
        <TooltipProvider delayDuration={150}>{connectedToolGuides.map((tool, index) => <div key={tool.id} className="gateway-tool-anchor" style={{ '--tool-x': `${50 + (tool.x - 51.4) * .87}%`, '--tool-y': `${50 + (tool.y - 49.8) * .87}%`, '--tool-size': `${tool.size * .87}%` } as CSSProperties}><Tooltip>
          <TooltipTrigger asChild><Button variant="ghost" className="gateway-tool-hotspot" aria-label={`${english ? 'Configure' : 'Configurar'} ${tool.name}`} onClick={() => { setSelected(tool); setCopied(false); setCopyError(false); }}><span className="gateway-tool-sprite" aria-hidden="true" style={{ backgroundImage: `url(${toolIcons.url})`, backgroundPosition: `${index % 6 * 20}% ${Math.floor(index / 6) / 3 * 100}%` }} /></Button></TooltipTrigger>
          <TooltipContent>{tool.name}</TooltipContent>
        </Tooltip></div>)}</TooltipProvider>
      </div>
      <div className="gateway-tools-center"><img src={logo.url} alt="NEXA CLOUD" width={64} height={64} /></div>
    </div>
    <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}>
      <DialogContent className="gateway-tool-dialog">
        {selected && guide && <>
          <header className="gateway-tool-dialog-header"><span className="gateway-tool-dialog-icon"><Terminal size={18} /></span><div><DialogTitle>{selected.name}</DialogTitle><DialogDescription>{guide.description}</DialogDescription></div></header>
          <div className="gateway-tool-dialog-body">
            <div className="gateway-tool-instructions"><div className="gateway-tool-system" aria-label={english ? 'Operating system' : 'Sistema operacional'}><Button variant="ghost" aria-pressed={windows} onClick={() => { setWindows(true); setCopied(false); }}>Windows</Button><Button variant="ghost" aria-pressed={!windows} onClick={() => { setWindows(false); setCopied(false); }}>macOS / Linux</Button></div><ol>{guide.steps.map((step, i) => <li key={i}><span>{i + 1}</span><p>{step}</p></li>)}</ol><p className="gateway-tool-caveat">{guide.caveat}</p></div>
            <div className="gateway-tool-config"><div className="gateway-tool-config-bar"><span>{guide.label}</span><Button variant="outline" size="sm" onClick={() => void copy()}>{copied ? <Check /> : <Copy />}{copied ? (english ? 'Copied' : 'Copiado') : (english ? 'Copy' : 'Copiar')}</Button></div><pre>{guide.code}</pre>{copyError && <p role="alert">{english ? 'Select the configuration and copy it manually.' : 'Selecione a configuração e copie manualmente.'}</p>}</div>
          </div>
          <footer className="gateway-tool-dialog-footer"><span>{english ? 'Your key is available in your NEXA dashboard.' : 'Sua chave está disponível no painel NEXA.'}</span><Button variant="outline" asChild><Link to="/minha-chave">{english ? 'My key' : 'Minha chave'}<ExternalLink /></Link></Button></footer>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}