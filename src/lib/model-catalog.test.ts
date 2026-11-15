import { expect, test } from 'bun:test';
import { uniqueCatalogModels } from './model-catalog';

test('public catalog keeps only one entry for repeated visible model names', () => {
  const models = [
    { name: 'claude-opus-5-5', display_name: 'Claude Opus 5.5' },
    { name: 'claude-opus-5-6', display_name: 'claude-opus-5.5' },
    { name: 'gpt-5.6-luna', display_name: 'GPT 5.6 Luna' },
    { name: 'gpt-5.7-luna', display_name: 'gpt-5.6-luna' },
    { name: 'claude-sonnet-5', display_name: 'Claude Sonnet 5' },
  ];
  expect(uniqueCatalogModels(models).map(model => model.name)).toEqual([
    'claude-opus-5-5',
    'gpt-5.6-luna',
    'claude-sonnet-5',
  ]);
});

test('public catalog collapses punctuation aliases without merging different versions', () => {
  const models = [
    { name: 'gpt-6-astra', display_name: 'Astra — alias de GPT-5.6 Luna' },
    { name: 'GPT 6 Astra', display_name: 'GPT 6 Astra' },
    { name: 'claude-sonnet-5', display_name: 'Claude Sonnet 5' },
    { name: 'claude-sonnet-5-5', display_name: 'Claude Sonnet 5.5' },
  ];
  expect(uniqueCatalogModels(models).map(model => model.name)).toEqual([
    'gpt-6-astra',
    'claude-sonnet-5',
    'claude-sonnet-5-5',
  ]);
  expect(uniqueCatalogModels([
    { name: 'claude-fable-5.1' },
    { name: 'claude-fable-5-1' },
    { name: 'claude-fable-5-5' },
  ]).map(model => model.name)).toEqual(['claude-fable-5.1', 'claude-fable-5-5']);
});
