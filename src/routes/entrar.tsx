import { createFileRoute, Link } from '@tanstack/react-router';
import { ClientLogin } from '@/components/ClientLogin';
import { useClientIdentity } from '@/components/client-auth-context';
import { Button } from '@/components/ui/button';
export const Route = createFileRoute('/entrar')({
  head: () => ({ meta: [
    { title:'Entrar ou criar conta — NEXA CLOUD' },
    { name:'description', content:'Entre com Google ou e-mail e crie sua conta NEXA CLOUD.' },
    { property:'og:title', content:'Entrar ou criar conta — NEXA CLOUD' },
    { property:'og:description', content:'Acesse suas chaves e consumo com sua conta NEXA CLOUD.' },
    { property:'og:type', content:'website' },
    { name:'twitter:card', content:'summary' },
  ] }),
  component: Entrar,
});
function Entrar() {
  const { user, ready } = useClientIdentity();
  if (!ready) return <div className="client-page client-loading">Carregando…</div>;
  if (user) return <div className="client-page client-loading"><h1>Você já está conectado.</h1><Button asChild className="client-primary"><Link to="/minha-chave">Abrir meu painel</Link></Button></div>;
  return <ClientLogin />;
}