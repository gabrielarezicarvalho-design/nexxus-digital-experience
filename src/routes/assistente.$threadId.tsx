import { createFileRoute } from "@tanstack/react-router";
import { AssistantPage } from "@/components/AssistantChat";

export const Route = createFileRoute("/assistente/$threadId")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Conversa com a Alexa — NEXA CLOUD" },
    { name: "description", content: "Sua conversa com a Alexa, assistente da NEXA CLOUD." },
    { property: "og:title", content: "Conversa com a Alexa — NEXA CLOUD" },
    { property: "og:description", content: "Tire dúvidas sobre a NEXA CLOUD com a Alexa." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: AssistantThread,
});

function AssistantThread() {
  const { threadId } = Route.useParams();
  return <AssistantPage threadId={threadId} />;
}
