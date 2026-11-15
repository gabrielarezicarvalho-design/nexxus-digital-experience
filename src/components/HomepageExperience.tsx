import { useState } from 'react';
import { ArrowRight, CalendarX, Check, ChevronDown, ChevronRight, Clock, Code2, Copy, CreditCard, Diamond, Eye, Globe, GraduationCap, Headset, KeyRound, Layers, Lightbulb, Link2, Mic, Minus, Monitor, PenLine, ShieldCheck, Sparkles, Store, Terminal, User, X, Zap, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLang } from '@/lib/i18n';
import logo from '@/assets/nexus/nexa-logo.png.asset.json';
import mascot from '@/assets/claude-mascote.gif.asset.json';
import greetingLogo from '@/assets/claude-greeting-logo.svg';
import gptIcon from '@/assets/gpt-icon.png.asset.json';
import { ConnectedToolsIllustration } from '@/components/ConnectedToolsIllustration';

export function GatewayConnectedTools() {
  const { lang } = useLang();
  return <section className="gateway-connected-tools" aria-labelledby="connected-tools-title">
    <div className="gateway-connected-tools-inner">
      <div className="gateway-connected-tools-copy">
        <p className="eyebrow">{lang === 'en' ? 'YOUR TOOLS. ONE CONNECTION.' : 'SUAS FERRAMENTAS. UMA CONEXÃO.'}</p>
        <h2 id="connected-tools-title">{lang === 'en' ? <>Use the tool<br />you already know.</> : <>Use na ferramenta<br />que você já conhece.</>}</h2>
        <p>{lang === 'en' ? 'These are some of the tools you can connect to NEXA CLOUD.' : 'Essas são algumas das ferramentas que você pode conectar à NEXA CLOUD.'}</p>
      </div>
      <ConnectedToolsIllustration />
    </div>
  </section>;
}

export function GatewayBenefits() {
  const { t } = useLang();
  return <section className="gateway-band"><div className="wide">
    <div className="gateway-heading"><div><p className="eyebrow">{t("UMA CONEXÃO. SEU PRÓXIMO PASSO.")}</p><h2>{t("Tudo conectado.")}<br />{t("Você no controle.")}</h2></div><p>{t("Seu projeto, seus modelos e seu jeito de trabalhar.")}<br />{t("Uma chave NEXA para conectar tudo.")}</p></div>
    <div className="gateway-provider-row"><span className="gateway-mini-brand"><img src={logo.url} alt="" />NEXA <b>CLOUD</b></span><span>Claude Code</span><span>OpenCode</span><span>VS Code</span><span>{t("API compatível")}</span><Button asChild className="gateway-button"><a href="#configuracao">{t("Conectar agora")} <ArrowRight /></a></Button></div>
    <div className="gateway-benefits">{[
      {icon:Layers,title:'Uma chave. Várias possibilidades.',text:'Acesse os modelos incluídos no seu plano e escolha o que combina com cada projeto.'},
      {icon:Code2,title:'O ritmo do seu trabalho.',text:'Tokens sem prazo ou acesso por período. Você escolhe como quer começar.'},
      {icon:ShieldCheck,title:'Uma conexão mais simples.',text:'Acompanhe suas chaves e o consumo na sua conta NEXA, em um só lugar.'},
      {icon:Zap,title:'Do pagamento ao projeto.',text:'O PIX aprovado libera sua chave automaticamente no painel do cliente.'},
      {icon:Globe,title:'No seu ambiente, sem complicar.',text:'Trabalhe no seu computador, na pasta do seu projeto, com ferramentas compatíveis.'},
      {icon:KeyRound,title:'Sua chave, seu acesso.',text:'Acesso pessoal e individual, com suporte em português quando precisar.'},
    ].map(item=><article key={item.title}><item.icon /><h3>{t(item.title)}</h3><p>{t(item.text)}</p></article>)}</div>
    <img className="gateway-section-mascot" src={mascot.url} alt="Mascote Claude" width={80} height={80} loading="lazy" />
  </div></section>;
}

export function GatewayEnvironments() {
  const { t } = useLang();
  return <section className="gateway-band gateway-environments"><div className="wide"><div><p className="eyebrow">{t("SEU FLUXO. SUA FERRAMENTA.")}</p><h2>{t("Seu ambiente.")}<br /><em>{t("Sua escolha.")}</em></h2><p>{t("Conecte sua chave e continue trabalhando")}<br />{t("onde suas ideias já acontecem.")}</p><a className="gateway-text-link" href="#configuracao">{t("Conectar à NEXA")} <ArrowRight size={14} /></a></div><div className="gateway-environment-list">{[{icon:Terminal,name:'Claude Code',note:'Terminal oficial'}, {icon:Code2,name:'OpenCode',note:'Seu código, seus modelos'}, {icon:Monitor,name:'VS Code',note:'Extensões compatíveis'}, {icon:Globe,name:'API / SDK',note:'OpenAI e Anthropic'}].map(item=><article key={item.name}><item.icon /><h3>{item.name}</h3><p>{t(item.note)}</p></article>)}</div></div></section>;
}

type CompareMark = 'yes' | 'partial' | 'no';

function CompareMarkIcon({ mark }: { mark: CompareMark }) {
  if (mark === 'yes') return <span className="gc-mark gc-yes" aria-label="Sim"><Check size={13} strokeWidth={3} /></span>;
  if (mark === 'partial') return <span className="gc-mark gc-partial" aria-label="Parcial"><Minus size={13} strokeWidth={3} /></span>;
  return <span className="gc-mark gc-no" aria-label="Não"><X size={13} strokeWidth={3} /></span>;
}

export function GatewayCompare() {
  const { t } = useLang();
  const cols: { icon: LucideIcon; name: string; featured?: boolean }[] = [
    { icon: Sparkles, name: 'NEXA', featured: true },
    { icon: Store, name: 'Concorrência' },
    { icon: CreditCard, name: 'Assinatura oficial' },
    { icon: Link2, name: 'API por token' },
  ];
  const rows: { icon: LucideIcon; label: string; marks: CompareMark[] }[] = [
    { icon: Clock, label: 'Sem janela de 5 horas', marks: ['yes', 'partial', 'no', 'yes'] },
    { icon: CalendarX, label: 'Sem teto semanal', marks: ['yes', 'partial', 'no', 'yes'] },
    { icon: Eye, label: 'Não usa modelo chinês por trás', marks: ['yes', 'no', 'yes', 'yes'] },
    { icon: KeyRound, label: 'Paga no PIX', marks: ['yes', 'yes', 'no', 'no'] },
    { icon: ShieldCheck, label: 'Garantia de 7 dias sem uso', marks: ['yes', 'no', 'partial', 'no'] },
    { icon: Headset, label: 'Suporte de qualidade', marks: ['yes', 'partial', 'no', 'no'] },
    { icon: Layers, label: 'Vários modelos num plano só', marks: ['yes', 'partial', 'no', 'no'] },
  ];
  return <section className="gateway-band gateway-compare"><div className="wide">
    <div className="gateway-centered-heading"><p className="eyebrow">{t("POR QUE A NEXA?")}</p><h2>{t("Compare a NEXA")}<br />{t("com o que você já usa.")}</h2><p>{t("Veja a NEXA lado a lado com os jeitos mais comuns de programar com IA.")}</p></div>
    <div className="gc-scroll"><div className="gc-table" role="table" aria-label={`${t("Compare a NEXA")} ${t("com o que você já usa.")}`}>
      <div className="gc-row gc-head" role="row">
        <span className="gc-cell gc-label" role="columnheader" />
        {cols.map(col => <span key={col.name} className={`gc-cell gc-col${col.featured ? ' gc-nexa gc-nexa-top' : ''}`} role="columnheader">{col.featured ? <img src={logo.url} alt="" aria-hidden="true" width={20} height={20} style={{ width: 20, height: 20, objectFit: 'contain' }} /> : <col.icon size={18} aria-hidden="true" />}<b>{col.name === 'NEXA' ? 'NEXA' : t(col.name)}</b></span>)}
      </div>
      {rows.map((row, i) => <div key={row.label} className={`gc-row${i === rows.length - 1 ? ' gc-last' : ''}`} role="row">
        <span className="gc-cell gc-label" role="rowheader"><row.icon size={15} aria-hidden="true" />{t(row.label)}</span>
        {row.marks.map((mark, j) => <span key={j} className={`gc-cell${cols[j]?.featured ? ` gc-nexa${i === rows.length - 1 ? ' gc-nexa-bottom' : ''}` : ''}`} role="cell"><CompareMarkIcon mark={mark} /></span>)}
      </div>)}
    </div></div>
    <p className="gc-note">{t("Assinatura oficial: preço público em dólar, out/2026. Concorrência: sem citar nomes.")}</p>
  </div></section>;
}

const base='https://api.cloudnexa.com.br';
export function GatewayAccessExplained() {
  const { t } = useLang();
  return <section className="gateway-band gateway-access" aria-labelledby="gateway-access-title"><div className="wide">
    <header className="gateway-access-heading">
      <span className="gateway-access-badge">{t('Sem pegadinha')}</span>
      <h2 id="gateway-access-title">{t('Por que é tão mais barato?')}</h2>
      <p>{t('A NEXA CLOUD conecta você aos modelos de IA por API. Você escolhe um pacote de tokens ou acesso por período e usa sua chave nas ferramentas compatíveis, sem contratar uma assinatura separada para cada ferramenta.')}</p>
    </header>
    <div className="gateway-access-flow" aria-label={t('Dos modelos ao seu projeto')}>
      <div className="gateway-access-node"><span className="gateway-access-icon gateway-access-icon--pair"><img src={greetingLogo} alt="" width={23} height={23} /><img src={gptIcon.url} alt="" width={23} height={23} /></span><h3>{t('Provedores')}</h3><p>{t('Anthropic · OpenAI')}</p></div>
      <span className="gateway-access-arrow" aria-hidden="true"><ChevronRight strokeWidth={1.5} /></span>
      <div className="gateway-access-node"><span className="gateway-access-icon gateway-access-brand"><img src={logo.url} alt="" width={32} height={32} /></span><h3>NEXA CLOUD</h3><p>{t('volume · créditos · cotas')}</p></div>
      <span className="gateway-access-arrow" aria-hidden="true"><ChevronRight strokeWidth={1.5} /></span>
      <div className="gateway-access-node"><span className="gateway-access-icon"><User /></span><h3>{t('Você')}</h3><p>{t('preço fixo por mês')}</p></div>
    </div>
    <div className="gateway-access-cards">
      <article><span className="gateway-access-card-icon"><Diamond /></span><h3>{t('E a qualidade?')}</h3><p>{t('A NEXA autentica sua chave e encaminha as chamadas ao provedor do modelo. A velocidade e a disponibilidade das respostas podem variar em horários de pico.')}</p></article>
      <article><span className="gateway-access-card-icon"><Monitor /></span><h3>{t('No seu ambiente de trabalho')}</h3><p>{t('Use sua chave no Claude Code, no OpenCode, em extensões compatíveis do VS Code ou em integrações por API. A mesma conexão acompanha o seu projeto.')}</p><div className="gateway-access-tools"><span><Terminal />Claude Code</span><span><Code2 />OpenCode</span><span><Monitor />VS Code</span><span><Globe />API</span></div></article>
    </div>
  </div></section>;
}

export function GatewayConfiguration() {
  const { t } = useLang();
  const [tool,setTool]=useState<'claude'|'opencode'>('claude');
  const [system,setSystem]=useState<'windows'|'mac'>('windows');
  const [copied,setCopied]=useState(false);
  const [error,setError]=useState('');
  const [step,setStep]=useState(0);
  const win=system==='windows';
  const install=tool==='claude' ? (win?'irm https://claude.ai/install.ps1 | iex':'curl -fsSL https://claude.ai/install.sh | bash') : 'npm install -g opencode-ai';
  const keyCmd=tool==='claude' ? (win?`$env:ANTHROPIC_BASE_URL = "${base}"\n$env:ANTHROPIC_AUTH_TOKEN = "SUA_CHAVE_NEXA"`:`export ANTHROPIC_BASE_URL="${base}"\nexport ANTHROPIC_AUTH_TOKEN="SUA_CHAVE_NEXA"`) : (win?'$env:NEXA_API_KEY = "SUA_CHAVE_NEXA"':'export NEXA_API_KEY="SUA_CHAVE_NEXA"');
  const connect=tool==='claude' ? `cd caminho/da/sua/pasta\nclaude\n/model claude-sonnet-5-5` : JSON.stringify({$schema:'https://opencode.ai/config.json',provider:{nexa:{npm:'@ai-sdk/openai-compatible',name:'NEXA API',options:{baseURL:`${base}/v1`,apiKey:'{env:NEXA_API_KEY}'},models:{'claude-sonnet-5-5':{name:'claude-sonnet-5-5'}}}}},null,2);
  const command=[install,keyCmd,connect][step] ?? install;
  const winLabel=step===2&&tool==='opencode'?'opencode.json':(win?'PowerShell':'Terminal');
  async function copy(){try{await navigator.clipboard.writeText(command);setCopied(true);setError('');setTimeout(()=>setCopied(false),2000);}catch{setError(t('Não foi possível copiar. Selecione o texto e copie manualmente.'));}}
  const steps=[{b:t("Prepare o ambiente"),s:`${t("Instale o")} ${tool==='claude'?'Claude Code':'OpenCode'} ${t("no computador.")}`},{b:t("Defina sua chave"),s:t("Use a chave disponível no seu painel.")},{b:t("Conecte seu projeto"),s:tool==='claude'?t('Abra o terminal na pasta do projeto.'):t('Salve o arquivo opencode.json.')}];
  return <div className="gateway-configuration"><div className="gateway-config-top"><span><Terminal size={14} /> {t("SUA CONEXÃO")}</span><div className="gateway-segment" aria-label="Ferramenta">{(['claude','opencode'] as const).map(t=><Button key={t} variant="ghost" aria-pressed={tool===t} onClick={()=>setTool(t)}>{t==='claude'?'Claude Code':'OpenCode'}</Button>)}</div></div><div className="gateway-config-body"><aside><div className="gateway-segment" aria-label="Sistema operacional"><Button variant="ghost" aria-pressed={system==='windows'} onClick={()=>setSystem('windows')}>Windows</Button><Button variant="ghost" aria-pressed={system==='mac'} onClick={()=>setSystem('mac')}>macOS / Linux</Button></div><ol>{steps.map((s,i)=><li key={i} role="button" tabIndex={0} aria-current={step===i?'step':undefined} className={step===i?'on':''} style={{cursor:'pointer'}} onClick={()=>setStep(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setStep(i);}}}><b>{s.b}</b><span>{s.s}</span></li>)}</ol><Button variant="outline" onClick={()=>void copy()}><Copy />{copied?t('Copiado'):t('Copiar configuração')}</Button></aside><div className="gateway-code-window"><div><span>{winLabel}</span><Button variant="ghost" size="icon" onClick={()=>void copy()} aria-label={t("Copiar código")} title={t("Copiar código")}>{copied?<Check />:<Copy />}</Button></div><pre>{command}</pre><footer><span>● NEXA CLOUD</span><span>{tool==='claude'?'claude-sonnet-5-5':'OpenAI compatible'}</span><Button variant="outline" className="gateway-config-next" onClick={()=>setStep(s=>Math.min(s+1,steps.length-1))} disabled={step>=steps.length-1}>{t("Próximo")}<ArrowRight size={13} /></Button></footer></div></div>{error&&<p role="alert">{error}</p>}</div>;
}

function ClassicTerminal() {
  const { t } = useLang();
  return <div className="gateway-hero-terminal" aria-label={t("Exemplo de sessão Claude Code")}><div className="gateway-terminal-title"><span className="gateway-window-dots"><i /><i /><i /></span><span>Claude Code / NEXA CLOUD</span></div><div className="gateway-terminal-welcome"><img src={mascot.url} alt="" width={50} height={50} /><div><strong>{t("Vamos criar algo incrível?")}</strong><span>claude-sonnet-5-5 · NEXA API</span></div></div><div className="gateway-terminal-lines"><p><span>❯</span> {t("Organize meu próximo projeto.")}</p><p className="gateway-terminal-success">✓ {t("Conexão com a NEXA estabelecida")}</p><p>● {t("Lendo os arquivos do projeto…")}</p><p>● {t("Preparando as alterações…")}</p><p className="gateway-terminal-success">✓ {t("Tudo pronto para começar.")}</p><p><span>❯</span> <span className="gateway-cursor">▍</span></p></div></div>;
}

export function GatewayTerminal() {
  return <ClassicTerminal />;
}
