export type AdminClientSearchRow = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  api_keys: { key_prefix: string | null }[];
};

export function isFullApiKeySearch(value: string): boolean {
  const term = value.trim();
  return term.startsWith("sk-") && term.length >= 16;
}

export function filterAdminClients<T extends AdminClientSearchRow>(
  rows: T[],
  search: string,
  exactKeyClientId?: string | null,
): T[] {
  const term = search.trim().toLocaleLowerCase();
  if (!term) return rows;

  return rows.filter((row) => {
    if (exactKeyClientId && row.id === exactKeyClientId) return true;
    const searchable = [
      row.name,
      row.email,
      row.company ?? "",
      ...row.api_keys.map((key) => key.key_prefix ?? ""),
    ].join(" ").toLocaleLowerCase();
    return searchable.includes(term);
  });
}

/** Quando a busca é por chave (sk-…), mostra só a chave encontrada em vez de todas as chaves do cliente. */
export function visibleKeysForSearch<K extends { id: string; key_prefix: string | null }>(
  keys: K[],
  search: string,
  exactKeyId?: string | null,
): K[] {
  const term = search.trim().toLocaleLowerCase();
  if (!term.startsWith("sk-")) return keys;
  if (exactKeyId) return keys.filter((k) => k.id === exactKeyId);
  const byPrefix = keys.filter((k) => {
    const prefix = (k.key_prefix ?? "").toLocaleLowerCase();
    return prefix && (prefix.includes(term) || term.startsWith(prefix));
  });
  return byPrefix.length ? byPrefix : keys;
}
