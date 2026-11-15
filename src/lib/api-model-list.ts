const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

// Only collapse punctuation aliases, never different model versions or families.
export function apiModelList(names: string[], catalog: string[], allowed?: readonly string[] | null) {
  const result = new Map<string, string>();
  for (const name of names) {
    const id = normalize(name);
    // A plan's Sonnet 5 is not Sonnet 5.5. Date suffixes remain distinct IDs.
    if (allowed && !allowed.includes('*') && !allowed.some(value => {
      const keyword = normalize(value);
      if (['claude', 'gpt', 'glm', 'gemini', 'deepseek'].includes(keyword)) return id.startsWith(keyword);
      const index = id.indexOf(keyword);
      if (index < 0 || !keyword) return false;
      const suffix = id.slice(index + keyword.length);
      return !/^\d/.test(suffix) || /^\d{4,8}$/.test(suffix);
    })) continue;
    const publicId = catalog.find(candidate => normalize(candidate) === id && names.includes(candidate)) ?? name;
    if (!result.has(id)) result.set(id, publicId);
  }
  return [...result.values()];
}