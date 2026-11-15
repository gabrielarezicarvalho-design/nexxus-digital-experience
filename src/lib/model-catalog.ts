export type CatalogModelName = {
  name: string;
  display_name?: string | null;
};

const catalogNameKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

// Public presentation only: aliases with the same visible name appear once.
// This never changes key permissions, provider routing, or stored model rows.
export function uniqueCatalogModels<T extends CatalogModelName>(models: T[]): T[] {
  const seenNames = new Set<string>();
  const seenLabels = new Set<string>();
  return models.filter(model => {
    const nameKey = catalogNameKey(model.name);
    const labelKey = catalogNameKey(model.display_name?.trim() || model.name);
    if (!nameKey || seenNames.has(nameKey) || seenLabels.has(labelKey)) return false;
    seenNames.add(nameKey);
    seenLabels.add(labelKey);
    return true;
  });
}
