// Anti mass-dispatch guard shared by both generation protocols.
// Decision lives in the check_key_rpm DB function; these constants are passed to it so values cannot diverge.
export const MASS_AGENT_THROTTLE_RPM = 5;
export const MASS_AGENT_DETECT_FACTOR = 2;
export const MASS_AGENT_RELEASE_MINUTES = 10;

export const RPM_LIMIT_MESSAGE = 'Limite de RPM batido, aguarde ou faça um upgrade para um plano superior';

export type RpmCheck = { blocked: boolean; throttled: boolean; effective_rpm: number; attempts: number; until_at: string | null };

export function massAgentMessage(untilAt: string | null) {
  const when = untilAt
    ? new Date(untilAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
    : null;
  return `Detectamos disparo em massa nesta chave (agente ou bot enviando pedidos sem parar). O limite foi reduzido para ${MASS_AGENT_THROTTLE_RPM} requisições por minuto até o disparo parar. Desligue o agente/bot: a chave volta ao normal sozinha após ${MASS_AGENT_RELEASE_MINUTES} minutos sem passar desse limite${when ? ` (no mínimo às ${when}, horário de Brasília)` : ''}.`;
}

export async function checkKeyRpm(db: any, keyId: string): Promise<RpmCheck> {
  const { data } = await db.rpc('check_key_rpm', {
    _key_id: keyId,
    _throttle_rpm: MASS_AGENT_THROTTLE_RPM,
    _detect_factor: MASS_AGENT_DETECT_FACTOR,
    _release_minutes: MASS_AGENT_RELEASE_MINUTES,
  });
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? { blocked: false, throttled: false, effective_rpm: 0, attempts: 0, until_at: null };
}

/** Returns the log label and client message when the request must be refused, or null to continue. */
export function rpmRefusal(check: RpmCheck): { log: string; message: string } | null {
  if (!check.blocked) return null;
  if (check.throttled) return { log: `agente em massa: limite ${MASS_AGENT_THROTTLE_RPM} RPM`, message: massAgentMessage(check.until_at) };
  return { log: 'rate limit', message: RPM_LIMIT_MESSAGE };
}
