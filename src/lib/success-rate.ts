// Exclusions are supplied by trusted aggregates, never inferred from a name in the UI.
export function successRate(total: number, successful: number, excluded = 0): number {
  const measured = total - excluded;
  return measured > 0 ? (successful / measured) * 100 : 100;
}
