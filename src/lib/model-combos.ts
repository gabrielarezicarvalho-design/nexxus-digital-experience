// Combos (aba Admin → Combos): um nome que tenta modelos de vários fornecedores.
// O nome é livre (Gabriel, 16/11/2026). Única regra: se o nome é de modelo de outra empresa (Claude, GPT, Gemini),
// todos os modelos do combo precisam ser mesmo dessa família, para o cliente receber o que o nome diz.
export type ComboStrategy = "fallback" | "round_robin";
export type ComboItem = { provider: string; model: string };

const RESERVED = new Set(["nexa-reserva", "suporte-queda"]);
const NAME_RE = /^[a-z0-9][a-z0-9._-]{1,63}$/;
// Fornecedores cujos nomes "claude-*" não entregam Claude (pool de outros modelos).
const NOT_REAL_CLAUDE = new Set(["Anthropic Revenda", "Free.ai"]);

const FAMILIES = [
  { label: "Claude", name: /(claude|opus|sonnet|haiku|fable|mythos|anthropic)/, model: /claude/i },
  { label: "GPT", name: /(^|[^a-z])(gpt|openai|codex|o[1-9])([^a-z]|$)|gpt/, model: /(^|\/)(gpt|o[1-9]|codex)/i },
  { label: "Gemini", name: /(gemini|google)/, model: /gemini/i },
] as const;

export function comboFamily(name: string) {
  return FAMILIES.find((f) => f.name.test(name.toLowerCase())) ?? null;
}

/** Mensagem de erro, ou null se o nome pode ser usado com esses modelos. */
export function comboNameProblem(name: string, items: ComboItem[] = []): string | null {
  if (!NAME_RE.test(name)) return "Use só letras minúsculas, números, \".\", \"_\" ou \"-\" (2 a 64 caracteres), ex.: turbo-max.";
  if (RESERVED.has(name)) return "Esse nome é reservado.";
  const family = comboFamily(name);
  if (!family) return null;
  const wrong = items.filter((it) => it.model && (!family.model.test(it.model) || (family.label === "Claude" && NOT_REAL_CLAUDE.has(it.provider))));
  if (wrong.length) return `Um combo com nome de ${family.label} só pode ter modelos ${family.label} de verdade. Troque o nome ou tire: ${wrong.map((w) => `${w.provider} · ${w.model}`).join(", ")}.`;
  return null;
}

/** Ordem das tentativas: em ordem (fallback) ou começando por um item diferente a cada pedido (rodízio). */
export function comboOrder<T>(items: T[], strategy: ComboStrategy, turn: number): T[] {
  if (strategy !== "round_robin" || items.length < 2) return items;
  const start = ((turn % items.length) + items.length) % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

const turns = new Map<string, number>();
export function nextComboTurn(name: string): number {
  const t = turns.get(name) ?? 0;
  turns.set(name, t + 1);
  return t;
}
