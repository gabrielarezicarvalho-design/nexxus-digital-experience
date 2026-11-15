export type ProviderFailure = { provider: string; model: string; status: number; latencyMs: number; cause: string };

export function sanitizeProviderCause(value: string, credentials: string[] = []) {
  let safe = value;
  for (const credential of credentials) if (credential) safe = safe.split(credential).join('[credencial omitida]');
  return safe.replace(/Bearer\s+[^\s"<>]+/gi, 'Bearer [credencial omitida]')
    .replace(/\b(?:sk-|cc_|fm_|freellmapi-|sub_live_)[A-Za-z0-9_-]+/g, '[credencial omitida]')
    .replace(/\b(token|api[_-]?key|authorization|password|secret)\s*["']?\s*[:=]\s*["']?[^\s,;"<>]+/gi, '$1=[credencial omitida]')
    .replace(/https?:\/\/[^\s"<>]+/gi, '[endereço omitido]').slice(0, 500);
}

export function routingDiagnostic(error: string | undefined, failures: ProviderFailure[]) {
  const safe = error ? sanitizeProviderCause(error) : null;
  return failures.length ? JSON.stringify({ error: safe, attempts: failures }) : safe;
}

export function parseRoutingDiagnostic(value: string | null): { error: string | null; attempts: ProviderFailure[] } {
  try {
    const row = JSON.parse(value || 'null');
    if (row && Array.isArray(row.attempts)) return { error: row.error, attempts: row.attempts };
  } catch { /* Older logs remain readable. */ }
  return { error: value, attempts: [] };
}