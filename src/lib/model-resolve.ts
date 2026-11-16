// Decide qual modelo habilitado atende um nome pedido pelo cliente.
// Ordem: nome exato > nome normalizado > família (opus/sonnet/haiku/fable) > opus como padrão > primeiro.
// A lista é ordenada dentro da função para o resultado não depender da ordem em que o banco devolve as linhas.

const FAMILY = ["opus", "sonnet", "haiku", "fable"] as const;

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export function resolveModel(asked: string, enabled: string[]): string | undefined {
  const names = [...enabled].filter(Boolean).sort();
  const askedLower = asked.toLowerCase();
  const family = FAMILY.find((name) => askedLower.includes(name));
  return (
    names.find((name) => name === asked) ??
    names.find((name) => norm(name) === norm(asked)) ??
    (family ? names.find((name) => name.toLowerCase().includes(family)) : undefined) ??
    names.find((name) => name.toLowerCase().includes("opus")) ??
    names[0]
  );
}

// Escolhe o modelo da chave: nome exato (normalizado/[1m]) ou o equivalente mais próximo
// dentro da lista já filtrada pelo plano, para nunca chamar um modelo fora do plano.
import { planExclusiveModel } from "./plan-exclusive-models";
import { nexacleanModel } from "./nexaclean-models";

export function pickKeyModel(asked: string, names: string[], exact?: string): { model: string; substituted: boolean } | undefined {
  if (exact) return { model: exact, substituted: false };
  const usable = names.filter((n) => !n.startsWith("codecraft-"));
  // Never silently swap a request onto a plan-exclusive model (e.g. DeepSeek) unless it is all the key has.
  // Nexaclean (Free.ai) também: só atende quem pede o nome dele exatamente.
  const regular = usable.filter((n) => !planExclusiveModel(n) && !nexacleanModel(n));
  const model = resolveModel(asked, regular.length ? regular : usable);
  return model ? { model, substituted: true } : undefined;
}
