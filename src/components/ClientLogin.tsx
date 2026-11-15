import { LanguageToggle } from "@/components/LanguageToggle";
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Eye, EyeOff, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { HumanCheck } from '@/components/HumanCheck';
import logoAsset from '@/assets/nexus/nexa-logo.png.asset.json';
import cityImg from '@/assets/login-city-sunset.jpg';

const logo = logoAsset.url;


export function ClientHeader({ children }: { children?: React.ReactNode }) {
  return <header className="client-header"><div><Link to="/" className="brand"><img src={logo} alt="NEXA" />NEXA <em>CLOUD</em><small>PAINEL</small></Link><nav>{children ?? <Link to="/">Voltar ao site <ArrowUpRight size={14} /></Link>}</nav></div></header>;
}

export function ClientLogin() {
  const [create, setCreate] = useState(false);
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [human, setHuman] = useState(false);
  const navigate = useNavigate();
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!human) { setError('Confirme a caixinha "Sou humano" para continuar.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      if (create) {
        if (/@(.+\.)?fldubai\.com$/i.test(email.trim())) { setError('Cadastro não permitido para este domínio de e-mail.'); return; }
        const result = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim() }, emailRedirectTo: window.location.origin } });
        if (result.error) throw result.error;
        if (!result.data.session) setMessage('Conta criada! Confira seu e-mail para confirmar o cadastro.');
        else await navigate({ to: '/minha-chave' });
      } else {
        const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) { setError('E-mail ou senha incorretos.'); return; }
        await navigate({ to: '/minha-chave' });
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível acessar. Tente novamente.'); }
    finally { setBusy(false); }
  }
  async function recover() {
    if (!email) { setError('Digite seu e-mail para recuperar a senha.'); return; }
    setBusy(true); setError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
      if (error) throw error;
      setMessage('Enviamos o link de recuperação para seu e-mail.');
    } catch { setError('Não foi possível enviar o link. Tente novamente.'); }
    finally { setBusy(false); }
  }
  return <main className="lg-page">
    <section className="lg-left">
      <Link to="/" className="lg-brand"><img src={logo} alt="" width={26} height={26} />NEXA <em>CLOUD</em></Link>
      <div className="lg-form">
        <h1>{create ? 'Criar conta' : 'Entrar'}</h1>
        <p className="lg-sub">{create ? 'Crie sua conta para receber e acompanhar suas chaves NEXA CLOUD.' : 'Suas chaves, planos e consumo ficam nesta conta.'}</p>
        <form onSubmit={submit}>
          {create && <label>Nome<input required maxLength={100} autoComplete="name" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} /></label>}
          <label>E-mail<input type="email" required autoComplete="email" placeholder="voce@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label htmlFor="client-password">Senha</label>
          <div className="lg-password"><input id="client-password" type={visible ? 'text' : 'password'} required minLength={6} autoComplete={create ? 'new-password' : 'current-password'} placeholder="Sua senha" value={password} onChange={e => setPassword(e.target.value)} /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          <HumanCheck onVerify={v => { setHuman(v); if (v) setError(''); }} />
          {error && <p className="client-error" role="alert">{error}</p>}{message && <p className="client-notice" role="status">{message}</p>}
          <Button className="lg-submit" type="submit" disabled={busy}>{busy ? 'Aguarde…' : create ? 'Criar conta' : 'Entrar'}</Button>
        </form>
        {!create && <button type="button" className="lg-forgot" onClick={recover} disabled={busy}>Esqueci a senha</button>}
        <p className="lg-switch">{create ? 'Já tem conta?' : 'Ainda não tem conta?'} <button type="button" onClick={() => { setCreate(!create); setError(''); setMessage(''); }}>{create ? 'Entrar' : 'Criar conta'}</button></p>
      </div>
      <div className="lg-lang"><LanguageToggle /></div>
      <footer className="lg-foot">
        <div className="lg-foot-copy">© {new Date().getFullYear()} <span>NEXA CLOUD. Todos os direitos reservados.</span></div>
        <div className="lg-foot-right">
          <Link to="/termos">Termos de uso</Link>
          <Link to="/reembolso">Reembolso</Link>
          <span className="lg-foot-badge">Desenvolvido pela Nexa Pro</span>
        </div>
      </footer>
    </section>
    <aside className="lg-aside" style={{ backgroundImage: `url(${cityImg})` }}>
      <p>Qualidade e velocidade é na<br /><span><img src={logo} alt="" width={40} height={40} />NEXA<br /><em>CLOUD</em></span></p>
    </aside>
  </main>;
}
