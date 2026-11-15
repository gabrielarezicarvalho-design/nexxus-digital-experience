export type BalanceTone = "ok" | "warn" | "low" | "empty";
export function providerBalance(total: number, used: number) {
  const remaining = Math.max(0, total - used);
  const percent = total > 0 ? (remaining / total) * 100 : 0;
  const tone: BalanceTone = remaining <= 0 ? "empty" : percent <= 10 ? "low" : percent <= 25 ? "warn" : "ok";
  return { remaining, percent, tone };
}
/** Accepts "100M", "1,5B", "250000". */
export function parseTokenAmount(input: string): number | null {
  const m = input.trim().toUpperCase().replace(/\s/g, "").replace(",", ".").match(/^(\d+(?:\.\d+)?)([KMB]?)$/);
  if (!m) return null;
  const mult = { "": 1, K: 1e3, M: 1e6, B: 1e9 }[m[2] as "" | "K" | "M" | "B"];
  return Math.round(Number(m[1]) * mult);
}
export function formatTokens(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}B`;
  if (n >= 1e6) return `${(n / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  if (n >= 1e3) return `${(n / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}K`;
  return String(n);
}
