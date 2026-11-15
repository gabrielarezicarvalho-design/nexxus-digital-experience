import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchModelName } from './model-name-match';

const ANTHROPIC = ['claude-opus-5-5', 'claude-fable-5-1', 'claude-sonnet-5'];

test('ponto e hífen são o mesmo modelo', () => {
  assert.equal(matchModelName('claude-opus-5.5', ANTHROPIC), 'claude-opus-5-5');
  assert.equal(matchModelName('claude-fable-5.1', ANTHROPIC), 'claude-fable-5-1');
});

test('versões diferentes não se misturam', () => {
  assert.equal(matchModelName('claude-opus-5', ANTHROPIC), undefined);
  assert.equal(matchModelName('claude-fable-5', ANTHROPIC), undefined);
});

test('sufixo [1m] do modo 1 milhão de contexto usa o mesmo modelo', () => {
  assert.equal(matchModelName('claude-opus-5-5[1m]', ANTHROPIC), 'claude-opus-5-5');
  assert.equal(matchModelName('claude-fable-5.1[1M]', ANTHROPIC), 'claude-fable-5-1');
  assert.equal(matchModelName('claude-opus-5[1m]', ANTHROPIC), undefined);
});
