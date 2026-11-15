export type PushErrorStage = 'activation' | 'registration' | 'removal';

export function pushErrorMessage(error: unknown, stage: PushErrorStage): string {
  const value = error && typeof error === 'object' ? error : {};
  const raw = 'message' in value && typeof value.message === 'string'
    ? value.message : typeof error === 'string' ? error : 'O navegador não informou detalhes da falha.';
  const detail = raw
    .replace(/https?:\/\/[^\s)]+/gi, '[endereço omitido]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [credencial omitida]')
    .replace(/\b(token|api[_-]?key|authorization|password|secret)\s*[:=]\s*[^\s,;]+/gi, '$1=[credencial omitida]')
    .replace(/[A-Za-z0-9_:.\/-]{60,}/g, '[identificador omitido]')
    .slice(0, 600);
  const code = 'code' in value && (typeof value.code === 'string' || typeof value.code === 'number')
    ? String(value.code).replace(/[^a-zA-Z0-9/_.-]/g, '').slice(0, 80) : '';
  let reason = '';
  if (/permission|denied|notallowed/i.test(raw)) reason = 'O navegador recusou a permissão. Confira as notificações nas configurações do site; no iPhone, abra pelo ícone instalado.';
  else if (/no active service worker|push-worker-unavailable/i.test(raw)) reason = 'O serviço de notificações não conseguiu iniciar. Reabra o site e tente ativar novamente.';
  else if (/push-worker-timeout/i.test(raw)) reason = 'O serviço de notificações demorou demais para iniciar. Confira sua conexão e reabra o site.';
  else if (/vapid|invalid.*key/i.test(raw)) reason = 'A configuração web das notificações foi recusada e precisa ser conferida.';
  else if (/fetch|network|offline/i.test(raw)) reason = 'A conexão com o serviço falhou. Confira a internet do celular.';
  else if (/auth|unauthorized|sess|jwt/i.test(raw)) reason = 'Sua sessão não foi aceita. Entre novamente na conta.';
  const label = stage === 'registration' ? 'Falha ao cadastrar o celular' : stage === 'removal' ? 'Falha ao desativar os alertas' : 'Falha ao ativar as notificações';
  return `${label}: ${detail}${code ? ` (código: ${code})` : ''}${reason ? ` Motivo: ${reason}` : ''}`;
}