import { expect, test } from 'bun:test';
import { anthropicExhaustedJson, anthropicExhaustedStream, openAIExhaustedJson, TOKENS_EXHAUSTED_MESSAGE } from './tokens-exhausted-reply';

test('tokens esgotados respondem no balão com status 200', async () => {
  expect(anthropicExhaustedJson('claude-opus-5-5').content[0]?.text).toBe(TOKENS_EXHAUSTED_MESSAGE);
  expect(openAIExhaustedJson('x').choices[0]?.message.content).toBe(TOKENS_EXHAUSTED_MESSAGE);
  const s = anthropicExhaustedStream('m');
  expect(s.status).toBe(200);
  expect((await s.text()).includes(TOKENS_EXHAUSTED_MESSAGE)).toBe(true);
});
