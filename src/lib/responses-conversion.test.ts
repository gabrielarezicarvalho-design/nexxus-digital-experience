import { describe, expect, test } from 'bun:test';
import { responsesToChat, chatToResponses, createResponsesStream, encodeResponsesEvent } from './responses-conversion';

const subset = (actual: unknown, expected: Record<string, unknown>) => {
  const value = actual as Record<string, unknown>;
  expect(Object.fromEntries(Object.keys(expected).map(key => [key, value[key]]))).toEqual(expected);
};

describe('Responses input to chat', () => {
  test('instructions and string input; ignore unsupported fields', () => {
    expect(responsesToChat({ model: 'claude-sonnet-5', instructions: 'Be precise', input: 'oi', store: true, include: [], reasoning: {}, text: {}, previous_response_id: 'old', prompt_cache_key: 'cache', stream: true, max_output_tokens: 42, temperature: 0.5, top_p: 0.9, parallel_tool_calls: false })).toEqual({ model: 'claude-sonnet-5', messages: [{ role: 'system', content: 'Be precise' }, { role: 'user', content: 'oi' }], stream: true, stream_options: { include_usage: true }, max_tokens: 42, temperature: 0.5, top_p: 0.9, parallel_tool_calls: false });
  });
  test('no system message without instructions', () => {
    expect(responsesToChat({ model: 'm', input: 'hello' })['messages']).toEqual([{ role: 'user', content: 'hello' }]);
  });
  test('developer maps to system, text concatenates, user images survive', () => {
    expect(responsesToChat({ model: 'm', input: [
      { role: 'developer', content: [{ type: 'input_text', text: 'a' }, { type: 'text', text: 'b' }] },
      { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'look' }, { type: 'input_image', image_url: 'https://example.com/image.png' }] },
      { role: 'assistant', content: [{ type: 'output_text', text: 'ok' }, { type: 'input_image', image_url: 'ignored' }] },
      { type: 'reasoning', content: 'private' }, { type: 'unknown' },
    ] })['messages']).toEqual([{ role: 'system', content: 'ab' }, { role: 'user', content: [{ type: 'text', text: 'look' }, { type: 'image_url', image_url: { url: 'https://example.com/image.png' } }] }, { role: 'assistant', content: 'ok' }]);
  });
  test('consecutive calls group, tool results serialize and later calls separate', () => {
    expect(responsesToChat({ model: 'm', input: [
      { type: 'function_call', call_id: 'a', name: 'read', arguments: '{"path":"x"}' },
      { type: 'function_call', call_id: 'b', name: 'list', arguments: {} },
      { type: 'function_call_output', call_id: 'a', output: { ok: true } },
      { type: 'function_call_output', call_id: 'b', output: ['x'] },
      { type: 'function_call', call_id: 'c', name: 'write', arguments: '{}' },
    ] })['messages']).toEqual([
      { role: 'assistant', content: null, tool_calls: [{ id: 'a', type: 'function', function: { name: 'read', arguments: '{"path":"x"}' } }, { id: 'b', type: 'function', function: { name: 'list', arguments: '{}' } }] },
      { role: 'tool', tool_call_id: 'a', content: '{"ok":true}' }, { role: 'tool', tool_call_id: 'b', content: '["x"]' },
      { role: 'assistant', content: null, tool_calls: [{ id: 'c', type: 'function', function: { name: 'write', arguments: '{}' } }] },
    ]);
  });
  test('function tools and named choice translate; hosted tools ignored', () => {
    const body = responsesToChat({ model: 'm', input: '', tools: [{ type: 'web_search' }, { type: 'function', name: 'read', description: 'Read a file', parameters: { type: 'object' } }], tool_choice: { type: 'function', name: 'read' } });
    expect(body['tools']).toEqual([{ type: 'function', function: { name: 'read', description: 'Read a file', parameters: { type: 'object' } } }]);
    expect(body['tool_choice']).toEqual({ type: 'function', function: { name: 'read' } });
    for (const choice of ['auto', 'none', 'required']) expect(responsesToChat({ model: 'm', input: '', tool_choice: choice })['tool_choice']).toBe(choice);
  });
});

describe('chat output to Responses', () => {
  test('text and calls preserve requested model and usage', () => {
    const result = chatToResponses({ model: 'secret', choices: [{ message: { content: 'Hello', tool_calls: [{ id: 'call_a', function: { name: 'read', arguments: '{}' } }] }, finish_reason: 'stop' }], usage: { prompt_tokens: 11, completion_tokens: 4, total_tokens: 15 } }, 'public');
    expect(result['id'].startsWith('resp_')).toBe(true);
    expect(result['model']).toBe('public'); expect(result.status).toBe('completed');
    subset(result['output'][0], { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Hello', annotations: [] }] });
    subset(result['output'][1], { type: 'function_call', call_id: 'call_a', name: 'read', arguments: '{}', status: 'completed' });
    expect(result['usage']).toEqual({ input_tokens: 11, output_tokens: 4, total_tokens: 15, input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 0 } });
  });
  test('no empty message, length means incomplete, missing usage is zero', () => {
    const result = chatToResponses({ choices: [{ message: { content: null }, finish_reason: 'length' }] }, 'm');
    expect(result['output']).toEqual([]); expect(result.status).toBe('incomplete'); expect(result.incomplete_details).toEqual({ reason: 'max_output_tokens' }); expect(result['usage'].total_tokens).toBe(0);
  });
});

describe('chat SSE to Responses SSE', () => {
  test('split lines and UTF-8, text lifecycle, interleaved calls, last usage and DONE', () => {
    const converter = createResponsesStream('public');
    const events = converter.start();
    const chunks = [
      { model: 'private', choices: [{ delta: { content: 'Olá ' } }] },
      { choices: [{ delta: { tool_calls: [{ index: 1, id: 'b', function: { name: 're', arguments: '{"' } }, { index: 0, id: 'a', function: { name: 'list', arguments: '{}' } }] } }] },
      { choices: [{ delta: { content: 'mundo', tool_calls: [{ index: 1, function: { name: 'ad', arguments: 'path":"x"}' } }] }, finish_reason: 'tool_calls' }] },
      { choices: [], usage: { prompt_tokens: 9, completion_tokens: 3, total_tokens: 12 } },
    ];
    const bytes = new TextEncoder().encode(chunks.map(chunk => `data: ${JSON.stringify(chunk)}\r\n\r\n`).join('') + 'data: [DONE]\n\n');
    for (let i = 0; i < bytes.length; i += 1) events.push(...converter.push(bytes.slice(i, i + 1)));
    events.push(...converter.end());
    expect(events.map(event => event.sequence_number)).toEqual(events.map((_, i) => i));
    expect(events.slice(0, 5).map(event => event['type'])).toEqual(['response.created', 'response.in_progress', 'response.output_item.added', 'response.content_part.added', 'response.output_text.delta']);
    const final = events.at(-1)?.['response'] as any;
    expect(final['model']).toBe('public'); expect(final['output'][0].content[0].text).toBe('Olá mundo');
    subset(final['output'][1], { call_id: 'b', name: 'read', arguments: '{"path":"x"}' });
    subset(final['output'][2], { call_id: 'a', name: 'list', arguments: '{}' });
    expect(final['usage'].total_tokens).toBe(12); expect(converter.getUsage()?.total_tokens).toBe(12);
    expect(events.filter(event => event['type'] === 'response.function_call_arguments.done').map(event => event['output_index'])).toEqual([1, 2]);
    expect(events.map(encodeResponsesEvent).join('').includes('private')).toBe(false);
    expect(encodeResponsesEvent(events[0] as any).startsWith('event: response.created\ndata: ')).toBe(true);
  });
  test('unterminated final data line parsed and absent usage is zero', () => {
    const converter = createResponsesStream('m'); converter.start();
    converter.push(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"ok"}}]}'));
    const events = converter.end(); expect((events.at(-1)?.['response'] as any).usage.total_tokens).toBe(0); expect(events[0]?.type).toBe('response.output_item.added');
  });
  test('length emits incomplete terminal status', () => {
    const converter = createResponsesStream('m'); converter.start(); converter.push(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"cut"},"finish_reason":"length"}]}\n'));
    const final = converter.end().at(-1);
    expect(final?.type).toBe('response.incomplete');
    subset(final?.['response'], { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } });
  });
  test('failure before or after text emits failed and never completed', () => {
    for (const hasText of [false, true]) {
      const converter = createResponsesStream('m'); converter.start(); if (hasText) converter.push(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"partial"}}]}\n'));
      const failed = converter.fail(502, 'failure');
      expect(failed.length).toBe(1); expect(failed[0]?.type).toBe('response.failed');
      subset(failed[0]?.['response'], { status: 'failed', error: { code: 502, message: 'failure' } });
      expect(converter.end()).toEqual([]);
    }
  });
  test('upstream error chunks reject so adapter can fail and account', () => {
    const converter = createResponsesStream('m');
    let error = '';
    try { converter.push(new TextEncoder().encode('data: {"error":{"message":"private"}}\n')); } catch (e) { error = (e as Error).message; }
    expect(error).toBe('Falha no stream do provedor');
  });
});