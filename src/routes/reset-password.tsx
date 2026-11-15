import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from '@/components/ui/button';

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — NEXA CLOUD" },
      { name: "description", content: "Defina uma nova senha para sua conta NEXA CLOUD." },
      { property: "og:title", content: "Nova senha — NEXA CLOUD" },
      { property: "og:description", content: "Defina uma nova senha para sua conta NEXA CLOUD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    setRecovery(hash.get('type') === 'recovery' || query.get('type') === 'recovery');
    const { data } = supabase.auth.onAuthStateChange(event => { if (event === 'PASSWORD_RECOVERY') setRecovery(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!recovery) { setErro('Abra o link de recuperação enviado ao seu e-mail.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) setErro(error.message); else navigate({ to: "/minha-chave" });
    setBusy(false);
  }
  return (
    <div className="login-page">
      <div className="login-card">
        <p className="login-eyebrow">NEXA CLOUD</p>
        <h1>Nova <span>senha.</span></h1>
        <form onSubmit={salvar}>
          <label htmlFor="nova">NOVA SENHA</label>
          <input id="nova" type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} />
          {erro && <p className="login-erro">{erro}</p>}
          <Button type="submit" className="client-primary w-full mt-4" disabled={busy}>{busy ? 'Salvando…' : 'SALVAR →'}</Button>
        </form>
      </div>
    </div>
  );
}
