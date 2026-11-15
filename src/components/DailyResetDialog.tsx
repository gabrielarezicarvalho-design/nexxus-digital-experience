import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Check, CheckCircle2, Clock, Copy, Lock, RotateCcw, ShieldCheck, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { checkDailyResetPix, createDailyResetPix } from '@/lib/daily-limit-reset.functions';
import { DAILY_RESET_PRICE_CENTS } from '@/lib/daily-limit-reset';

const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

export function DailyResetDialog({ keyId, planName, onClose }: { keyId: string; planName: string; onClose: () => void }) {
  const create = useServerFn(createDailyResetPix), check = useServerFn(checkDailyResetPix);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [status, setStatus] = useState('pending'), [copied, setCopied] = useState(false);
  const [pix, setPix] = useState<Awaited<ReturnType<typeof create>> | null>(null);
  async function verify() {
    if (!pix) return;
    try {
      const result = await check({ data: { id: pix.id, keyId } });
      setStatus(result.status);
      if (result.status === 'approved') await qc.invalidateQueries({ queryKey: ['client-dashboard'] });
    } catch { setError('Não foi possível verificar agora. Tente novamente.'); }
  }
  useEffect(() => {
    if (!pix || status === 'approved' || ['cancelled', 'rejected'].includes(status)) return;
    const timer = setInterval(() => { void verify(); }, 5000);
    return () => clearInterval(timer);
  }, [pix, status]);
  async function generate() {
    setBusy(true); setError('');
    try { setPix(await create({ data: { keyId } })); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível gerar o PIX.'); }
    finally { setBusy(false); }
  }
  const failed = ['cancelled', 'rejected', 'error'].includes(status);
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-h-[92vh] grid-cols-[minmax(0,1fr)] gap-0 overflow-y-auto overflow-x-hidden p-0 sm:max-w-md">
    <div className="border-b border-border bg-gradient-to-br from-accent/15 via-accent/5 to-transparent px-6 pb-5 pt-6">
      <DialogHeader className="space-y-3 text-left">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-sm"><RotateCcw className="h-5 w-5" /></span>
          <div><DialogTitle className="text-lg">Resetar limite diário</DialogTitle><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Plano {planName}</p></div>
        </div>
        <DialogDescription className="text-sm">Libere novamente todo o limite de tokens do dia, na hora, sem trocar de chave.</DialogDescription>
      </DialogHeader>
      <ol className="mt-5 flex items-center gap-2 text-xs font-medium" aria-label="Etapas">
        {['Resumo', 'Pagamento', 'Liberado'].map((label, i) => { const step = status === 'approved' ? 2 : pix ? 1 : 0; const on = i <= step; return <li key={label} className="flex flex-1 items-center gap-2"><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] ${on ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-background text-muted-foreground'}`}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</span><span className={on ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>{i < 2 && <span className={`h-px flex-1 ${i < step ? 'bg-accent' : 'bg-border'}`} />}</li>; })}
      </ol>
    </div>

    <div className="min-w-0 space-y-5 px-6 pb-6 pt-5">
    {status === 'approved' ? <div className="space-y-5 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-accent"><CheckCircle2 className="h-9 w-9" /></span>
      <div className="space-y-1"><p role="status" className="text-lg font-semibold text-foreground">Limite liberado!</p><p className="text-sm text-muted-foreground">Pagamento aprovado. Seu limite diário voltou a zero e você já pode continuar usando.</p></div>
      <Button onClick={onClose} className="h-11 w-full bg-accent text-accent-foreground hover:bg-accent/90">Concluir</Button>
    </div>
    : pix ? <div className="space-y-5">
      <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Valor a pagar</p><p className="text-2xl font-bold text-foreground">{money(DAILY_RESET_PRICE_CENTS)}</p></div><span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">PIX</span></div>
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        {pix.qrBase64 && <div className="mx-auto w-fit rounded-xl bg-background p-3 ring-1 ring-border"><img className="h-48 w-48" src={`data:image/png;base64,${pix.qrBase64}`} alt="QR Code PIX do reset de limite" /></div>}
        <p className="mt-3 text-center text-xs text-muted-foreground">Abra o app do seu banco e escaneie o QR Code</p>
      </div>
      <div className="space-y-2"><p className="text-xs font-medium text-muted-foreground">Ou use o PIX copia e cola</p>
        <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-muted/40 p-1.5 pl-3"><code aria-label="Código PIX" className="block min-w-0 flex-1 truncate text-xs text-foreground">{pix.qrCode}</code><Button size="sm" variant={copied ? 'secondary' : 'outline'} onClick={async () => { try { await navigator.clipboard.writeText(pix.qrCode); setCopied(true); } catch { setError('Não foi possível copiar o PIX.'); } }}>{copied ? <Check /> : <Copy />}{copied ? 'Copiado' : 'Copiar'}</Button></div>
      </div>
      <div role="status" className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${failed ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-foreground'}`}>{failed ? 'Pagamento não aprovado. Feche e gere um novo PIX.' : <><span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:animate-none" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" /></span>Aguardando o pagamento… a liberação é automática.</>}</div>
      <Button onClick={() => void verify()} className="h-11 w-full bg-accent text-accent-foreground hover:bg-accent/90">Já paguei, verificar</Button>
    </div>
    : <div className="space-y-5">
      <div className="flex items-end justify-between rounded-2xl border border-accent/25 bg-accent/5 p-5"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Pagamento único</p><p className="mt-1 text-sm text-foreground">Reset imediato do limite</p></div><p className="text-3xl font-bold tracking-tight text-foreground">{money(DAILY_RESET_PRICE_CENTS)}</p></div>
      <ul className="grid gap-2.5">
        {[
          { icon: Zap, title: 'Liberação na hora', text: 'O consumo do dia volta a zero assim que o PIX é aprovado.' },
          { icon: Clock, title: 'Renovação mantida', text: 'O reset automático das 00:00 (Brasília) continua igual.' },
          { icon: ShieldCheck, title: 'Nada muda na chave', text: 'Mesma chave, mesmos modelos e mesma validade.' },
        ].map(({ icon: Icon, title, text }) => <li key={title} className="flex gap-3 rounded-xl border border-border bg-card p-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent"><Icon className="h-4 w-4" /></span><div><p className="text-sm font-semibold text-foreground">{title}</p><p className="text-xs text-muted-foreground">{text}</p></div></li>)}
      </ul>
      <Button disabled={busy} onClick={() => void generate()} className="h-11 w-full bg-accent text-base text-accent-foreground hover:bg-accent/90">{busy ? 'Gerando PIX…' : `Pagar ${money(DAILY_RESET_PRICE_CENTS)} via PIX`}</Button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" />Pagamento seguro via PIX</p>
    </div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  </DialogContent></Dialog>;
}
