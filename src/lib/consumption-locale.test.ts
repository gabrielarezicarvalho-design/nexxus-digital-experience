import { expect, test } from 'bun:test';
import { consumptionLocale } from './consumption-locale';

test('English browser preference selects English even in Brazil', () => {
  expect(consumptionLocale(['en-US', 'pt-BR'], 'BR')).toBe('en');
});
test('Portuguese browser preference selects Portuguese even abroad', () => {
  expect(consumptionLocale(['pt-PT', 'en'], 'US')).toBe('pt-BR');
});
test('country selects English when browser language is unsupported', () => {
  expect(consumptionLocale(['fr-FR'], 'FR')).toBe('en');
});
test('Portuguese-speaking country selects Portuguese with unsupported browser language', () => {
  expect(consumptionLocale(['es'], 'BR')).toBe('pt-BR');
});
test('unknown country and browser preserve Portuguese fallback', () => {
  expect(consumptionLocale([], 'XX')).toBe('pt-BR');
  expect(consumptionLocale([])).toBe('pt-BR');
});
test('excluded browser language does not override accepted preference', () => {
  expect(consumptionLocale(['pt;q=0', 'en;q=0.9'], 'BR')).toBe('en');
});