import { createFileRoute } from "@tanstack/react-router";
import { AssistantPage } from "@/components/AssistantChat";

export const Route = createFileRoute("/assistente/")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Alexa, assistente — NEXA CLOUD" },
    { name: "description", content: "Tire suas dúvidas sobre a NEXA CLOUD com a Alexa, nossa assistente." },
    { property: "og:title", content: "Alexa, assistente — NEXA CLOUD" },
    { property: "og:description", content: "Converse com a assistente da NEXA CLOUD e tire dúvidas sobre instalação, chaves e planos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <AssistantPage />,
});
