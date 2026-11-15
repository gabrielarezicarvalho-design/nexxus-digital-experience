import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { FloatingAtendimento } from "@/components/FloatingAtendimento";

export const Route = createFileRoute("/termos")({
  head: () => ({ meta: [
    { title: "Termos de uso — NEXA CLOUD" },
    { name: "description", content: "Informações sobre acesso, uso da API, pagamentos e privacidade na NEXA CLOUD." },
    { property: "og:title", content: "Termos de uso — NEXA CLOUD" },
    { property: "og:description", content: "Condições de uso e informações de privacidade da NEXA CLOUD." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Termos,
});

function Termos() {
  return <>
    <LegalPage title="Termos de uso" description="Informações sobre acesso, uso da API, pagamentos e privacidade na NEXA CLOUD.">
    <section><h2>Sobre a NEXA CLOUD</h2><p>A NEXA CLOUD oferece acesso por API conforme o plano contratado. Não somos a Anthropic, nem parceiros, revendedores oficiais ou patrocinados por ela. O serviço é operado por Nexa Pro (CNPJ 65.146.817/0001-18).</p></section>
    <section><h2>Pagamentos</h2><p>Aceitamos PIX em reais e transferência Revolut em euro (R$ 1 = € 0,16). Planos são cobrados uma única vez, sem renovação automática.</p></section>
    <section><h2>Acesso e uso responsável</h2><p>Mantenha sua chave de acesso em segurança e não a compartilhe com terceiros. Utilize o serviço de forma lícita e respeite os limites de tokens, requisições e validade informados no seu plano.</p></section>
    <section><h2>Chave pessoal e revenda proibida</h2><p>Cada chave é de uso pessoal e exclusivo de quem a contratou. É proibido revender, alugar, emprestar, ceder, sublicenciar ou compartilhar sua chave, total ou parcialmente, com outras pessoas, grupos ou canais, inclusive em planos revendidos por terceiros. A revenda não autorizada da API configura uso indevido e pode gerar bloqueio definitivo da chave sem aviso prévio e sem devolução de valores, além das medidas legais cabíveis.</p><p><strong className="text-foreground">Bloqueio automático por número de dispositivos:</strong> a chave é monitorada quanto ao número de aparelhos usados ao mesmo tempo. Quando ela passa de <strong className="text-foreground">2 dispositivos conectados</strong> (mais de 2 endereços de rede distintos em 7 dias), o sistema bloqueia a chave automaticamente e as novas requisições são recusadas até que o uso seja regularizado. Isso vale tanto para as chaves vendidas diretamente pela NEXA CLOUD quanto para as chaves entregues por revendedores parceiros.</p><p>Se você usa a chave em mais de dois aparelhos por um motivo legítimo (por exemplo computador, celular e servidor), procure o suporte antes que o bloqueio aconteça e explique a situação. O suporte pode analisar o caso e autorizar um número maior de dispositivos quando o uso for justificado.</p></section>
    <section><h2>Planos e pagamentos</h2><p>O preço, os limites e a validade são apresentados na oferta e na compra. Consulte o painel para acompanhar o consumo e as informações da sua chave.</p></section>
    <section><h2>Disponibilidade</h2><p>O serviço depende de fornecedores externos e pode apresentar interrupções ou instabilidade. Em caso de dificuldade, entre em contato com o suporte. Nenhuma informação desta página afasta direitos previstos na legislação aplicável.</p></section>
    <section><h2>Atendimento e reembolso</h2><p>Para problemas com uma compra ou solicitações de devolução, consulte a <Link to="/reembolso" className="text-accent underline">página de reembolso</Link>.</p></section>
    <section><h2>Privacidade</h2><p>Dados de conta, pagamento e uso são utilizados para disponibilizar o acesso, acompanhar o consumo, proteger o serviço e prestar atendimento. Nunca publique sua chave de acesso ou dados de pagamento.</p><p className="mt-3">O site utiliza recursos de sessão e medição de uso, incluindo serviços externos de pagamento e análise. Para dúvidas sobre seus dados pessoais, procure o suporte NEXA CLOUD.</p></section>
  </LegalPage>
  <FloatingAtendimento />
  </>;
}