// Distribuição de pedidos por fornecedor para o card de Fornecedores do painel admin.
// Os fornecedores chegam ordenados do mais usado para o menos usado (RPC admin_dashboard_summary).
export const PROVIDER_COLORS = [
  "var(--ops-lime)",
  "oklch(0.62 0.13 250)",
  "oklch(0.66 0.15 150)",
  "oklch(0.58 0.12 310)",
  "oklch(0.72 0.12 80)",
  "oklch(0.5 0.08 260)",
] as const;

export type ProviderRow = { provider: string; requests: number };
export type ProviderShare = {
  name: string;
  requests: number;
  color: string;
  pct: number;
  start: number;
  end: number;
};

export function providerShares(rows: ProviderRow[]): ProviderShare[] {
  const total = rows.reduce((sum, row) => sum + Number(row.requests), 0);
  if (!total) return [];
  let cursor = 0;
  return rows.map((row, index) => {
    const requests = Number(row.requests);
    const pct = (requests / total) * 100;
    const start = cursor;
    cursor += pct;
    return {
      name: row.provider || "Sem fornecedor",
      requests,
      color: PROVIDER_COLORS[index % PROVIDER_COLORS.length]!,
      pct,
      start,
      end: Math.min(100, cursor),
    };
  });
}
