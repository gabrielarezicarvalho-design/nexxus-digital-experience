// Combos da Nexa (aba Admin → Combos): um nome da marca que tenta modelos de vários fornecedores.
// Regra do nome: começa com "nexa-" e nunca é nome de Claude/GPT/Gemini, para o cliente saber que é um combo da Nexa
// e não o modelo de outra empresa (Gabriel, 16/11/2026).
export type ComboStrategy = "fallback" | "round_robin";
export type ComboItem = { provider: string; model: string };

export const COMBO_PREFIX = "nexa-";
const RESERVED = new Set(["nexa-reserva"]);
const NAME_RE = /^nexa-[a-z0-9][a-z0-9._-]{1,60}$/;
const VENDOR_RE = /(claude|opus|sonnet|haiku|fable|mythos|anthropic|gpt|openai|codex|gemini|google)/;

export function isComboName(name: string): boolean {
  return name.toLowerCase().startsWith(COMBO_PREFIX) && !RESERVED.has(name.toLowerCase());
}

/** Mensagem de erro, ou null se o nome pode ser usado. */
export function comboNameProblem(name: string): string | null {
  if (!NAME_RE.test(name)) return 'O nome precisa começar com "nexa-" e usar só letras minúsculas, números, ".", "_" ou "-" (ex.: nexa-turbo).';
  if (RESERVED.has(name)) return "Esse nome é reservado.";
  if (VENDOR_RE.test(name.slice(COMBO_PREFIX.length))) return "O nome do combo não pode usar nome de modelo de outra empresa (Claude, GPT, Gemini...). Use um nome da sua marca, como nexa-turbo.";
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
