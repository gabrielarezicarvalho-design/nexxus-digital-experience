// Models sold only to plans that list them explicitly (never via '*' or unrestricted keys),
// each served only by its owning provider so no other supplier answers under its name.
export const PLAN_EXCLUSIVE_MODELS: Record<string, string> = {
  'deepseek-v4.1-flash': 'Free AI',
};

const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');

export function planExclusiveModel(model: string): string | undefined {
  const n = norm(model);
  return Object.keys(PLAN_EXCLUSIVE_MODELS).find((id) => norm(id) === n);
}

export function planExclusiveProvider(model: string): string | undefined {
  const id = planExclusiveModel(model);
  return id ? PLAN_EXCLUSIVE_MODELS[id] : undefined;
}
