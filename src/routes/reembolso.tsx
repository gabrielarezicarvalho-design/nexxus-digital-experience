import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { LegalPage } from "@/components/LegalPage";
import { FloatingAtendimento } from "@/components/FloatingAtendimento";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reembolso")({
  head: () => ({ meta: [
    { title: "Reembolso — NEXA CLOUD" },
    { name: "description", content: "Orientações para solicitar atendimento e reembolso de uma compra NEXA CLOUD." },
    { property: "og:title", content: "Reembolso — NEXA CLOUD" },
    { property: "og:description", content: "Veja como entrar em contato sobre sua compra e solicitar reembolso." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Reembolso,
});

function Reembolso() {
  return <>
    <LegalPage title="Reembolso" description="Orientações para solicitar atendimento e reembolso de uma compra NEXA CLOUD.">
    <section><h2>Precisa de ajuda com sua compra?</h2><p>Se sua chave não chegou, não autentica ou você deseja solicitar reembolso, entre em contato com o suporte NEXA CLOUD.</p></section>
    <section><h2>Como solicitar</h2><p>Informe o e-mail utilizado na compra, a data do pagamento e o motivo da solicitação. Tenha o comprovante ou o identificador do pagamento disponível. Não envie sua API Key em grupos públicos.</p>
      <Button asChild variant="outline" className="legal-contact-button mt-5 h-auto min-h-10 whitespace-normal"><a href="https://chat.whatsapp.com/EVdOAcdCyRlBQKfA0PkK9O?s=cl&p=a&iam=2" target="_blank" rel="noopener noreferrer"><MessageSquare />Entrar em contato pelo WhatsApp</a></Button>
    </section>
    <section><h2>Análise da solicitação</h2><p>O suporte verifica a compra e orienta os próximos passos. Esta página não realiza estornos automáticos. Seus direitos previstos na legislação aplicável permanecem preservados.</p></section>
    <section><h2>Garantia de 3 dias</h2><p>Você tem 3 dias de garantia, contados a partir da compra, se tiver usado menos de 50% dos tokens. Dentro dessas condições, seu dinheiro volta inteiro, sem pergunta.</p></section>
  </LegalPage>
  <FloatingAtendimento />
  </>;
}