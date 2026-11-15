import seloGarantia from "@/assets/selo-garantia-nexa.png.asset.json";
import workspace from "@/assets/nexa-workspace.jpg";
import { WhatsAppTestimonials } from '@/components/WhatsAppTestimonials';
import { GatewayAccessExplained, GatewayBenefits, GatewayCompare, GatewayEnvironments, GatewayConfiguration, GatewayTerminal, GatewayConnectedTools } from "@/components/HomepageExperience";
import { Button } from "@/components/ui/button";
import { Activity, ArrowRight, Code2, Globe, MessageCircle, ShieldCheck, Zap } from "lucide-react";
import { ProviderNotice } from "@/components/ProviderNotice";
import { SitePlans } from "@/components/SitePlans";
import { tokenOfferQuery } from "@/lib/promotion-query";
import { OpenCodeAssistant } from "@/components/OpenCodeAssistant";
import { FloatingAtendimento } from "@/components/FloatingAtendimento";
import { ClaudeCodeInstaller } from "@/components/ClaudeCodeInstaller";
import { Check, Clock, Mail, MessageSquare, Monitor, Sparkles, Terminal, User, Wallet } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useClientIdentity } from "@/components/client-auth-context";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSiteStats } from "@/lib/site-stats.functions";
import { successRate } from "@/lib/success-rate";
import iconAsset from "../assets/nexus/nexa-logo.png.asset.json";
import claudeMascote from "@/assets/claude-mascote.gif.asset.json";
import claudeEyesClosed from "@/assets/claude-eyes-closed.svg.asset.json";
import claudeEyesOpen from "@/assets/claude-eyes-open.svg.asset.json";
import { useLang } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ANALYTICS_CONSENT_KEY, setAnalyticsConsent } from '@/lib/site-analytics';

const icon = iconAsset.url;
export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(tokenOfferQuery),
  head: () => ({
    meta: [
      { title: "Nexa Cloud — Gateway de IA para seu projeto" },
      { name: "description", content: "Claude Code para editar seus projetos do Lovable direto do computador. Planos por tokens e ilimitados." },
      { property: "og:title", content: "Nexa Cloud — Gateway de IA para seu projeto" },
      { property: "og:description", content: "Escolha o plano, pague no PIX e receba sua chave para usar o Claude Code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const COMANDOS: Record<"win" | "unix", string> = {
  win: `1. Instale o OpenCode:
npm install -g --allow-scripts=opencode-ai opencode-ai

2. Configure sua API Key (no PowerShell):
$env:NEXA_API_KEY = "SUA_CHAVE_AQUI"

3. Entre na pasta do projeto:
cd "C:\\CAMINHO\\DO\\PROJETO"

4. Crie o opencode.json (notepad .\\opencode.json) e cole:
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "nexa": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "NEXA API",
      "options": {
        "baseURL": "https://www.cloudnexapro.site/api/public/v1",
        "apiKey": "{env:NEXA_API_KEY}"
      },
      "models": {
        "claude-sonnet-5-5": {
          "name": "claude-sonnet-5-5"
        }
      }
    }
  }
}

5. Abra o OpenCode com: opencode
6. Dentro dele, rode /models e selecione NEXA API → claude-sonnet-5-5

OU PREFERE O CLAUDE CODE (terminal oficial)? Sem opencode.json:
1. Entre na pasta do projeto:
cd "C:\\CAMINHO\\DO\\PROJETO"
2. No PowerShell, aponte para a ponte da NEXA:
$env:ANTHROPIC_BASE_URL = "https://cloudnexapro.site/api/public"
3. Defina sua chave:
$env:ANTHROPIC_AUTH_TOKEN = "SUA_CHAVE_AQUI"
4. Rode: claude
5. Dentro dele, rode /model e escolha claude-sonnet-5-5`,
  unix: `1. Instale o OpenCode:
npm install -g --allow-scripts=opencode-ai opencode-ai

2. Configure sua API Key (no Terminal):
export NEXA_API_KEY="SUA_CHAVE_AQUI"

3. Entre na pasta do projeto:
cd ~/CAMINHO/DO/PROJETO

4. Crie o opencode.json (nano opencode.json), cole, salve com Ctrl+O + Enter e feche com Ctrl+X:
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "nexa": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "NEXA API",
      "options": {
        "baseURL": "https://www.cloudnexapro.site/api/public/v1",
        "apiKey": "{env:NEXA_API_KEY}"
      },
      "models": {
        "claude-sonnet-5-5": {
          "name": "claude-sonnet-5-5"
        }
      }
    }
  }
}

5. Abra o OpenCode com: opencode
6. Dentro dele, rode /models e selecione NEXA API → claude-sonnet-5-5

OU PREFERE O CLAUDE CODE (terminal oficial)? Sem opencode.json:
1. Entre na pasta do projeto:
cd ~/CAMINHO/DO/PROJETO
2. No Terminal, aponte para a ponte da NEXA:
export ANTHROPIC_BASE_URL="https://cloudnexapro.site/api/public"
3. Defina sua chave:
export ANTHROPIC_AUTH_TOKEN="SUA_CHAVE_AQUI"
4. Rode: claude
5. Dentro dele, rode /model e escolha claude-sonnet-5-5`
};

function JsonConfig() {
  return <pre>{"{"}{"\n"}  "$schema": "https://opencode.ai/config.json",{"\n"}  "provider": {"{"}{"\n"}    "nexa": {"{"}{"\n"}      "npm": "@ai-sdk/openai-compatible",{"\n"}      "name": "NEXA API",{"\n"}      "options": {"{"}{"\n"}        "baseURL": "https://www.cloudnexapro.site/api/public/v1",{"\n"}        "apiKey": "{`{`}env:NEXA_API_KEY{"}"}"{"\n"}      {"}"},{"\n"}      "models": {"{"}{"\n"}        "claude-sonnet-5-5": {"{"}{"\n"}          "name": "claude-sonnet-5-5"{"\n"}        {"}"}{"\n"}      {"}"}{"\n"}    {"}"}{"\n"}  {"}"}{"\n"}{"}"}</pre>;
}

function CopiarComandos({ so }: { so: "win" | "unix" }) {
  const { t } = useLang();
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    const texto = COMANDOS[so];
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = texto;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };
  return <Button type="button" className="cc-copiar" onClick={copiar}>{copiado ? t("Comandos copiados ✓") : t("Copiar comandos")}</Button>;
}

function PassosWin() {
  const { t } = useLang();
  return <>
    <p>{t("1. Instale o OpenCode:")}</p>
    <pre>npm install -g --allow-scripts=opencode-ai opencode-ai</pre>
    <p>{t("2. Configure sua API Key (no PowerShell) — é a chave sk-nx-… que você copia em")} <b>{t("Já tenho chave")}</b> {t("depois do pagamento aprovado:")}</p>
    <pre>$env:NEXA_API_KEY = "SUA_CHAVE_AQUI"</pre>
    <p>{t("3. Entre na pasta do projeto:")}</p>
    <pre>cd "C:\CAMINHO\DO\PROJETO"</pre>
    <p>{t("4. Crie o arquivo de configuração — não cole o JSON direto no PowerShell. Execute")} <b>notepad .\opencode.json</b> {t("e cole no Bloco de Notas:")}</p>
    <JsonConfig />
    <p>{t("Salve o arquivo e feche o Bloco de Notas.")}</p>
    <p>{t("5. Abra o OpenCode com")} <b>opencode</b>. {t("6. Dentro dele, rode")} <b>/models</b> {t("e selecione")} <b>NEXA API → claude-sonnet-5-5</b>. {t("Pronto, é só usar.")}</p>
    <hr />
    <p><b>{t("Ou use o Claude Code")}</b>{t(", o terminal oficial da Anthropic — sem opencode.json. No PowerShell, na pasta do projeto:")}</p>
    <pre>$env:ANTHROPIC_BASE_URL = "https://cloudnexapro.site/api/public"</pre>
    <pre>$env:ANTHROPIC_AUTH_TOKEN = "SUA_CHAVE_AQUI"</pre>
    <pre>claude</pre>
    <p>{t("Dentro dele, rode")} <b>/model</b> {t("e escolha")} <b>claude-sonnet-5-5</b>. {t("Use sempre na mesma janela do PowerShell em que definiu as duas variáveis.")}</p>
  </>;
}

function PassosUnix() {
  const { t } = useLang();
  return <>
    <p>{t("1. Instale o OpenCode:")}</p>
    <pre>npm install -g --allow-scripts=opencode-ai opencode-ai</pre>
    <p>{t("2. Configure sua API Key (no Terminal) — é a chave sk-nx-… que você copia em")} <b>{t("Já tenho chave")}</b> {t("depois do pagamento aprovado:")}</p>
    <pre>export NEXA_API_KEY="SUA_CHAVE_AQUI"</pre>
    <p>{t("3. Entre na pasta do projeto:")}</p>
    <pre>cd ~/CAMINHO/DO/PROJETO</pre>
    <p>{t("4. Crie o arquivo de configuração com um editor de texto. No Terminal, rode")} <b>nano opencode.json</b>{t(", cole o conteúdo abaixo, salve com")} <b>Ctrl+O</b> {t("e feche com")} <b>Ctrl+X</b>:</p>
    <JsonConfig />
    <p>{t("5. Abra o OpenCode com")} <b>opencode</b>. {t("6. Dentro dele, rode")} <b>/models</b> {t("e selecione")} <b>NEXA API → claude-sonnet-5-5</b>. {t("Pronto, é só usar.")}</p>
    <hr />
    <p><b>{t("Ou use o Claude Code")}</b>{t(", o terminal oficial da Anthropic — sem opencode.json. No Terminal, na pasta do projeto:")}</p>
    <pre>export ANTHROPIC_BASE_URL="https://cloudnexapro.site/api/public"</pre>
    <pre>export ANTHROPIC_AUTH_TOKEN="SUA_CHAVE_AQUI"</pre>
    <pre>claude</pre>
    <p>{t("Dentro dele, rode")} <b>/model</b> {t("e escolha")} <b>claude-sonnet-5-5</b>. {t("Use sempre na mesma janela do Terminal em que definiu as duas variáveis.")}</p>
  </>;
}

function PassosConexao() {
  const [so, setSo] = useState<"win" | "unix">("win");
  useEffect(() => {
    if (!/Win(dows|32|64)|Android/i.test(navigator.userAgent)) setSo("unix");
  }, []);
  return <div className="cc-abas">
    <div className="gateway-segment" aria-label="Sistema operacional">
      <Button variant="ghost" aria-pressed={so === "win"} onClick={() => setSo("win")}>Windows</Button>
      <Button variant="ghost" aria-pressed={so === "unix"} onClick={() => setSo("unix")}>macOS / Linux</Button>
    </div>
    <CopiarComandos so={so} />
    <div className="cc-abas-corpo">
      {so === "win" ? <PassosWin /> : <PassosUnix />}
    </div>
  </div>;
}

function useCurta() {
  const [curta, setCurta] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 400px)");
    const on = () => setCurta(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return curta;
}

function Header({ onPlanos }: { onPlanos: (m: "essencial" | "ilimitado") => (e: { preventDefault: () => void }) => void }) {
  const { user } = useClientIdentity();
  const curta = useCurta();
  const { t } = useLang();
  return <header className="site-header"><div className="wide header-inner"><a className="brand" href="/"><img src={icon} alt="" /> <b>NEXA <em>CLOUD</em></b></a><nav><LanguageToggle />{user ? <Link className="wa-account header-account" to="/minha-chave">{curta ? t("PAINEL") : t("MEU PAINEL")}</Link> : <Link className="wa-account header-account" to="/entrar">{t("ENTRAR")}</Link>}<a className="dark-button" href="#essencial" onClick={onPlanos("essencial")}>{curta ? t("PLANOS") : t("VER PLANOS")}</a></nav></div></header>;
}

function ClaudeWalker() {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const bodyRef = useRef<HTMLSpanElement>(null);
  const openRef = useRef<HTMLImageElement>(null);
  const closedRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const body = bodyRef.current;
    const open = openRef.current;
    const closed = closedRef.current;
    if (!wrap || !body || !open || !closed) return;
    const random = (min: number, max: number) => min + Math.random() * (max - min);
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    const state = {
      x: window.innerWidth / 2,
      y: window.innerHeight * 0.65,
      targetX: window.innerWidth / 2,
      targetY: window.innerHeight * 0.65,
      fromX: 0, fromY: 0, toX: 0, toY: 0,
      hopStart: 0, hopDuration: 180, hopArc: 28,
      facing: 1, mode: "idle", idleUntil: 0, blinkUntil: 0,
      hops: 0, hovered: false, pressedUntil: 0,
    };
    let frame = 0;

    const chooseTarget = () => {
      const width = window.innerWidth <= 700 ? 58 : 68;
      const height = window.innerWidth <= 700 ? 48 : 56;
      let x = state.x;
      let y = state.y;
      for (let tries = 0; tries < 10 && Math.hypot(x - state.x, y - state.y) < 180; tries += 1) {
        x = clamp(random(30, window.innerWidth - width - 30), 12, window.innerWidth - width - 12);
        y = clamp(random(95, window.innerHeight - height - 65), 76, window.innerHeight - height - 18);
      }
      state.targetX = x;
      state.targetY = y;
      state.hops = 0;
    };
    const beginHop = (now: number) => {
      const dx = state.targetX - state.x;
      const dy = state.targetY - state.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 6 || state.hops >= 10) {
        state.mode = "idle";
        state.idleUntil = now + 1000;
        state.blinkUntil = state.idleUntil + 180;
        return;
      }
      const amount = Math.min(distance, random(75, 115)) / distance;
      state.fromX = state.x;
      state.fromY = state.y;
      state.toX = state.x + dx * amount;
      state.toY = state.y + dy * amount;
      state.hopStart = now;
      state.hopDuration = 180;
      state.hopArc = random(22, 34);
      state.mode = "hop";
      state.hops += 1;
      if (Math.abs(dx) > 2) state.facing = dx > 0 ? 1 : -1;
    };
    const onEnter = () => { state.hovered = true; };
    const onLeave = () => { state.hovered = false; };
    const onPress = () => { state.pressedUntil = performance.now() + 360; };
    wrap.addEventListener("mouseenter", onEnter);
    wrap.addEventListener("mouseleave", onLeave);
    wrap.addEventListener("click", onPress);
    chooseTarget();

    const animate = (now: number) => {
      if (!state.hovered) {
        if (state.mode === "hop") {
          const progress = Math.min(1, (now - state.hopStart) / state.hopDuration);
          const eased = 1 - Math.pow(1 - progress, 2);
          state.x = state.fromX + (state.toX - state.fromX) * eased;
          state.y = state.fromY + (state.toY - state.fromY) * eased - Math.sin(Math.PI * progress) * state.hopArc;
          const squash = progress < 0.18 ? 0.82 + progress : progress > 0.82 ? 0.82 + (1 - progress) : 1.04;
          body.style.transform = `scaleX(${state.facing}) scaleY(${squash})`;
          if (progress >= 1) {
            state.x = state.toX;
            state.y = state.toY;
            beginHop(now);
          }
        } else if (now >= state.blinkUntil && state.blinkUntil > state.idleUntil) {
          open.style.opacity = "1";
          closed.style.opacity = "0";
          chooseTarget();
          beginHop(now);
        } else if (now >= state.idleUntil && state.idleUntil > 0) {
          open.style.opacity = "0";
          closed.style.opacity = "1";
          body.style.transform = `scaleX(${state.facing}) scaleY(${now < state.pressedUntil ? 0.72 : 1})`;
        } else if (state.idleUntil === 0) {
          beginHop(now);
        }
      }
      if (now < state.pressedUntil) body.style.transform = `scaleX(${state.facing}) scaleY(0.72)`;
      wrap.style.transform = `translate3d(${state.x}px, ${state.y}px, 0)`;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      wrap.removeEventListener("mouseenter", onEnter);
      wrap.removeEventListener("mouseleave", onLeave);
      wrap.removeEventListener("click", onPress);
    };
  }, []);

  return <span ref={wrapRef} className="claude-walker" aria-hidden="true">
    <span ref={bodyRef} className="claude-walker-body">
      <img ref={openRef} className="claude-face claude-face-open" src={claudeEyesOpen.url} alt="" />
      <img ref={closedRef} className="claude-face claude-face-closed" src={claudeEyesClosed.url} alt="" />
    </span>
  </span>;
}

const faqs: [string, string][] = [
  ["Funciona com o meu projeto do Lovable?", "Sim. O Claude Code trabalha no repositório do projeto no seu computador e envia as alterações normalmente."],
  ["Preciso saber programar?", "Não. Você pode dar os comandos em português, explicando o que quer mudar no projeto."],
  ["Tem limite de tokens?", "No Essencial, o limite é o pacote comprado e não há prazo. No ilimitado, não há conta de tokens durante o período."],
  ["É o Claude Code oficial mesmo ou é um clone?", "É o Claude Code oficial da Anthropic, instalado pelo instalador oficial. A NEXA fornece o acesso por API."],
  ["Quais modelos eu consigo usar?", "Opus 5.5, Opus 5, Fable 5.2, Fable 5.1, Sonnet 5.5 e Haiku 5.5."],
  ["Quando meu período começa e o que acontece quando acaba?", "O período começa na emissão da chave e não pausa. Ao terminar, a chave deixa de autenticar."],
  ["Meu código passa por vocês?", "As chamadas passam pela ponte da NEXA, que autentica a chave e repassa ao provedor."],
  ["Posso usar a chave em mais de um computador?", "A chave é individual e pode ser usada por uma pessoa."],
  ["Como eu pago e quando recebo a chave?", "Você pode pagar por PIX ou transferência Revolut em euro. A chave chega no e-mail assim que o pagamento é aprovado."],
  ["E se der problema?", "Fale com o suporte. Se a chave não chegar ou não autenticar, a equipe resolve ou orienta o reembolso."],
];

function LiveStats() {
  const { t, lang } = useLang();
  const locale = lang === "en" ? "en-US" : "pt-BR";
  const fmt = (n: number) => n.toLocaleString(locale);
  const stats = useQuery({ queryKey: ["site-live-stats"], queryFn: () => getSiteStats(), refetchInterval: 2000 });
  const models = useQuery({ queryKey: ["site-models-count"], queryFn: () => getSiteStats(), refetchInterval: 30000 });
  const s = stats.data;
  const total = (s?.promptTokens ?? 0) + (s?.completionTokens ?? 0);
  const rate = successRate(s?.callsToday ?? 0, s?.successToday ?? 0, s?.rateExcluded502Today ?? 0);
  const rateText = rate.toFixed(1).replace(".", locale === "pt-BR" ? "," : ".");
  return <section className="gateway-band gateway-offerings gateway-live"><div className="wide">
    <div className="gateway-live-head">
      <div><p className="eyebrow">{t("EM TEMPO REAL")}</p><h2>{t("Veja o NEXA CLOUD")}<br /><em>{t("em movimento.")}</em></h2></div>
      <span className="live-badge"><i aria-hidden="true" />{t("Atualização ao vivo · a cada 2 segundos")}</span>
    </div>
    <div className="gateway-offering-grid live-stats-grid">
      <article><span>{t("Tokens contabilizados")}</span><strong className="accent">{fmt(total)}</strong><p>{t("Entrada")} {fmt(s?.promptTokens ?? 0)} · {t("saída")} {fmt(s?.completionTokens ?? 0)}</p></article>
      <article><span>{t("Chamadas hoje")}</span><strong>{fmt(s?.callsToday ?? 0)}</strong><p>{t("Taxa de sucesso")} {rateText}%</p></article>
      <article><span>{t("Modelos no catálogo")}</span><strong>{fmt(models.data?.modelsEnabled ?? 0)}</strong><p>{t("Catálogo real · atualização a cada 30 segundos")}</p></article>
    </div>
  </div></section>;
}

function Index() {
  const { t } = useLang();
  const [cookies, setCookies] = useState(true);
  useEffect(() => { setCookies(localStorage.getItem(ANALYTICS_CONSENT_KEY) === null); }, []);
  const chooseCookies = (accepted: boolean) => { setAnalyticsConsent(accepted); setCookies(false); };
  const { user } = useClientIdentity();
  const irPara = (m: "essencial" | "ilimitado") => (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setTimeout(() => document.getElementById(m)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };
  return <div className="nexus-page gateway-home"><ProviderNotice /><Header onPlanos={irPara} /><main>
    <section className="gateway-hero"><img className="gateway-hero-photo" src={workspace} alt="Estação de trabalho com computador para desenvolver projetos" width={1920} height={1024} fetchPriority="high" /><div className="wide gateway-hero-inner"><div className="gateway-hero-copy"><p className="eyebrow">{t("SEU PRÓXIMO PASSO PASSA AQUI.")}</p><h1>NEXA CLOUD<span>{t("Gateway de IA.")}</span></h1><p className="lead">{t("Seu código. Suas ideias. Uma conexão que você controla. Claude Code e OpenCode, com a sua chave NEXA.")}</p><div className="gateway-hero-actions"><Button asChild className="gateway-button"><a href="#essencial" onClick={irPara("essencial")}>{t("Escolher meu plano")} <ArrowRight /></a></Button><Button asChild variant="outline" className="gateway-secondary"><Link to="/minha-chave"><User size={14} />{t("Já tenho chave")}</Link></Button></div><div className="gateway-hero-notes"><span><Check size={12} /> {t("Entrega após o PIX")}</span><span><ShieldCheck size={12} /> {t("Acesso individual")}</span></div></div><GatewayTerminal /></div></section>
    <div className="gateway-compatibility"><div className="wide"><small>{t("Uma conexão. O seu ambiente de trabalho.")}</small><div><span><Sparkles />Claude</span><span><Terminal />Claude Code</span><span><Code2 />OpenCode</span><span><Monitor />VS Code</span></div></div></div>
    <GatewayBenefits /><GatewayEnvironments />
    <section className="wide pricing-section" id="essencial"><div className="section-heading"><p className="eyebrow">{t("UM PLANO PARA CADA PRÓXIMO PASSO.")}</p><h2>{t("Qual é o tamanho da sua")}<br />{t("próxima ideia?")}</h2><p>{t("Escolha seu acesso. Os modelos estão incluídos em todos os planos.")}</p></div><SitePlans /><p className="pricing-nota">{t("Planos mensais Claude e GPT: 30 dias a partir da emissão da chave. Pro, Max e Enterprise pausam por 1 hora ao atingir o limite de tokens e depois liberam tudo de novo; Teams não tem limite. Combo 5x e 20x: limite diário de tokens, renovado à meia-noite (horário de Brasília).")}</p><p className="pricing-contact"><Clock size={14} aria-hidden="true" /><span>{t("Quer testar primeiro?")}</span><a href="https://chat.whatsapp.com/EVdOAcdCyRlBQKfA0PkK9O?s=cl&p=a&iam=2" target="_blank" rel="noopener noreferrer">{t("Fale com a equipe")}</a></p></section>
    <section className="guarantee-section"><hr className="guarantee-divider" /><div className="wide"><div className="pricing-guarantee"><img className="guarantee-seal-img" src={seloGarantia.url} alt="Selo de garantia de 7 dias NEXA" width={110} height={110} loading="lazy" /><div><h3><ShieldCheck size={16} aria-hidden="true" />{t("3 dias de garantia se usar menos de 50% dos tokens")}</h3><p>{t("Não curtiu? Seu dinheiro volta inteiro, sem pergunta. Sem fidelidade: não renova sozinho. Pagamento por PIX. Cartão de crédito em breve.")}</p></div></div></div></section>
    <GatewayCompare />
    <section className="gateway-band gateway-setup" id="configuracao"><div className="wide"><div className="gateway-centered-heading"><p className="eyebrow">{t("DA SUA CHAVE AO SEU PROJETO.")}</p><h2>{t("Seu próximo projeto")}<br /><em>{t("começa com uma conexão.")}</em></h2></div><GatewayConfiguration /><div className="gateway-assistance"><OpenCodeAssistant /><ClaudeCodeInstaller /></div><details className="cc-det"><summary>{t("Ver os comandos")}<span className="sinal" aria-hidden="true" /></summary><div className="cc-det-corpo"><PassosConexao /></div></details></div></section>
    <section className="gateway-band gateway-tutorial" id="video"><div className="wide"><div className="gateway-centered-heading"><p className="eyebrow">{t("VEJA A CONEXÃO ACONTECER.")}</p><h2>Claude Code + NEXA CLOUD</h2><p>{t("Do pedido em português à edição do seu projeto.")}</p></div><div className="video-frame"><iframe src="https://www.youtube.com/embed/7DyTxYUXCrw?si=bkaUsgyF--yleLIe" title="Tutorial NEXA CLOUD" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen loading="lazy" /></div><div className="gateway-video-notes"><span><Monitor />{t("Prepare seu ambiente")}</span><span><Terminal />{t("Conecte o Claude Code")}</span><span><Zap />{t("Comece seu projeto")}</span></div></div></section>
    <GatewayConnectedTools />
    <section className="gateway-band"><div className="wide"><p className="eyebrow">{t("O CAMINHO É MAIS SIMPLES.")}</p><h2>{t("Começar pode")}<br />{t("ser simples assim.")}</h2><div className="gateway-steps">{[{title:'Escolha seu plano',text:'Tokens ou período, no ritmo do seu projeto.'},{title:'Faça seu pagamento',text:'Pague pelo PIX e aguarde a aprovação.'},{title:'Copie sua chave',text:'Seu acesso fica disponível no painel NEXA.'},{title:'Abra as possibilidades',text:'Configure seu ambiente e comece a criar.'}].map((step,i)=><article key={step.title}><strong>0{i+1}</strong><h3>{t(step.title)}</h3><p>{t(step.text)}</p></article>)}</div></div></section>
    <LiveStats />
    <GatewayAccessExplained />
    <WhatsAppTestimonials />
    <section className="wide faq" id="faq"><div><p className="eyebrow">{t("ANTES DE COMEÇAR.")}</p><h2>{t("Ainda ficou")}<br />{t("alguma dúvida?")}</h2><a className="gateway-text-link" href="https://chat.whatsapp.com/EVdOAcdCyRlBQKfA0PkK9O?s=cl&p=a&iam=2" target="_blank" rel="noopener noreferrer">{t("Fale com a gente")} <ArrowRight size={14} /></a></div><div>{faqs.map(([q,a])=><details key={q}><summary>{t(q)}<span>+</span></summary><p>{t(a)}</p></details>)}</div></section>
    <section className="wide gateway-disclosure"><details><summary>{t("Antes de comprar: informações importantes")}</summary><p className="eyebrow">{t("LEIA ANTES DE PAGAR")}</p><ul><li><b>{t("Não somos a Anthropic, nem parceiros ou revendedores oficiais.")}</b> {t("Você compra acesso por API: a chave sk-nx-… autentica chamadas de API, e só isso.")}</li><li>{t("A chave não loga no claude.ai, no app de celular nem no Claude Desktop, e não vira plano Pro ou Max. Claude in Chrome e os connectors de Gmail, Drive e Notion não entram. MCP funciona normalmente, local e remoto.")}</li><li><b>{t("É no computador.")}</b> {t("O Claude Code é um programa de terminal e trabalha na pasta do projeto na sua máquina. No celular não roda.")}</li><li>{t("Seu código passa pela nossa ponte, que autentica a chave e repassa a chamada ao provedor. Se o seu projeto tem regra que proíbe isso, é motivo para não comprar aqui.")}</li><li>{t("Uma chave, uma pessoa: dividir suspende o acesso. Ritmo de até 100 milhões de tokens por hora no ilimitado e 80 milhões no Essencial. No ilimitado o relógio começa na emissão e não pausa; o Essencial vale até os tokens acabarem.")}</li></ul></details></section>
    <section className="final-cta"><div className="wide final-cta-head"><p className="eyebrow">{t("A IDEIA É SUA. A CONEXÃO É NEXA.")}</p></div><div className="wide final-cta-card"><h2>{t("O próximo projeto é seu.")}<br /><em>{t("A conexão é NEXA CLOUD.")}</em></h2><p>{t("Uma chave para conectar seu próximo passo.")}</p><Button asChild className="gateway-button"><a href="#essencial" onClick={irPara('essencial')}>{t("Ver os planos")} <ArrowRight /></a></Button></div></section>
    <section className="gateway-last-cta"><div className="wide"><p className="eyebrow">{t("PRONTO PARA COMEÇAR?")}</p><h2>{t("Agora, dê a ela")} <em>{t("espaço para")}<br />{t("acontecer.")}</em></h2><div className="gateway-hero-actions"><Button asChild className="gateway-button"><a href="#essencial" onClick={irPara('essencial')}>{t("Escolher meu plano")} <ArrowRight /></a></Button><Button asChild variant="outline" className="gateway-secondary"><a href="https://chat.whatsapp.com/EVdOAcdCyRlBQKfA0PkK9O?s=cl&p=a&iam=2" target="_blank" rel="noopener noreferrer"><MessageSquare />{t("Falar no WhatsApp")}</a></Button></div></div></section>
  </main>
  <footer className="site-footer"><div className="wide footer-grid">
    <div className="footer-brand">
      <a className="footer-logo" href="/"><img src={icon} alt="Nexa Cloud" /><span><b>Nexa</b> <em>Cloud</em></span></a>
      <p>{t("O Claude Code destrava o seu projeto do Lovable, com acesso por API e atendimento em português.")}</p>
      <div className="footer-social">
        <a href="https://chat.whatsapp.com/EVdOAcdCyRlBQKfA0PkK9O?s=cl&p=a&iam=2" target="_blank" rel="noopener noreferrer" aria-label="Grupo no WhatsApp"><svg viewBox="0 0 32 32" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M16.004 3.2c-7.06 0-12.79 5.73-12.79 12.79 0 2.25.59 4.45 1.71 6.39L3.2 28.8l6.59-1.73a12.76 12.76 0 0 0 6.21 1.59h.01c7.06 0 12.79-5.73 12.79-12.79 0-3.42-1.33-6.63-3.74-9.04a12.7 12.7 0 0 0-9.06-3.63Zm0 23.44h-.01a10.62 10.62 0 0 1-5.4-1.48l-.39-.23-4.02 1.05 1.07-3.92-.25-.4a10.6 10.6 0 0 1-1.63-5.67c0-5.86 4.77-10.63 10.64-10.63 2.84 0 5.5 1.11 7.51 3.12a10.56 10.56 0 0 1 3.11 7.52c0 5.86-4.77 10.63-10.63 10.63Zm5.83-7.96c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.72.16-.21.32-.83 1.04-1.02 1.25-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.52-.53-.72-.54h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.65 0 1.56 1.14 3.07 1.3 3.28.16.21 2.24 3.42 5.42 4.79.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.89-.77 2.15-1.52.27-.74.27-1.38.19-1.52-.08-.13-.29-.21-.61-.37Z" /></svg></a>
        <a href="https://www.youtube.com/watch?v=7DyTxYUXCrw" target="_blank" rel="noopener noreferrer" aria-label="Tutorial no YouTube"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8ZM9.6 15.6V8.4L15.8 12l-6.2 3.6Z" /></svg></a>
      </div>
    </div>
    <div className="footer-col footer-support"><h4>{t("SUPORTE")}</h4><a href="https://chat.whatsapp.com/EVdOAcdCyRlBQKfA0PkK9O?s=cl&p=a&iam=2" target="_blank" rel="noopener noreferrer"><MessageCircle size={15} aria-hidden="true" />{t("WhatsApp (grupo de suporte)")}</a><a href="mailto:suporte@nexapro.site"><Mail size={15} aria-hidden="true" />suporte@nexapro.site</a><Link to="/status"><Activity size={15} aria-hidden="true" />{t("Status dos serviços")}</Link></div>
    <div className="footer-col"><h4>{t("LINKS")}</h4><a href="#essencial" onClick={irPara("essencial")}>{t("Planos")}</a><a href="#faq">FAQ</a><Link to="/docs">{t("Docs")}</Link></div>
    <div className="footer-col"><h4>LEGAL</h4><Link to="/reembolso">{t("Reembolso")}</Link><Link to="/termos">{t("Termos")}</Link><Link to="/status">{t("Status")}</Link></div>
  </div>
  <p className="footer-cnpj">CNPJ - 65.146.817/0001-18</p>
  <p className="footer-legal-nota">{t("Não somos a Anthropic, nem parceiros, revendedores oficiais ou patrocinados por ela.")}</p>
  <div className="wide footer-bottom"><p>{t("© 2026 NEXA CLOUD. Todos os direitos reservados.")}</p><span className="footer-pill">Desenvolvido pela Nexa Pro</span></div></footer>
  <div className="wa-bar">
    <a className="wa-link" href="https://chat.whatsapp.com/EVdOAcdCyRlBQKfA0PkK9O?s=cl&p=a&iam=2" target="_blank" rel="noopener noreferrer" aria-label="Falar no WhatsApp">
      <span className="wa-icon" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="22" height="22" fill="currentColor">
          <path d="M16.004 3.2c-7.06 0-12.79 5.73-12.79 12.79 0 2.25.59 4.45 1.71 6.39L3.2 28.8l6.59-1.73a12.76 12.76 0 0 0 6.21 1.59h.01c7.06 0 12.79-5.73 12.79-12.79 0-3.42-1.33-6.63-3.74-9.04a12.7 12.7 0 0 0-9.06-3.63Zm0 23.44h-.01a10.62 10.62 0 0 1-5.4-1.48l-.39-.23-4.02 1.05 1.07-3.92-.25-.4a10.6 10.6 0 0 1-1.63-5.67c0-5.86 4.77-10.63 10.64-10.63 2.84 0 5.5 1.11 7.51 3.12a10.56 10.56 0 0 1 3.11 7.52c0 5.86-4.77 10.63-10.63 10.63Zm5.83-7.96c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.72.16-.21.32-.83 1.04-1.02 1.25-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.52-.53-.72-.54h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.65 0 1.56 1.14 3.07 1.3 3.28.16.21 2.24 3.42 5.42 4.79.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.89-.77 2.15-1.52.27-.74.27-1.38.19-1.52-.08-.13-.29-.21-.61-.37Z" />
        </svg>
      </span>
      <span className="wa-texto"><small>{t("Precisa de ajuda?")}</small><b>WhatsApp</b></span>
    </a>
    <div className="wa-bar-acoes">
      {user
        ? <Link className="wa-account" to="/minha-chave"><span className="wa-account-label">{t("MEU PAINEL")}</span></Link>
        : <Link className="wa-account" to="/entrar"><span className="wa-account-label">{t("ENTRAR")}</span></Link>}
      <a className="dark-button" href="#essencial" onClick={irPara("essencial")}>{t("VER PLANOS")}</a>
    </div>
  </div>
  <FloatingAtendimento />
  {cookies && (
    <div className="login-cookies cookies-fixada">
      <p><b>{t("Cookies & privacidade.")}</b> {t("Usamos cookies essenciais (sessão) e, com seu aceite, cookies de análise para entender o uso e melhorar a plataforma. Você escolhe. Saiba mais na")} <Link to="/termos">{t("Política de Privacidade")}</Link>.</p>
      <div>
        <Button type="button" className="cookies-essenciais" onClick={() => chooseCookies(false)}>{t("SÓ ESSENCIAIS")}</Button>
        <Button type="button" className="cookies-aceitar" onClick={() => chooseCookies(true)}>{t("ACEITAR")}</Button>
      </div>
    </div>
  )}
  </div>;
}
