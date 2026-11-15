import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { enablePush } from '@/lib/push-registration';
import { registerPush, removePush } from '@/lib/push.functions';
import type { PushStatus } from '@/lib/push-rules';
import { pushErrorMessage, type PushErrorStage } from '@/lib/push-error';

const messages: Record<PushStatus, string> = {
  registered: 'Alertas de indisponibilidade ativados neste celular.',
  'not-configured': 'A conexão Firebase precisa ser atualizada com “Include web push” para liberar os alertas.',
  unsupported: 'Este navegador não aceita notificações. No iPhone, use iOS 16.4 ou superior e instale o site na tela inicial.',
  'open-in-new-tab': 'Abra o site em uma aba própria ou use o aplicativo instalado para permitir notificações.',
  denied: 'As notificações não foram autorizadas. Libere-as nas configurações deste site no navegador.',
};

export function PushAlerts({ userId }: { userId: string }) {
  const save = useServerFn(registerPush);
  const remove = useServerFn(removePush);
  const [device, setDevice] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setDevice(localStorage.getItem(`nexa-push-device:${userId}`)); }, [userId]);
  async function toggle() {
    setBusy(true);
    setMessage('');
    let stage: PushErrorStage = device ? 'removal' : 'activation';
    try {
      if (device) {
        await remove({ data: { id: device } });
        localStorage.removeItem(`nexa-push-device:${userId}`);
        setDevice(null); setMessage('Alertas desativados neste celular.');
      } else {
        const result = await enablePush();
        if (result.status === 'registered' && result.token) {
          stage = 'registration';
          const saved = await save({ data: { token: result.token } });
          if (!saved.id) throw new Error('Cadastro não confirmado.');
          localStorage.setItem(`nexa-push-device:${userId}`, saved.id);
          setDevice(saved.id);
        }
        setMessage(messages[result.status]);
      }
    } catch (error) { setMessage(pushErrorMessage(error, stage)); }
    finally { setBusy(false); }
  }
  return <section className="client-section">
    <div className="client-section-heading"><div><h2>Alertas no celular</h2><p>Indisponibilidade por mais de três minutos</p></div>
      <Button variant="outline" disabled={busy} onClick={() => void toggle()}>{device ? <BellOff /> : <Bell />}{busy ? 'Aguarde…' : device ? 'Desativar alertas' : 'Ativar notificações'}</Button>
    </div>
    {message && <p className="client-plan-note" role="status">{message}</p>}
  </section>;
}