/** Existing keys retain their plan screen, including expired or blocked plans. */
export function showFirstPlanCatalog(keys: readonly { id: string }[]): boolean {
  return keys.length === 0;
}