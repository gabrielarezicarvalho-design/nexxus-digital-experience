import { test, expect } from 'bun:test';
import { apiModelList } from './api-model-list';

test('API collapses dotted and hyphenated aliases into a working catalog ID', () => {
  expect(apiModelList(['claude-opus-5.5', 'claude-opus-5-5', 'claude-fable-5.1', 'claude-fable-5-1'], ['claude-opus-5-5', 'claude-fable-5.1'])).toEqual(['claude-opus-5-5', 'claude-fable-5.1']);
});
test('Sonnet 5 plan does not advertise Sonnet 5.5 as a duplicate', () => {
  expect(apiModelList(['claude-sonnet-5', 'claude-sonnet-5-5'], [], ['sonnet5'])).toEqual(['claude-sonnet-5']);
});
test('dedicated DeepSeek ID is never relabeled GPT Astra', () => {
  expect(apiModelList(['deepseek-v4-flash-0731'], ['GPT 6 Astra', 'gpt-6-astra'], ['deepseekv4flash'])).toEqual(['deepseek-v4-flash-0731']);
});
test('Astra-only plan does not advertise DeepSeek', () => {
  expect(apiModelList(['deepseek-v4-flash-0731', 'gpt-6-astra'], [], ['astra'])).toEqual(['gpt-6-astra']);
});
test('different versions stay separate without plan restriction', () => {
  expect(apiModelList(['claude-sonnet-5', 'claude-sonnet-5-5'], []).length).toBe(2);
});
test('reported Enterprise chain yields one Opus, one Fable and Sonnet 5, preserving DeepSeek', () => {
  expect(apiModelList(['deepseek-v4-flash-0731', 'claude-sonnet-5', 'claude-opus-5.5', 'claude-fable-5.1', 'claude-fable-5-1', 'claude-opus-5-5', 'claude-sonnet-5-5'], ['claude-opus-5-5', 'claude-fable-5.1', 'claude-sonnet-5'], ['opus55', 'sonnet5', 'fable51', 'deepseekv4flash'])).toEqual(['deepseek-v4-flash-0731', 'claude-sonnet-5', 'claude-opus-5-5', 'claude-fable-5.1']);
});