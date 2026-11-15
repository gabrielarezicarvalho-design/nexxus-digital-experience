import { LanguageToggle } from "@/components/LanguageToggle";
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Eye, EyeOff, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
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
  async function google() {
    setBusy(true); setError('');
    try {
      const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: `${window.location.origin}/entrar` });
      if (result.error) setError('Não foi possível entrar com Google. Tente novamente.');
      else if (!result.redirected) await navigate({ to: '/minha-chave' });
    } catch { setError('Não foi possível entrar com Google.'); }
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
        <Button variant="outline" className="lg-google" onClick={google} disabled={busy}><svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>Continuar com o Google</Button>
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
