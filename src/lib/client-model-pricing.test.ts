import { expect, test } from 'bun:test';
import { clientModelPrice, filterClientCatalog, referenceCostUsd, displayedModelPrice, displayedConsumption, cheapestClientModel, modelDisplayPrices, PRICE_TOKEN_UNIT } from './client-model-pricing';

const prices: [string, number, number][] = [
  ['claude-haiku-4.5', .718, 3.59], ['claude-sonnet-5.5', 1.52, 7.61],
  ['claude-sonnet-5', 1.52, 7.60], ['claude-sonnet-4.6', 2.16, 10.78],
  ['claude-sonnet-4.5', 2.77, 13.85], ['claude-fable-5', 7.55, 37.75],
  ['claude-opus-5', 3.88, 18.88], ['claude-opus-4.8', 3.59, 17.96],
  ['claude-opus-4.7', 3.59, 17.96], ['claude-opus-4.6', 3.59, 17.96],
  ['claude-opus-4.5', 4.62, 23.09], ['gpt-6.1-terra', .716, 3.58],
  ['gpt-5.6-luna', .154, .924], ['gpt-5.6-terra', 1.43, 8.60],
  ['gpt-5.4-mini', .632, 3.79], ['gpt-5.4-nano', .177, 1.10],
  ['gpt-oss-20b', .043, .189], ['gpt-5.5', 3.88, 22.65], ['gpt-5.6-sol', 3.02, 14.05],
];
for (const [id, input, output] of prices) test(`${id}: confirmed input/output USD per million`, () => {
  expect(clientModelPrice(id)).toEqual({ input, output });
});
test('unpriced versions and internal supplier names do not inherit prices', () => {
  for (const id of ['claude-opus-5-5', 'claude-opus-5.5', 'claude-fable-5.1', 'gpt-6-astra', 'openai/gpt-5.6-luna-invision']) expect(clientModelPrice(id)).toBeNull();
});
const names = ['claude-sonnet-5', 'cloud-opus-5.1', 'gpt-5.6-luna', 'GLM 5.3 Flash', 'glm-nexa-novidade', 'Gemini 4 Argon', 'deepseek-v4-flash'];
test('Todos retains the complete catalog including other model groups', () => expect(filterClientCatalog(names, 'all')).toEqual(names));
test('Cloud contains only Cloud family', () => expect(filterClientCatalog(names, 'claude')).toEqual(names.slice(0, 2)));
test('GPT groups GPT and GLM without including Cloud', () => expect(filterClientCatalog(names, 'openai')).toEqual(names.slice(2, 6)));
test('Cloud grouping recognizes scoped Cloud IDs without treating unknown models as Cloud', () => {
  expect(filterClientCatalog(['pool/claude-opus-5.5', 'NEXA Opus 4.8', 'gpt 6 astra', 'unknown'], 'claude')).toEqual(['pool/claude-opus-5.5', 'NEXA Opus 4.8']);
});
test('reference cost accounts for input and output separately', () => {
  expect(referenceCostUsd('claude-sonnet-5', 1_000_000, 2_000_000)).toBe(16.72);
  expect(referenceCostUsd('claude-opus-5.5', 1_000_000, 1_000_000)).toBeNull();
});
test('display converts Sonnet input and output at reference BRL 5.40 per USD', () => {
  const price = displayedModelPrice('claude-sonnet-5');
  expect(Math.round((price?.inputBrl ?? 0) * 100)).toBe(821);
  expect(Math.round((price?.outputBrl ?? 0) * 100)).toBe(4104);
  expect(price?.estimated).toBe(false);
  expect(PRICE_TOKEN_UNIT).toBe(1_000_000);
});
test('unconfirmed defaults are explicitly estimated, never confirmed tariffs', () => {
  expect(displayedModelPrice('claude-opus-5-5')?.estimated).toBe(true);
  expect(displayedModelPrice('glm-nexa-novidade')).toBeNull();
  expect(clientModelPrice('claude-opus-5-5')).toBeNull();
});
test('all current catalog IDs have display values without changing authorization', () => {
  for (const id of ['claude-fable-5.1', 'claude-opus-5-5', 'claude-sonnet-5', 'gpt-5.6-luna', 'gpt-5.6-terra', 'gpt-6-astra']) {
    expect(Boolean(displayedModelPrice(id))).toBe(true);
  }
});
test('calculator separately prices quantities without assuming an input/output split', () => {
  const result = displayedConsumption('claude-sonnet-5', 1_000_000, 2_000_000);
  expect(Math.round((result?.totalBrl ?? 0) * 100)).toBe(9029);
  expect(displayedConsumption('unknown', 10, 20)).toBeNull();
});
test('"Melhor negócio agora" shows the cheapest blended catalog model', () => {
  const catalog = ['claude-fable-5.1', 'claude-opus-5-5', 'claude-sonnet-5', 'glm-nexa-novidade', 'gpt-5.6-luna', 'gpt-5.6-terra', 'gpt-6-astra'];
  expect(cheapestClientModel(catalog)).toBe('gpt-5.6-luna');
  expect(cheapestClientModel([])).toBeNull();
  expect(cheapestClientModel(['cloud-opus-9.9', 'sem-tarifa'])).toBeNull();
});

for (const [alias, reference, input, output] of [
  ['Gemini 4 Argon', 'gpt-6-sol', 3.02, 14.05],
  ['GPT 6 Astra', 'gpt-6-astra', .716, 3.58],
  ['gpt-5.7-luna', 'gpt-5.6-luna', .154, .924],
  ['gpt-5.7-terra', 'gpt-5.6-terra', 1.43, 8.60],
] as const) test(`${alias}: existing reference displays estimated input/output without changing source`, () => {
  const value = displayedModelPrice(reference);
  if (!value) throw new Error('Missing reference tariff');
  const base = { [reference]: value };
  const price = displayedModelPrice(alias, modelDisplayPrices(base));
  expect(price?.input).toBe(input);
  expect(price?.output).toBe(output);
  expect(price?.estimated).toBe(true);
  expect(Object.keys(base)).toEqual([reference]);
  expect(price?.inputBrl).toBe(value.inputBrl);
  expect(price?.outputBrl).toBe(value.outputBrl);
});
test('display aliases preserve stored plan adjustment and exact alias prices', () => {
  const adjusted = { input: .01, output: .06, inputBrl: .054, outputBrl: .324, estimated: false };
  expect(modelDisplayPrices({ 'gpt-5.6-luna': adjusted })['gpt-5.7-luna']).toEqual({ ...adjusted, estimated: true });
  expect(modelDisplayPrices({ 'gpt-5.7-luna': adjusted })['gpt-5.7-luna']).toEqual(adjusted);
  expect(displayedModelPrice('unknown', modelDisplayPrices({}))).toBeNull();
});
test('catalog ID gemini-4-argon shows its reference price; GLM has none', () => {
  const sol = displayedModelPrice('gpt-6-sol');
  if (!sol) throw new Error('Missing reference tariff');
  const prices = modelDisplayPrices({ 'gpt-6-sol': sol });
  expect(displayedModelPrice('gemini-4-argon', prices)?.input).toBe(3.02);
  expect(displayedModelPrice('gemini-4-argon', prices)?.output).toBe(14.05);
  expect(displayedModelPrice('glm-5.3-flash', prices)).toBeNull();
});
test('hyphen spelling claude-opus-4-8 shows the same price as claude-opus-4.8', () => {
  const { displayedModelPrice } = require('./client-model-pricing');
  expect(displayedModelPrice('claude-opus-4-8')?.input).toBe(3.59);
  expect(displayedModelPrice('claude-opus-4-8')?.output).toBe(17.96);
});
