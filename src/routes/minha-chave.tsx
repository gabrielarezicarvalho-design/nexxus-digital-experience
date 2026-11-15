import { createFileRoute } from "@tanstack/react-router";
import { useClientIdentity } from "@/components/client-auth-context";
import { ClientLogin } from "@/components/ClientLogin";
import { ClientDashboard } from "@/components/ClientDashboard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/minha-chave")({
  validateSearch: (search: Record<string, unknown>): { section?: string | undefined } => ({
    section: typeof search["section"] === "string" ? search["section"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Meu painel — NEXA CLOUD" },
      {
        name: "description",
        content: "Acompanhe suas chaves NEXA CLOUD, tokens consumidos e comandos enviados.",
      },
      { property: "og:title", content: "Meu painel — NEXA CLOUD" },
      {
        property: "og:description",
        content: "Suas chaves, planos e consumo de API em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MinhaChave,
});
function MinhaChave() {
  const { user, ready, error, retry } = useClientIdentity();
  const { section } = Route.useSearch();
  if (!ready) return <div className="client-page client-loading" role="status">
    {error ? <><p>Não foi possível carregar sua conta. Tente novamente.</p><Button className="client-primary" onClick={retry}>Tentar novamente</Button></> : 'Carregando sua conta…'}
  </div>;
  return user ? (
    <ClientDashboard key={section || "painel"} user={user} initialSection={section} />
  ) : (
    <ClientLogin />
  );
}
