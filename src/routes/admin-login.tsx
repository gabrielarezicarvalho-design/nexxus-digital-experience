import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminAccess } from "@/lib/admin-access.functions";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Admin — NEXA CLOUD" },
      { name: "description", content: "Acesso restrito ao painel administrativo NEXA CLOUD." },
      { property: "og:title", content: "Admin — NEXA CLOUD" },
      { property: "og:description", content: "Acesso restrito ao painel administrativo NEXA CLOUD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErro(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) { setErro("E-mail ou senha incorretos."); setBusy(false); return; }
    try {
      await getAdminAccess();
      await nav({ to: "/admin", replace: true });
    } catch {
      setErro("Esta conta não tem acesso de administrador.");
      await qc.cancelQueries(); qc.clear();
      await supabase.auth.signOut();
    } finally { setBusy(false); }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={entrar}>
        <p className="login-eyebrow">NEXA CLOUD · ADMIN</p>
        <h1>Painel <span>administrativo.</span></h1>
        <label>EMAIL</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>SENHA</label>
        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        {erro && <p className="login-erro">{erro}</p>}
        <Button type="submit" className="login-entrar" disabled={busy}>{busy ? "ENTRANDO…" : "ENTRAR →"}</Button>
      </form>
    </div>
  );
}
