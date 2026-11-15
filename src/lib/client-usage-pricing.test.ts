import { describe, expect, test } from 'bun:test';
import { cacheSavingsCents, usagePriceModel, dailyUsageCost, planReferenceBalance, sumUsageCost, usageCostCents } from './client-usage-pricing';
const close = (actual: number | null, expected: number) => expect(actual == null ? null : Math.round(actual * 100)).toBe(Math.round(expected * 100));

test('Uso usa entrada/saída do Sonnet da aba Modelos com dólar a 5,40', () => {
  close(usageCostCents({ model: 'claude-sonnet-5', prompt_tokens: 2_000_000, completion_tokens: 1_000_000 }), 5745.6);
});
test('GPT Luna tem seu próprio preço, sem média global', () => {
  close(usageCostCents({ model: 'gpt-5.6-luna', prompt_tokens: 1_000_000, completion_tokens: 1_000_000 }), 582.12);
});
test('Fable 5.1 usa o mesmo padrão estimado exibido em Modelos', () => {
  close(usageCostCents({ model: 'claude-fable-5.1', prompt_tokens: 2_000_000, completion_tokens: 1_000_000 }), 28539);
});
test('total diário soma modelos e mantém ausência de preço explícita', () => {
  const rows = [{ day: '2026-11-01', model: 'gpt-5.6-luna', tokens: 2_000_000, prompt_tokens: 1_000_000, completion_tokens: 1_000_000 }];
  close(dailyUsageCost(rows, '2026-11-01', 2_000_000), 582.12);
  expect(dailyUsageCost(rows, '2026-10-31', 3)).toBeNull();
  expect(sumUsageCost([...rows, { model: 'unknown', tokens: 1, prompt_tokens: 1, completion_tokens: 0 }])).toBeNull();
  expect(usageCostCents({ model: 'claude-sonnet-5', tokens: 100 })).toBeNull();
});

test('saldo começa no valor do plano e acompanha a proporção de tokens restantes', () => {
  expect(planReferenceBalance(3490, { limit: 30_000_000, used: 0 })).toBe(3490);
  close(planReferenceBalance(3490, { limit: 30_000_000, used: 15_000_000 }), 1745);
});
test('saldo só mostra zero quando acabam os tokens, nunca por arredondamento', () => {
  expect(planReferenceBalance(3490, { limit: 30_000_000, used: 29_999_999 })).toBe(1);
  expect(planReferenceBalance(3490, { limit: 30_000_000, used: 30_000_000 })).toBe(0);
  expect(planReferenceBalance(3490, { limit: 30_000_000, used: 30_000_001 })).toBe(0);
});
test('saldo mantém dados ausentes explícitos e não esgota planos sem teto', () => {
  expect(planReferenceBalance(null, { limit: 30_000_000, used: 0 })).toBeNull();
  expect(planReferenceBalance(3490, null)).toBeNull();
  expect(planReferenceBalance(3490, { limit: null, used: 90_000_000 })).toBe(3490);
  expect(planReferenceBalance(3490, { limit: 0, used: 0 })).toBeNull();
});
test('apelidos registrados usam a tarifa do modelo equivalente da aba Modelos', () => {
  expect(usagePriceModel('claude-opus-5-5')).toBe('claude-opus-5.5');
  expect(usagePriceModel('anthropic/claude-haiku-5.5')).toBe('claude-haiku-4.5');
  expect(usagePriceModel('cloud-fable-5.1')).toBe('claude-fable-5.1');
  expect(usagePriceModel('nexa-sonnet-5')).toBe('claude-sonnet-5');
  expect(usagePriceModel('claude')).toBe('claude-sonnet-5');
  expect(usagePriceModel('claude-opus-4-6')).toBe('claude-opus-4.6');
  expect(usagePriceModel('unknown')).toBeNull();
  close(usageCostCents({ model: 'nexa-sonnet-5', prompt_tokens: 2_000_000, completion_tokens: 1_000_000 }), 5745.6);
});

describe('callsSavings', () => {
  test('reports official minus paid and never negative', async () => {
    const { callsSavings } = await import('./client-usage-pricing');
    const row = { model: 'claude-sonnet-5', prompt_tokens: 1_000_000, completion_tokens: 0 };
    const base = callsSavings([row]);
    expect(base.savings).toBe(0);
    const official = base.official!;
    const cheap = { 'claude-sonnet-5': { input: 0, output: 0, estimated: false, inputBrl: official / 200, outputBrl: 0 } };
    const r = callsSavings([row], cheap);
    close(r.paid, official / 2);
    close(r.percent, 50);
  });
});

test('economia de cache precifica só os tokens descontados como entrada', () => {
  const full = usageCostCents({ model: 'claude-sonnet-5', prompt_tokens: 900_000, completion_tokens: 0 });
  expect(cacheSavingsCents([{ model: 'claude-sonnet-5', discount_tokens: 900_000 }, { model: 'claude-sonnet-5', discount_tokens: 0 }])).toBe(full);
  expect(cacheSavingsCents([])).toBe(0);
});
