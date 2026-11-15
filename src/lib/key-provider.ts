// Apply only to a key already resolved by authenticated ownership or API-key auth.
export function keyProvider(key: { forced_provider?: string | null; clients?: unknown }): string | null {
  const client = key.clients as { forced_provider?: string | null } | null | undefined;
  return key.forced_provider ?? client?.forced_provider ?? null;
}