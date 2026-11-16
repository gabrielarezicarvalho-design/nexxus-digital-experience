// DevHub Brasil combos: each public combo name is answered by every Claude model the DevHub lists,
// one after another, so a model that fails hands the request straight to the next one.
// Transport detail only: the public model name shown to the client never changes.
export const DEVHUB_PROVIDER = "DevHub Brasil";

export const DEVHUB_COMBOS = [
  "claude-opus-4-8", "claude-opus-5-5", "claude-fable-5-1",
  "claude-sonnet-5-5", "claude-haiku-5-5", "claude-fable-5-2",
  // 15/11/2026: claude-opus-5 also falls back to other DevHub Claude models when it fails.
  "claude-opus-5", "claude-sonnet-5", "claude-fable-5",
] as const;

const spelling = (id: string) => id.toLowerCase().replace(/[._]/g, "-");

/** Fastest DevHub Claude models first (measured from the VPS on 15/11/2026), used for the Haiku combo. */
export const DEVHUB_FAST_ORDER = ["claude-fable-5-1", "claude-opus-5-5", "claude-sonnet-5", "claude-opus-5"];

export function isDevhubCombo(account: { name: string }, model: string): boolean {
  return account.name === DEVHUB_PROVIDER && DEVHUB_COMBOS.some((combo) => combo === spelling(model));
}

/** Models tried for a combo, in order: the same-named model, the fastest measured models, then the saved list order. */
export function devhubComboModels(account: { name: string; available_models?: string[] | null }, model: string): string[] | null {
  if (!isDevhubCombo(account, model)) return null;
  // Only the DevHub's own Claude models sit behind the combos.
  const list = [...new Set(account.available_models ?? [])].filter((m) => /^claude-/i.test(m));
  if (!list.length) return null;
  const same = list.filter((m) => spelling(m) === spelling(model));
  // The DevHub has no Haiku: answer it with the fastest Claude measured (15/11/2026), so quick first
  // requests from Claude Code do not time out on the client while a slow model is still thinking.
  // After the same-named model, every combo falls back to the fastest models first (Gabriel, 15/11/2026).
  const preferred = DEVHUB_FAST_ORDER.map((id) => list.find((m) => spelling(m) === id)).filter((m): m is string => Boolean(m) && !same.includes(m as string));
  return [...same, ...preferred, ...list.filter((m) => !same.includes(m) && !preferred.includes(m))];
}

// 9Router (Anthropic Revenda) is only the reserve for families the DevHub does not sell (GPT, Gemini…).
// Gabriel, 15/11/2026: Claude never falls back to it, so a Claude request is never answered by another model.
export const NON_CLAUDE_RESERVE_PROVIDER = "Anthropic Revenda";

/** Claude goes only to the DevHub; GPT and other families go only to the 9Router reserve. */
export function devhubServesInCommonLine(account: { name: string }, model: string): boolean {
  const claude = /^claude-/i.test(model.trim());
  if (account.name === DEVHUB_PROVIDER) return claude;
  if (account.name === NON_CLAUDE_RESERVE_PROVIDER) return !claude;
  return true;
}
