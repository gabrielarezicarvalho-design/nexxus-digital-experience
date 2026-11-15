import { expect, test } from 'bun:test';
import { sameModelSpelling } from './upstream.server';

test('claude-fable-5.1 reaches Nexxus as claude-fable-5-1', () => {
  expect(sameModelSpelling(['claude-fable-5-1', 'claude-opus-5'], 'claude-fable-5.1')).toBe('claude-fable-5-1');
});
test('claude-opus-4-8 reaches a reserve as claude-opus-4.8', () => {
  expect(sameModelSpelling(['claude-opus-4.8'], 'claude-opus-4-8')).toBe('claude-opus-4.8');
});
test('different versions never match', () => {
  expect(sameModelSpelling(['claude-opus-5'], 'claude-opus-5.5')).toBeNull();
});
