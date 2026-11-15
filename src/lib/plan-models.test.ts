import { describe, expect, test } from 'bun:test';
import { filterPlanModels } from './plan-models';

const catalog = ['claude-opus-5-5', 'claude-sonnet-5', 'claude-fable-5.1', 'gpt-6-astra', 'gpt-5.6-luna', 'glm-nexa-novidade'];

describe('modelos por plano mensal', () => {
  test('Pro: só Opus 5.5 e Sonnet 5', () => expect(filterPlanModels(['opus55', 'sonnet5'], catalog)).toEqual(['claude-opus-5-5', 'claude-sonnet-5']));
  test('Max: Pro + Fable 5.1', () => expect(filterPlanModels(['opus55', 'sonnet5', 'fable51'], catalog)).toEqual(['claude-opus-5-5', 'claude-sonnet-5', 'claude-fable-5.1']));
  test('Enterprise: Max + GPT-5.6 Luna, sem Astra', () => expect(filterPlanModels(['opus55', 'sonnet5', 'fable51', 'gpt56luna'], catalog)).toEqual(['claude-opus-5-5', 'claude-sonnet-5', 'claude-fable-5.1', 'gpt-5.6-luna']));
  test('Teams inclui GLM', () => expect(filterPlanModels(['opus55', 'sonnet5', 'fable51', 'gpt56luna', 'gemini', 'glm'], catalog).includes('glm-nexa-novidade')).toBe(true));
  test('chave sem plano mensal não é filtrada', () => expect(filterPlanModels(null, catalog)).toEqual(catalog));
});
