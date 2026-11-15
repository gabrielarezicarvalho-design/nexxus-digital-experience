import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Copy, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { checkTokenUpgradePix, createTokenUpgradePix, getTokenUpgradePackages } from '@/lib/token-upgrade.functions';
import { asFamily, familyPriceCents } from '@/lib/model-family';

const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
const count = (n: number) => new Intl.NumberFormat('pt-BR').format(n);

export function TokenUpgradeDialog({ keyId, family, onClose }: { keyId: string; family: string; onClose: () => void }) {
  const create = useServerFn(createTokenUpgradePix), check = useServerFn(checkTokenUpgradePix), packages = useServerFn(getTokenUpgradePackages);
  const qc = useQueryClient();
  const catalog = useQuery({ queryKey: ['token-upgrade-packages'], queryFn: () => packages() });
  const [plan, setPlan] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [status, setStatus] = useState('pending'), [copied, setCopied] = useState(false);
  const [pix, setPix] = useState<Awaited<ReturnType<typeof create>> | null>(null);
  async function verify() {
    if (!pix) return;
    try {
      const result = await check({ data: { id: pix.id } });
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
    try { setPix(await create({ data: { keyId, plan } })); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível gerar o PIX.'); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Adicionar tokens à mesma chave</DialogTitle><DialogDescription>O saldo aumenta após a aprovação do PIX. Sua chave, modelos e validade permanecem iguais.</DialogDescription></DialogHeader>
    {status === 'approved' ? <div className="space-y-4"><p role="status" className="font-semibold text-accent">Recarga aprovada! Tokens adicionados à sua chave.</p><Button onClick={onClose}>Concluir</Button></div> : pix ? <div className="space-y-4"><p className="font-semibold">{money(pix.amount * 100)}</p>{pix.qrBase64 && <img className="mx-auto h-56 w-56" src={`data:image/png;base64,${pix.qrBase64}`} alt="QR Code PIX da recarga" />}<textarea aria-label="Código PIX" readOnly value={pix.qrCode || ''} className="w-full rounded-md border border-border bg-background p-3 text-xs text-foreground" /><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(pix.qrCode); setCopied(true); } catch { setError('Não foi possível copiar o PIX.'); } }}><Copy />{copied ? 'Copiado' : 'Copiar PIX'}</Button><Button onClick={() => void verify()}>Já paguei, verificar</Button></div><p role="status" className="text-sm text-muted-foreground">{['cancelled','rejected','error'].includes(status) ? 'Pagamento não aprovado. Feche e gere um novo PIX.' : 'Aguardando aprovação do pagamento…'}</p></div> : <div className="space-y-4">{catalog.isPending ? <p>Carregando pacotes…</p> : catalog.error ? <p role="alert">Não foi possível carregar os pacotes.</p> : <label className="grid gap-2 text-sm">Pacote de tokens<select aria-label="Pacote de tokens" value={plan} onChange={e => setPlan(e.target.value)} className="w-full rounded-md border border-border bg-background p-3 text-foreground"><option value="">Escolha o pacote</option>{catalog.data?.map(p => <option key={p.code} value={p.code ?? ''}>{count(Number(p.token_limit))} tokens · {money(familyPriceCents(asFamily(family), p.price_cents))}</option>)}</select></label>}<Button disabled={!plan || busy} onClick={() => void generate()} className="w-full bg-accent text-accent-foreground hover:bg-accent/90"><Plus />{busy ? 'Gerando PIX…' : 'Comprar tokens extras'}</Button></div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </DialogContent></Dialog>;
}