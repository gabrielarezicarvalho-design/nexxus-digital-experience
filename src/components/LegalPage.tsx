import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, FileText, ShieldCheck, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/nexus/nexa-logo.png.asset.json";

export function LegalPage({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <div className="gateway-home legal-page">
    <header className="site-header legal-header"><div className="wide header-inner">
      <Link to="/" className="brand"><img src={logo.url} alt="" /><span>NEXA <em>CLOUD</em></span></Link>
      <nav aria-label="Navegação principal"><Button asChild className="gateway-button"><Link to="/"><ArrowLeft size={15} />Voltar ao site</Link></Button></nav>
    </div></header>
    <main className="wide">
      <div className="legal-heading"><p className="eyebrow"><ShieldCheck size={15} />NEXA CLOUD · INFORMAÇÕES LEGAIS</p><h1>{title}</h1><p>{description}</p></div>
      <div className="legal-layout">
        <aside className="legal-sidebar"><p className="legal-sidebar-label">INFORMAÇÕES LEGAIS</p><nav aria-label="Informações legais" className="legal-nav">
          <Link to="/reembolso"><Wallet />Reembolso</Link>
          <Link to="/termos"><FileText />Termos de uso</Link>
        </nav><div className="legal-support"><a href="https://chat.whatsapp.com/EVdOAcdCyRlBQKfA0PkK9O?s=cl&p=a&iam=2" target="_blank" rel="noopener noreferrer">Fale com a equipe <ArrowUpRight size={15} /></a></div></aside>
        <div className="legal-content">{children}</div>
      </div>
    </main>
    <footer className="legal-footer"><div className="wide legal-footer-inner"><Link to="/" className="brand"><img src={logo.url} alt="" /><span>NEXA <em>CLOUD</em></span></Link><p>© 2026 NEXA CLOUD. Todos os direitos reservados.</p><nav aria-label="Rodapé"><Link to="/reembolso">Reembolso</Link><Link to="/termos">Termos</Link></nav></div></footer>
  </div>;
}