import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, Copy, Gauge, KeyRound, ListTree, Plug, Server, Terminal, TriangleAlert, Wrench, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/nexus/nexa-logo.png.asset.json";

export const Route = createFileRoute("/docs")({
  head: () => ({ meta: [
    { title: "Documentação — NEXA CLOUD" },
    { name: "description", content: "Configure Claude Code, OpenCode ou Codex com sua chave NEXA: endpoints, Responses API, modelos e exemplos." },
    { property: "og:title", content: "Documentação — NEXA CLOUD" },
    { property: "og:description", content: "Configure Claude Code, OpenCode e Codex com a API NEXA CLOUD e consulte exemplos de integração." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: DocsPage,
});

const WHATSAPP = "https://chat.whatsapp.com/EVdOAcdCyRlBQKfA0PkK9O?s=cl&p=a&iam=2";
const BASE_CLAUDE = "https://api.cloudnexa.com.br";
const BASE_OPENAI = "https://api.cloudnexa.com.br/v1";

type SnippetKey = "claude" | "opencode" | "api";
const SNIPPETS: Record<SnippetKey, { label: string; code: string }> = {
  claude: { label: "PowerShell — Claude Code", code:
`$env:ANTHROPIC_BASE_URL = "${BASE_CLAUDE}"
$env:ANTHROPIC_AUTH_TOKEN = "SUA_CHAVE_sk-nx"
claude` },
  opencode: { label: "opencode.json — OpenCode", code:
`{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "nexa": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "NEXA API",
      "options": {
        "baseURL": "${BASE_OPENAI}",
        "apiKey": "{env:NEXA_API_KEY}"
      },
      "models": {
        "claude-sonnet-5-5": { "name": "claude-sonnet-5-5" }
      }
    }
  }
}` },
  api: { label: "curl — API direta", code:
`curl ${BASE_OPENAI}/chat/completions \\
  -H "Authorization: Bearer SUA_CHAVE_sk-nx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-sonnet-5-5",
    "messages": [{ "role": "user", "content": "Olá!" }]
  }'` },
};

const SECTIONS = [
  { id: "inicio", label: "Início" },
  { id: "primeiros-passos", label: "Primeiros passos" },
  { id: "teste-rapido", label: "Teste rápido" },
  { id: "modelos", label: "Modelos" },
  { id: "endpoints", label: "Endpoints" },
  { id: "claude-code", label: "Claude Code" },
  { id: "opencode", label: "OpenCode" },
  { id: "codex", label: "Codex" },
  { id: "erros", label: "Erros comuns" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return <button type="button" className={`docs-copy${copied ? " is-copied" : ""}`} onClick={() => {
    void navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {});
  }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "Copiado" : "Copiar"}</button>;
}

function CodeBlock({ label, code, prompt = false }: { label: string; code: string; prompt?: boolean }) {
  const lines = code.split("\n");
  return <div className="docs-code">
    <div className="docs-code-head"><span>{label}</span><CopyButton text={code} /></div>
    <pre>{prompt ? lines.map((line, i) => <span key={i}>{i > 0 ? "\n" : ""}<i aria-hidden="true">{">"}</i>{line}</span>) : code}</pre>
  </div>;
}

function DocsPage() {
  const [tab, setTab] = useState<SnippetKey>("claude");
  const [active, setActive] = useState<string>("inicio");
  const snippet = SNIPPETS[tab];

  // Acende no sumário a seção visível durante a rolagem.
  useEffect(() => {
    const onScroll = () => {
      let current = SECTIONS[0]?.id ?? "inicio";
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.35) current = s.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return <div id="topo" className="gateway-home docs-page">
    <header className="site-header docs-header"><div className="wide header-inner">
      <Link to="/" className="brand"><img src={logo.url} alt="" /><span>NEXA <em>CLOUD</em></span></Link>
      <nav aria-label="Navegação principal">
        <Link to="/status" className="status-nav-link">Status</Link>
        <Button asChild className="gateway-button"><Link to="/"><ArrowLeft size={15} />Voltar ao site</Link></Button>
      </nav>
    </div></header>

    <main className="wide docs-layout">
      <aside className="docs-side" aria-label="Sumário">
        <small>DOCUMENTAÇÃO</small>
        {SECTIONS.map(s => <a key={s.id} href={`#${s.id}`} className={active === s.id ? "is-active" : ""} aria-current={active === s.id ? "true" : undefined}>{s.label}</a>)}
      </aside>

      <div className="docs-main">
        <section id="inicio" className="docs-hero">
          <p className="eyebrow"><BookOpen size={15} />DOCUMENTAÇÃO NEXA</p>
          <h1>Configure em <em>2 minutos.</em></h1>
          <p>Com a sua chave NEXA você conecta o Claude Code, o OpenCode ou qualquer app compatível com a API da OpenAI ou da Anthropic. Sem instalação complicada: aponte a URL base, cole a chave e pronto.</p>
          <div className="docs-tabs" role="tablist">
            <button type="button" className={tab === "claude" ? "is-active" : ""} onClick={() => setTab("claude")}><Terminal size={13} />Claude Code</button>
            <button type="button" className={tab === "opencode" ? "is-active" : ""} onClick={() => setTab("opencode")}><Wrench size={13} />OpenCode</button>
            <button type="button" className={tab === "api" ? "is-active" : ""} onClick={() => setTab("api")}><Plug size={13} />API direta</button>
          </div>
          <CodeBlock label={snippet.label} code={snippet.code} />
        </section>

        <section id="primeiros-passos" className="docs-card">
          <h2><Zap size={17} />Primeiros passos</h2>
          <p className="docs-sub">Do pagamento à primeira resposta em quatro passos.</p>
          <div className="docs-steps">
            <div className="docs-step"><i aria-hidden="true" /><div>
              <b>Escolha um plano e pague via PIX</b>
              <p>Na página inicial, escolha um pacote de tokens ou um plano por período. Assim que o pagamento é aprovado, a sua chave <code className="inline">sk-nx-…</code> é gerada automaticamente.</p>
              <Link to="/" className="docs-step-btn">Escolher plano <ArrowRight size={14} /></Link>
            </div></div>
            <div className="docs-step"><i aria-hidden="true" /><div>
              <b>Copie a sua chave</b>
              <p>A chave aparece na tela após a aprovação e fica sempre disponível no painel Minha chave. Guarde-a em local seguro — ela é o seu acesso.</p>
              <Link to="/minha-chave" className="docs-step-btn">Abrir o painel <ArrowRight size={14} /></Link>
            </div></div>
            <div className="docs-step"><i aria-hidden="true" /><div>
              <b>Configure de forma permanente</b>
              <p>O setx grava as variáveis no seu usuário. Feche e abra o terminal depois — o terminal aberto não enxerga a mudança.</p>
              <CodeBlock label="PowerShell" prompt code={`setx ANTHROPIC_BASE_URL "${BASE_CLAUDE}"\nsetx ANTHROPIC_API_KEY "sk-nx-SUA_CHAVE"`} />
            </div></div>
            <div className="docs-step"><i aria-hidden="true" /><div>
              <b>Teste e comece a usar</b>
              <p>O primeiro comando responde uma linha e sai — se aparecer "oi", está tudo certo. O segundo abre o Claude Code na pasta do seu projeto. Na primeira vez ele pergunta se quer usar a chave do ambiente: responda Yes.</p>
              <CodeBlock label="Teste rápido" prompt code={'claude -p "responda só: oi"'} />
              <CodeBlock label="Abrir no projeto" prompt code={"cd $HOME\\projeto\nclaude --model claude-opus-5.5"} />
              <div className="docs-note docs-warn"><TriangleAlert size={15} /><span>Já fez login antes com uma conta da Anthropic? Rode <code className="inline">/logout</code> dentro do Claude Code, saia e abra de novo — senão ele ignora a chave do ambiente.</span></div>
            </div></div>
          </div>
        </section>

        <section id="teste-rapido" className="docs-card">
          <h2><Gauge size={17} />Teste rápido</h2>
          <p className="docs-sub">Confirme em segundos que a sua chave está ativa, direto do terminal.</p>
          <CodeBlock label="curl — teste de conexão" code={SNIPPETS.api.code} />
          <div className="docs-note"><Check size={15} /><span>Se a resposta trouxer um texto do modelo, está tudo certo. Se vier erro, confira a tabela de <a href="#erros">erros comuns</a> abaixo.</span></div>
        </section>

        <section id="modelos" className="docs-card">
          <h2><ListTree size={17} />Modelos</h2>
          <p className="docs-sub">Família Claude disponível no gateway. Use o nome exato no parâmetro <code className="inline">model</code>.</p>
          <table className="docs-table">
            <thead><tr><th>Modelo</th><th>Perfil</th><th>Indicado para</th></tr></thead>
            <tbody>
              <tr><td><code>claude-opus-5-5</code></td><td>Padrão</td><td>Projetos complexos, refatorações grandes e raciocínio profundo</td></tr>
              <tr><td><code>claude-fable-5-1</code></td><td>Criativo</td><td>Escrita, ideias e geração de conteúdo</td></tr>
              <tr><td><code>claude-sonnet-5-5</code></td><td>Rápido</td><td>Tarefas do dia a dia com resposta ágil</td></tr>
            </tbody>
          </table>
        </section>

        <section id="endpoints" className="docs-card">
          <h2><Server size={17} />Endpoints</h2>
          <p className="docs-sub">O gateway fala os dois protocolos: Anthropic (Claude Code) e OpenAI (OpenCode e apps em geral).</p>
          <table className="docs-table">
            <thead><tr><th>Método</th><th>Caminho</th><th>Protocolo</th></tr></thead>
            <tbody>
              <tr><td><span className="docs-tag post">POST</span></td><td><code>{BASE_CLAUDE}/v1/messages</code></td><td>Anthropic — usado pelo Claude Code</td></tr>
              <tr><td><span className="docs-tag post">POST</span></td><td><code>{BASE_OPENAI}/chat/completions</code></td><td>OpenAI — usado pelo OpenCode e apps compatíveis</td></tr>
              <tr><td><span className="docs-tag post">POST</span></td><td><code>{BASE_OPENAI}/responses</code></td><td>OpenAI Responses — usado pelo Codex</td></tr>
              <tr><td><span className="docs-tag get">GET</span></td><td><code>{BASE_OPENAI}/models</code></td><td>Lista os modelos disponíveis</td></tr>
            </tbody>
          </table>
          <div className="docs-note"><KeyRound size={15} /><span>Autenticação sempre com o cabeçalho <code className="inline">Authorization: Bearer SUA_CHAVE</code> (protocolo OpenAI) ou <code className="inline">x-api-key</code> / variável <code className="inline">ANTHROPIC_AUTH_TOKEN</code> (protocolo Anthropic).</span></div>
        </section>

        <section id="claude-code" className="docs-card">
          <h2><Terminal size={17} />Claude Code</h2>
          <p className="docs-sub">O terminal oficial da Anthropic, apontado para o gateway NEXA. No PowerShell, na pasta do projeto:</p>
          <CodeBlock label="PowerShell" code={SNIPPETS.claude.code} />
          <p className="docs-muted" style={{ marginTop: 12 }}>Dentro dele, rode <code className="inline">/model</code> e escolha o modelo, por exemplo <code className="inline">claude-sonnet-5-5</code>. Use sempre na mesma janela do PowerShell em que definiu as duas variáveis.</p>
        </section>

        <section id="opencode" className="docs-card">
          <h2><Wrench size={17} />OpenCode</h2>
          <p className="docs-sub">Instale, crie o arquivo de configuração na pasta do projeto e selecione o provedor NEXA.</p>
          <CodeBlock label="Instalação (PowerShell)" code={`npm install -g --allow-scripts=opencode-ai opencode-ai\n$env:NEXA_API_KEY = "SUA_CHAVE_sk-nx"`} />
          <div style={{ height: 12 }} />
          <CodeBlock label="opencode.json" code={SNIPPETS.opencode.code} />
          <p className="docs-muted" style={{ marginTop: 12 }}>Abra o OpenCode com <code className="inline">opencode</code>, rode <code className="inline">/models</code> e selecione <b>NEXA API → claude-sonnet-5-5</b>.</p>
        </section>

        <section id="codex" className="docs-card">
          <h2><Terminal size={17} />Codex</h2>
          <p className="docs-sub">Configuração do OpenAI Codex CLI/app com a Responses API da NEXA.</p>
          <CodeBlock label="config.toml — Codex" code={`model = "claude-sonnet-5-5"
model_provider = "nexa"

[model_providers.nexa]
name = "NEXA"
base_url = "${BASE_OPENAI}"
experimental_bearer_token = "SUA_CHAVE_sk-nx"
wire_api = "responses"`} />
        </section>

        <section id="erros" className="docs-card">
          <h2><TriangleAlert size={17} />Erros comuns</h2>
          <p className="docs-sub">Os códigos que o gateway pode devolver e o que fazer em cada caso.</p>
          <table className="docs-table">
            <thead><tr><th>Código</th><th>Motivo</th><th>Como resolver</th></tr></thead>
            <tbody>
              <tr><td><code>401</code></td><td>Chave inválida ou ausente</td><td>Confira se copiou a chave completa, começando com <code className="inline">sk-nx-</code></td></tr>
              <tr><td><code>403</code></td><td>Chave bloqueada ou limite de dispositivos</td><td>O acesso é individual: até 2 dispositivos. Fale com o suporte se o uso for legítimo</td></tr>
              <tr><td><code>429</code></td><td>Limite de pedidos por minuto</td><td>Aguarde alguns segundos e tente de novo — o gateway tenta outro fornecedor automaticamente</td></tr>
              <tr><td><code>524</code></td><td>O fornecedor demorou demais para responder</td><td>Repita o pedido; o gateway alterna para um fornecedor disponível</td></tr>
            </tbody>
          </table>
          <div className="docs-note"><TriangleAlert size={15} /><span>A chave é pessoal e intransferível. Compartilhar, revender ou usar em mais de 2 dispositivos gera bloqueio automático, conforme os <Link to="/termos">Termos de uso</Link>.</span></div>
        </section>

        <section className="docs-cta">
          <h2>Seu próximo commit começa aqui.</h2>
          <p>Escolha um plano, cole a chave no Claude Code ou no OpenCode e continue programando.</p>
          <div className="docs-actions">
            <Button asChild className="gateway-button"><Link to="/">Ver planos <ArrowRight size={15} /></Link></Button>
            <Button asChild variant="outline"><a href={WHATSAPP} target="_blank" rel="noopener noreferrer">Falar com o suporte <ArrowUpRight size={14} /></a></Button>
          </div>
        </section>
      </div>
    </main>

    <footer className="legal-footer"><div className="wide legal-footer-inner">
      <Link to="/" className="brand"><img src={logo.url} alt="" /><span>NEXA <em>CLOUD</em></span></Link>
      <p>© 2026 NEXA CLOUD. Todos os direitos reservados.</p>
      <nav aria-label="Rodapé"><Link to="/termos">Termos</Link><Link to="/reembolso">Reembolso</Link><Link to="/status">Status</Link><a href="#topo">Voltar ao topo</a></nav>
    </div></footer>
  </div>;
}
