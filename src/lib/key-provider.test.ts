import { expect, test } from 'bun:test';
import { keyProvider } from './key-provider';

test('only the assigned key is fixed to Lauren; sibling keys keep their routing', () => {
  const clients = { forced_provider: null };
  expect(keyProvider({ forced_provider: 'Lauren API', clients })).toBe('Lauren API');
  expect(keyProvider({ forced_provider: null, clients })).toBeNull();
  expect(keyProvider({ clients })).toBeNull();
});

test('key assignment wins over account assignment; untouched keys inherit it', () => {
  const clients = { forced_provider: 'Invision' };
  expect(keyProvider({ forced_provider: 'Lauren API', clients })).toBe('Lauren API');
  expect(keyProvider({ forced_provider: null, clients })).toBe('Invision');
});