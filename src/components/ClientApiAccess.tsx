import { useState } from 'react';
import { BookOpen, Check, Copy, KeyRound, PlugZap, Rocket, Terminal } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

type Shell = 'powershell' | 'bash';

function shellLines(shell: Shell, base: string, model?: string) {
  const set = shell === 'powershell'
    ? [`$env:ANTHROPIC_BASE_URL = "${base}"`, `$env:ANTHROPIC_AUTH_TOKEN = "SUA_CHAVE_NEXA"`]
    : [`export ANTHROPIC_BASE_URL="${base}"`, `export ANTHROPIC_AUTH_TOKEN="SUA_CHAVE_NEXA"`];
  return [...set, 'claude', ...(model ? ['', `/model ${model}`] : [])];
}

export function ClientApiAccess({ base, activeCount, commandModel, copied, onCopy }: { base: string; activeCount: number; commandModel?: string | undefined; copied: string; onCopy: (value: string, id: string) => void }) {
  const [shell, setShell] = useState<Shell>('powershell');
  const lines = shellLines(shell, base, commandModel);
  const script = lines.join('\n');
  const endpoints = [
    { id: 'base', icon: Terminal, title: 'Claude Code', tag: 'Anthropic', text: 'Para Claude Code e ferramentas compatíveis com a API da Anthropic.', url: base },
    { id: 'openbase', icon: PlugZap, title: 'OpenCode', tag: 'OpenAI', text: 'Para OpenCode, Cursor, Cline e qualquer cliente compatível com OpenAI.', url: `${base}/v1` },
  ];
  return <div className="client-api">
    <div className="client-api-status">
      <span className={`client-api-dot${activeCount ? ' is-on' : ''}`} aria-hidden />
      <strong>{activeCount ? 'Disponível' : 'Aguardando plano ativo'}</strong>
      <span>{activeCount} {activeCount === 1 ? 'chave ativa' : 'chaves ativas'}</span>
      <span className="client-api-status-note">Compatível com Anthropic Messages e OpenAI Chat Completions</span>
    </div>

    <div className="client-api-endpoints">
      {endpoints.map(e => <article key={e.id}>
        <header><span className="client-api-icon"><e.icon size={18} /></span><div><h3>{e.title}</h3><p>{e.text}</p></div><span className="client-api-tag">{e.tag}</span></header>
        <div className="client-api-url"><small>BASE URL</small><code title={e.url}>{e.url}</code><Button size="sm" variant="outline" aria-label={`Copiar URL ${e.title}`} onClick={() => onCopy(e.url, e.id)}>{copied === e.id ? <Check /> : <Copy />}{copied === e.id ? 'Copiado' : 'Copiar'}</Button></div>
      </article>)}
    </div>

    <ol className="client-api-steps">
      <li><span>1</span><div><KeyRound size={15} /><strong>Copie sua chave</strong><small>Na aba Chaves de API.</small></div></li>
      <li><span>2</span><div><Terminal size={15} /><strong>Configure o terminal</strong><small>Cole os comandos abaixo.</small></div></li>
      <li><span>3</span><div><Rocket size={15} /><strong>Escolha o modelo</strong><small>Use /model dentro do Claude Code.</small></div></li>
    </ol>

    <div className="client-api-terminal">
      <div className="client-terminal-bar">
        <span className="client-terminal-dots" aria-hidden><i /><i /><i /></span>
        <div className="client-terminal-tabs" role="tablist" aria-label="Sistema">
          <button type="button" role="tab" aria-selected={shell === 'powershell'} className={shell === 'powershell' ? 'is-active' : ''} onClick={() => setShell('powershell')}>Windows · PowerShell</button>
          <button type="button" role="tab" aria-selected={shell === 'bash'} className={shell === 'bash' ? 'is-active' : ''} onClick={() => setShell('bash')}>macOS · Linux</button>
        </div>
        <button type="button" className="client-terminal-copy" onClick={() => onCopy(script, 'commands')}>{copied === 'commands' ? <Check size={14} /> : <Copy size={14} />}{copied === 'commands' ? 'Copiado' : 'Copiar comandos'}</button>
      </div>
      <pre className="client-terminal-body">{lines.map((line, i) => <div key={i} className={line.startsWith('/model') ? 'is-model' : line === 'claude' ? 'is-run' : ''}>{line ? <><span className="client-terminal-prompt" aria-hidden>{line.startsWith('/') ? '›' : '$'}</span>{line}</> : '\u00a0'}</div>)}</pre>
    </div>

    <div className="client-api-footer">
      <span>{commandModel ? <>Modelo sugerido: <code>{commandModel}</code></> : 'Nenhum modelo disponível para esta chave.'}</span>
      <Button variant="link" size="sm" asChild><Link to="/docs"><BookOpen />Ver documentação completa</Link></Button>
    </div>
  </div>;
}
