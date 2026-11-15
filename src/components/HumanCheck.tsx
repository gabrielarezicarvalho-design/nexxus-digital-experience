import { useEffect, useRef, useState } from 'react';
import { Check, Ghost, Loader2 } from 'lucide-react';

// Verificação "Sou humano" no estilo dos widgets de proteção de formulário.
// É uma checagem leve, feita no navegador: só passa quem levou um tempo
// razoável na tela, mexeu no mouse/teclado e não caiu no campo-armadilha
// invisível. O cliente precisa clicar na caixinha antes de entrar.
const MIN_TIME_MS = 900;

type Status = 'idle' | 'checking' | 'ok' | 'fail';

export function HumanCheck({ onVerify }: { onVerify?: (verified: boolean) => void }) {
  const [status, setStatus] = useState<Status>('idle');
  const mounted = useRef(0);
  const actions = useRef(0);
  const trap = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    mounted.current = performance.now();
    const count = () => { actions.current += 1; };
    window.addEventListener('pointermove', count, { passive: true });
    window.addEventListener('pointerdown', count, { passive: true });
    window.addEventListener('keydown', count);
    return () => {
      window.removeEventListener('pointermove', count);
      window.removeEventListener('pointerdown', count);
      window.removeEventListener('keydown', count);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  function verify(e: React.ChangeEvent<HTMLInputElement>) {
    if (status === 'checking' || status === 'ok') { e.target.checked = false; return; }
    setStatus('checking');
    timer.current = window.setTimeout(() => {
      const elapsed = performance.now() - mounted.current;
      const trapped = !!trap.current?.value.trim();
      const passed = elapsed >= MIN_TIME_MS && !trapped && navigator.webdriver !== true && actions.current > 0;
      if (trap.current) trap.current.value = ''; // deixa uma nova tentativa funcionar
      setStatus(passed ? 'ok' : 'fail');
      onVerify?.(passed);
    }, 900);
  }

  return <div className="client-human-wrap">
    <input ref={trap} type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="client-human-trap" />
    <label className={`client-human is-${status}`}>
      <input type="checkbox" className="client-human-input" checked={status === 'ok'} disabled={status === 'checking'} onChange={verify} />
      <span className="client-human-box" aria-hidden="true">
        {status === 'checking' && <Loader2 size={14} className="animate-spin" />}
        {status === 'ok' && <Check size={14} strokeWidth={3} />}
      </span>
      <span className="client-human-label">{status === 'checking' ? 'Verificando…' : 'Sou humano'}</span>
      <span className="client-human-brand" aria-hidden="true"><Ghost size={17} /><i /></span>
    </label>
    {status === 'fail' && <p className="client-human-note" role="alert">Não foi possível confirmar que você é humano. Clique na caixinha de novo.</p>}
  </div>;
}
