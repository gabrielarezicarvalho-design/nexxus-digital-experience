export type ConsumptionLocale = 'pt-BR' | 'en';

/** Supported browser preferences win; country is a fallback, never a nationality claim. */
export function consumptionLocale(languages: readonly string[], country = ''): ConsumptionLocale {
  for (const value of languages) {
    const [tag, ...parameters] = value.trim().toLowerCase().split(';');
    if (parameters.some(parameter => /^\s*q=0(?:\.0*)?\s*$/.test(parameter))) continue;
    if (tag === 'pt' || tag?.startsWith('pt-')) return 'pt-BR';
    if (tag === 'en' || tag?.startsWith('en-')) return 'en';
  }
  return ['BR', 'PT', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL'].includes(country.toUpperCase()) ? 'pt-BR' : country && /^[A-Z]{2}$/i.test(country) && !['XX', 'T1'].includes(country.toUpperCase()) ? 'en' : 'pt-BR';
}