// Browser-safe, deterministic protocol conversion (apart from generated IDs/time).
type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
const string = (value: unknown) => typeof value === 'string' ? value : '';
const jsonString = (value: unknown) => typeof value === 'string' ? value : JSON.stringify(value ?? '');
const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export function responsesToChat(body: RecordValue): RecordValue {
  if (typeof body['input'] !== 'string' && !Array.isArray(body['input'])) throw new Error('input must be a string or array');
  const messages: RecordValue[] = [];
  if (typeof body['instructions'] === 'string') messages.push({ role: 'system', content: body['instructions'] });
  if (typeof body['input'] === 'string') messages.push({ role: 'user', content: body['input'] });
  else {
    let calls: RecordValue[] | undefined;
    for (const raw of body['input']) {
      const item = record(raw);
      if (item['type'] === 'function_call') {
        if (!calls) { calls = []; messages.push({ role: 'assistant', content: null, tool_calls: calls }); }
        calls.push({ id: string(item['call_id']), type: 'function', function: { name: string(item['name']), arguments: jsonString(item['arguments']) } });
        continue;
      }
      calls = undefined;
      if (item['type'] === 'function_call_output') {
        messages.push({ role: 'tool', tool_call_id: string(item['call_id']), content: jsonString(item['output']) });
        continue;
      }
      if (item['type'] && item['type'] !== 'message') continue;
      if (!['user', 'assistant', 'system', 'developer'].includes(string(item['role']))) continue;
      const role = item['role'] === 'developer' ? 'system' : item['role'];
      let content: unknown = string(item['content']);
      if (Array.isArray(item['content'])) {
        const parts: RecordValue[] = [];
        for (const rawPart of item['content']) {
          const part = record(rawPart);
          if (['input_text', 'output_text', 'text'].includes(string(part['type']))) parts.push({ type: 'text', text: string(part['text']) });
          else if (role === 'user' && part['type'] === 'input_image' && part['image_url']) {
            parts.push({ type: 'image_url', image_url: typeof part['image_url'] === 'string' ? { url: part['image_url'], ...(part['detail'] ? { detail: part['detail'] } : {}) } : part['image_url'] });
          }
        }
        content = parts.some(part => part['type'] === 'image_url') ? parts : parts.map(part => part['text']).join('');
      }
      messages.push({ role, content });
    }
  }
  const result: RecordValue = { model: body['model'], messages };
  for (const key of ['temperature', 'top_p', 'parallel_tool_calls', 'stream']) if (body[key] !== undefined) result[key] = body[key];
  if (body['max_output_tokens'] !== undefined) result['max_tokens'] = body['max_output_tokens'];
  if (body['stream'] === true) result['stream_options'] = { include_usage: true };
  if (Array.isArray(body['tools'])) result['tools'] = body['tools'].map(record).filter(tool => tool['type'] === 'function').map(tool => ({ type: 'function', function: { name: tool['name'], ...(tool['description'] !== undefined ? { description: tool['description'] } : {}), ...(tool['parameters'] !== undefined ? { parameters: tool['parameters'] } : {}) } }));
  if (['auto', 'none', 'required'].includes(string(body['tool_choice']))) result['tool_choice'] = body['tool_choice'];
  else { const choice = record(body['tool_choice']); if (choice['type'] === 'function') result['tool_choice'] = { type: 'function', function: { name: choice['name'] } }; }
  return result;
}

export type ResponsesItem = RecordValue;
type Usage = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; prompt_tokens_details?: { cached_tokens?: number | null } | null };
function responseObject(model: string, output: ResponsesItem[], usage: Usage | null, incomplete: boolean, responseId = id('resp'), created = Math.floor(Date.now() / 1000)) {
  const input = usage?.prompt_tokens ?? 0, out = usage?.completion_tokens ?? 0;
  return { id: responseId, object: 'response', created_at: created, status: incomplete ? 'incomplete' : 'completed', model, output,
    ...(incomplete ? { incomplete_details: { reason: 'max_output_tokens' } } : {}),
    usage: { input_tokens: input, output_tokens: out, total_tokens: usage?.total_tokens ?? input + out, input_tokens_details: { cached_tokens: Number(usage?.prompt_tokens_details?.cached_tokens ?? 0) || 0 }, output_tokens_details: { reasoning_tokens: 0 } },
    parallel_tool_calls: true, tool_choice: 'auto', tools: [] };
}
const textPart = (text: string) => ({ type: 'output_text', text, annotations: [] });
const messageItem = (text: string, itemId = id('msg')) => ({ type: 'message', id: itemId, role: 'assistant', status: 'completed', content: [textPart(text)] });

export function chatToResponses(raw: unknown, model: string) {
  const chat = record(raw), choice = record(Array.isArray(chat['choices']) ? chat['choices'][0] : null), message = record(choice['message']);
  const output: ResponsesItem[] = [];
  if (string(message['content'])) output.push(messageItem(string(message['content'])));
  if (Array.isArray(message['tool_calls'])) for (const rawCall of message['tool_calls']) {
    const call = record(rawCall), fn = record(call['function']);
    output.push({ type: 'function_call', id: id('fc'), call_id: string(call['id']), name: string(fn['name']), arguments: jsonString(fn['arguments']), status: 'completed' });
  }
  return responseObject(model, output, record(chat['usage']) as Usage, choice['finish_reason'] === 'length');
}

export interface ResponsesEvent extends RecordValue { type: string; sequence_number: number }

// Stateful pure converter: no IO. TextDecoder preserves split UTF-8 characters.
export function createResponsesStream(model: string) {
  const responseId = id('resp'), created = Math.floor(Date.now() / 1000);
  let sequence = 0, buffer = '', finished = false, incomplete = false;
  let usage: Usage | null = null;
  const decoder = new TextDecoder();
  const output: ResponsesItem[] = [];
  let textItem: { index: number; item: ResponsesItem; text: string } | undefined;
  const calls = new Map<number, { index: number; item: ResponsesItem }>();
  const event = (type: string, fields: RecordValue = {}): ResponsesEvent => ({ type, sequence_number: sequence++, ...fields });
  const base = () => ({ id: responseId, object: 'response', created_at: created, status: 'in_progress', model, output: [] });
  const start = () => [event('response.created', { response: base() }), event('response.in_progress', { response: base() })];
  const parseLine = (line: string): ResponsesEvent[] => {
    if (finished || !line.startsWith('data:')) return [];
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') return [];
    const chunk = record(JSON.parse(data));
    if (chunk['error']) throw new Error('Falha no stream do provedor');
    if (chunk['usage']) usage = record(chunk['usage']) as Usage;
    const choice = record(Array.isArray(chunk['choices']) ? chunk['choices'][0] : null), delta = record(choice['delta']);
    if (choice['finish_reason'] === 'length') incomplete = true;
    const events: ResponsesEvent[] = [];
    if (string(delta['content'])) {
      if (!textItem) {
        const item = { ...messageItem(''), status: 'in_progress', content: [] };
        textItem = { index: output.length, item, text: '' }; output.push(item);
        events.push(event('response.output_item.added', { output_index: textItem.index, item }), event('response.content_part.added', { item_id: item['id'], output_index: textItem.index, content_index: 0, part: textPart('') }));
      }
      textItem.text += string(delta['content']);
      events.push(event('response.output_text.delta', { item_id: textItem.item['id'], output_index: textItem.index, content_index: 0, delta: delta['content'] }));
    }
    if (Array.isArray(delta['tool_calls'])) for (const rawCall of delta['tool_calls']) {
      const deltaCall = record(rawCall), fn = record(deltaCall['function']), index = Number(deltaCall['index'] ?? 0);
      let call = calls.get(index);
      if (!call) {
        const item = { type: 'function_call', id: id('fc'), call_id: string(deltaCall['id']), name: '', arguments: '', status: 'in_progress' };
        call = { index: output.length, item }; calls.set(index, call); output.push(item);
        // Copy to avoid mutating an already-emitted event's item.
        events.push(event('response.output_item.added', { output_index: call['index'], item: { ...item, name: string(fn['name']) } }));
      }
      if (deltaCall['id']) call.item['call_id'] = deltaCall['id'];
      call.item['name'] = string(call.item['name']) + string(fn['name']);
      if (string(fn['arguments'])) {
        call.item['arguments'] = string(call.item['arguments']) + string(fn['arguments']);
        events.push(event('response.function_call_arguments.delta', { item_id: call.item['id'], output_index: call['index'], delta: fn['arguments'] }));
      }
    }
    return events;
  };
  const push = (chunk: Uint8Array): ResponsesEvent[] => {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n'); buffer = lines.pop() ?? '';
    return lines.flatMap(line => parseLine(line.replace(/\r$/, '')));
  };
  const end = (): ResponsesEvent[] => {
    if (finished) return [];
    buffer += decoder.decode();
    const events = buffer ? parseLine(buffer.replace(/\r$/, '')) : []; buffer = '';
    if (textItem) {
      const fields = { item_id: textItem.item['id'], output_index: textItem.index, content_index: 0 };
      const final = messageItem(textItem.text, string(textItem.item['id'])); output[textItem.index] = final;
      events.push(event('response.output_text.done', { ...fields, text: textItem.text }), event('response.content_part.done', { ...fields, part: textPart(textItem.text) }), event('response.output_item.done', { output_index: textItem.index, item: final }));
    }
    for (const call of calls.values()) {
      const final: ResponsesItem = { ...call.item, status: 'completed' }; output[call['index']] = final;
      events.push(event('response.function_call_arguments.done', { item_id: final['id'], output_index: call['index'], arguments: final['arguments'] }), event('response.output_item.done', { output_index: call['index'], item: final }));
    }
    finished = true;
    events.push(event(incomplete ? 'response.incomplete' : 'response.completed', { response: responseObject(model, output, usage, incomplete, responseId, created) }));
    return events;
  };
  const fail = (code: number, message: string): ResponsesEvent[] => {
    if (finished) return [];
    finished = true;
    return [event('response.failed', { response: { ...base(), output, status: 'failed', error: { code, message } } })];
  };
  return { start, push, end, fail, getUsage: () => usage };
}

export function encodeResponsesEvent(event: ResponsesEvent): string {
  return `event: ${event['type']}\ndata: ${JSON.stringify(event)}\n\n`;
}