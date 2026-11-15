import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowLeft, ArrowRight, ArrowUpRight, Gauge, Lock, RefreshCw, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FloatingAtendimento } from "@/components/FloatingAtendimento";
import logo from "@/assets/nexus/nexa-logo.png.asset.json";
import { buildAvailabilityDays, coveragePercent, formatPercent, formatStamp, liveState, outageMinutesBetween, outagesBetween, rangeUptime, type BarState, type StatusSummary } from "@/lib/status-rules";

export const Route = createFileRoute("/status")({
  head: () => ({ meta: [
    { title: "Status — NEXA CLOUD" },
    { name: "description", content: "Disponibilidade do gateway, nível de serviço e privacidade na NEXA CLOUD." },
    { property: "og:title", content: "Status — NEXA CLOUD" },
    { property: "og:description", content: "Consulte a disponibilidade do gateway, o nível de serviço e como exercer seus direitos sobre dados pessoais." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: StatusPage,
});

const BAR_LABELS: Record<BarState, string> = { none: "Sem dados", ok: "Sem quedas", partial: "Cobertura parcial", fail: "Queda de mais de 10 minutos" };
const RANGE_MS: Record<string, number> = { "24h": 864e5, "7d": 7 * 864e5, "30d": 30 * 864e5 };
const RANGE_LABELS: Record<string, string> = { "24h": "24 horas", "7d": "7 dias", "30d": "30 dias" };
const WHATSAPP = "https://chat.whatsapp.com/EVdOAcdCyRlBQKfA0PkK9O?s=cl&p=a&iam=2";

async function loadStatus(): Promise<StatusSummary> {
  // status_summary é somente leitura: devolve apenas contagens de disponibilidade.
  const { data, error } = await supabase.rpc("status_summary");
  if (error) throw error;
  return data as unknown as StatusSummary;
}

function StatusPage() {
  const status = useQuery({ queryKey: ["public-status-reference"], queryFn: loadStatus, refetchInterval: 30000, retry: false });
  const summary = status.data;
  const last = summary?.last ?? null;
  const live = liveState(last, summary?.providersDown);
  const outages = summary?.outages ?? [];
  const bars = buildAvailabilityDays(summary?.days ?? [], summary?.deliveryDays ?? [], outages);
  const nowMs = Date.now();

  return <div id="topo" className="gateway-home status-page">
    <header className="site-header status-header"><div className="wide header-inner">
      <Link to="/" className="brand"><img src={logo.url} alt="" /><span>NEXA <em>CLOUD</em></span></Link>
      <nav aria-label="Navegação principal">
        <Link to="/termos" className="status-nav-link">Termos de uso</Link>
        <Button asChild className="gateway-button"><Link to="/"><ArrowLeft size={15} />Voltar ao site</Link></Button>
      </nav>
    </div></header>

    <main className="wide">
      <section className="status-hero">
        <p className="eyebrow"><ShieldCheck size={15} />CENTRAL DE TRANSPARÊNCIA</p>
        <h1>Confiança começa<br />com transparência.</h1>
        <p>Consulte a disponibilidade do gateway, entenda o nível de serviço e saiba como exercer seus direitos sobre dados pessoais.</p>
        <div className="status-pills">
          <a href="#uptime"><Activity size={15} />Uptime</a>
          <a href="#sla"><Gauge size={15} />SLA</a>
          <a href="#privacidade"><Lock size={15} />Privacidade e LGPD</a>
        </div>
      </section>

      <section id="uptime" className="status-card status-reference-card">
        <div className="status-card-head">
          <h2>Disponibilidade do gateway</h2>
          <span className={`status-live is-${live}`}><i aria-hidden="true" />{live === "up" ? "Gateway respondendo" : live === "down" ? "Gateway indisponível" : "Aguardando a primeira verificação"}</span>
          <Button variant="outline" className="status-refresh" onClick={() => void status.refetch()} disabled={status.isFetching}><RefreshCw className={status.isFetching ? "animate-spin" : ""} />Atualizar status</Button>
        </div>
        <div className="status-metrics">
          <div><small>TEMPO DE RESPOSTA</small><b>{last?.latencyMs != null ? `${last.latencyMs} ms` : "—"}</b></div>
          <div><small>ÚLTIMA VERIFICAÇÃO</small><b>{formatStamp(last?.checkedAt)}</b></div>
        </div>
        <p className="status-note">Um monitor separado do processo web consulta o endereço público do gateway a cada minuto, incluindo HTTPS e a conexão com o banco de dados. Só contamos como falha quando o site ou os fornecedores ficam parados por mais de 10 minutos seguidos: o monitor falhando ou todos os pedidos dos clientes terminando em erro do servidor (5xx). Erros isolados ou rápidos e erros do próprio cliente, como chave bloqueada, não contam. Se o monitor parar, o período fica sem medição. Esta página atualiza a cada 30 segundos.</p>
        <div className="status-ranges">
          {(summary?.ranges ?? []).map(r => { const from = nowMs - (RANGE_MS[r.key] ?? 0); const downMin = outageMinutesBetween(outages, from, nowMs); const count = outagesBetween(outages, from, nowMs); return <div className="status-range" key={r.key}>
            <small>{RANGE_LABELS[r.key] ?? r.key}</small>
            <b>{formatPercent(rangeUptime(r.checks, downMin))}</b>
            <span>Cobertura: {formatPercent(coveragePercent(r.checks, r.expected))}</span>
            <span>{`Quedas: ${count.toLocaleString("pt-BR")} · Tempo parado: ${downMin.toLocaleString("pt-BR")} min`}</span>
          </div>; })}
        </div>
        <div className="status-bars" aria-label="Disponibilidade do monitor nos últimos 30 dias">
          {bars.map(b => <i key={b.day} className={`is-${b.state}`} title={`${b.day} UTC · ${BAR_LABELS[b.state]} · ${b.outageMinutes} min parado`} />)}
        </div>
        <div className="status-legend">
          <span><b style={{ background: "var(--client-dot-green)" }} />Sem quedas</span>
          <span><b style={{ background: "var(--client-dot-amber)" }} />Cobertura parcial</span>
          <span><b style={{ background: "var(--client-danger)" }} />Queda de mais de 10 min</span>
          <span><b style={{ background: "var(--paper-dark)" }} />Sem dados</span>
        </div>
        <p className="status-note">Uptime = minutos medidos sem queda ÷ minutos medidos. A cobertura mostra quanto do período foi medido. Minutos sem medição ficam desconhecidos e não contam como disponibilidade. Os dias seguem o horário UTC.</p>
        <p className="status-note">Monitoramento desde: {formatStamp(summary?.since)}</p>
      </section>


      <section id="sla" className="status-card">
        <h2>Nível de serviço (SLA)</h2>
        <div className="status-cols">
          <div><h3>Disponibilidade e dependências</h3><p>O acesso depende da infraestrutura da NEXA CLOUD e dos provedores de modelos. Um gateway acessível não garante que todos os modelos estejam disponíveis. Manutenções e falhas de terceiros podem afetar o serviço.</p></div>
          <div><h3>Condições aplicáveis</h3><p>Consulte os termos de uso e qualquer acordo específico da sua contratação para conhecer as condições aplicáveis. Esta página não estabelece uma nova garantia percentual de uptime, prazo de resolução ou política de créditos.</p></div>
          <div><h3>Como reportar uma falha</h3><p>Informe ao suporte o horário e fuso, o modelo utilizado, o código do erro e o identificador da requisição, quando disponível. Não envie sua senha, chave de API ou conteúdo pessoal desnecessário.</p></div>
        </div>
        <div className="status-actions">
          <Link to="/termos">Consultar termos de uso <ArrowRight size={14} /></Link>
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">Falar com o suporte <ArrowUpRight size={14} /></a>
        </div>
      </section>

      <section id="privacidade" className="status-card">
        <h2>Privacidade e LGPD</h2>
        <div className="status-cols2">
          <div><h3>Dados usados pelo serviço</h3><p>A plataforma utiliza informações de cadastro, cobrança e uso para oferecer acesso, processar pagamentos e proteger o serviço. As solicitações enviadas aos modelos são processadas pelos provedores envolvidos na resposta.</p></div>
          <div><h3>Cookies e tecnologias de medição</h3><p>O site utiliza cookies para sessão, preferência de idioma e atribuição de campanhas. Também integra tecnologias de medição da Meta. Para esclarecer o tratamento desses dados, entre em contato pelo canal abaixo.</p></div>
          <div><h3>Seus direitos</h3><p>Nos termos da LGPD, você pode solicitar confirmação e acesso aos dados, correção, informações sobre compartilhamento e, nas hipóteses aplicáveis, portabilidade, anonimização, bloqueio ou eliminação. Também pode revogar o consentimento quando essa for a base do tratamento.</p></div>
          <div><h3>Solicitações e conservação</h3><p>Envie sua solicitação pelo e-mail vinculado à conta e descreva o direito que deseja exercer. Pode ser necessário confirmar sua identidade. A eliminação está sujeita às hipóteses legais de conservação; solicite ao suporte detalhes sobre os dados e prazos aplicáveis ao seu caso.</p></div>
        </div>
        <div className="status-help">
          <div><b>Precisa de ajuda com seus dados?</b><p>Use o canal de suporte para encaminhar dúvidas e solicitações de privacidade.</p></div>
          <Button asChild className="gateway-button"><a href={WHATSAPP} target="_blank" rel="noopener noreferrer">Solicitar atendimento de privacidade <ArrowRight size={15} /></a></Button>
        </div>
        <a className="status-anpd" href="https://www.gov.br/anpd/pt-br" target="_blank" rel="noopener noreferrer">Conheça seus direitos no site da ANPD <ArrowUpRight size={14} /></a>
      </section>

      <section className="status-cta">
        <h2>Seu próximo projeto começa aqui.</h2>
        <p>Escolha um plano, cole a chave no Claude Code ou no OpenCode e continue programando.</p>
        <div className="status-actions">
          <Button asChild className="gateway-button"><Link to="/entrar">Criar conta <ArrowRight size={15} /></Link></Button>
          <Button asChild variant="outline"><Link to="/">Ver planos</Link></Button>
        </div>
      </section>
    </main>

    <footer className="legal-footer"><div className="wide legal-footer-inner">
      <Link to="/" className="brand"><img src={logo.url} alt="" /><span>NEXA <em>CLOUD</em></span></Link>
      <p>© 2026 NEXA CLOUD. Todos os direitos reservados.</p>
      <nav aria-label="Rodapé"><Link to="/termos">Termos</Link><Link to="/reembolso">Reembolso</Link><Link to="/status">Status</Link><a href="#topo">Voltar ao topo</a></nav>
    </div></footer>
    <FloatingAtendimento />
  </div>;
}
