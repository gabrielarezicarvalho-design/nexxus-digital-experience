// Accepts dot/hyphen spelling differences (claude-opus-5.5 == claude-opus-5-5) against the allowed list.
const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9/]/g, "");

// Claude Code marks the 1M-context mode with a "[1m]" suffix; it names the same model.
const ONE_MILLION_SUFFIX = /\[1m\]$/i;

export function matchModelName(asked: string, names: string[]): string | undefined {
  if (names.includes(asked)) return asked;
  const n = norm(asked);
  const found = names.find((name) => norm(name) === n);
  if (found || !ONE_MILLION_SUFFIX.test(asked)) return found;
  return matchModelName(asked.replace(ONE_MILLION_SUFFIX, ""), names);
}
