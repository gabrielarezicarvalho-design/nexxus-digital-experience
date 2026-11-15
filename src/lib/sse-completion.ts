// Some providers answer non-streaming requests with SSE chunks. Rebuild the single
// chat.completion JSON the client asked for; return null when the text is not SSE.
type ToolCall = { id?: string; type?: string; function: { name: string; arguments: string } };

export function sseToCompletion(text: string): Record<string, unknown> | null {
  if (!/^\s*data:/m.test(text)) return null;
  let base: Record<string, unknown> | null = null;
  let content = "", reasoning = "", role = "assistant";
  let finish: unknown = null, usage: unknown = undefined;
  const tools: ToolCall[] = [];
  for (const line of text.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const d = line.slice(5).trim();
    if (!d || d === "[DONE]") continue;
    let j: any;
    try { j = JSON.parse(d); } catch { continue; }
    if (!base) base = { id: j.id, created: j.created, model: j.model };
    if (j.usage) usage = j.usage;
    const c = j.choices?.[0];
    if (!c) continue;
    const delta = c.delta ?? c.message ?? {};
    if (delta.role) role = delta.role;
    if (typeof delta.content === "string") content += delta.content;
    if (typeof delta.reasoning_content === "string") reasoning += delta.reasoning_content;
    for (const t of delta.tool_calls ?? []) {
      const i = typeof t.index === "number" ? t.index : tools.length;
      const cur = tools[i] ?? (tools[i] = { function: { name: "", arguments: "" } });
      if (t.id) cur.id = t.id;
      if (t.type) cur.type = t.type;
      if (t.function?.name) cur.function.name += t.function.name;
      if (t.function?.arguments) cur.function.arguments += t.function.arguments;
    }
    if (c.finish_reason) finish = c.finish_reason;
  }
  if (!base) return null;
  const message: Record<string, unknown> = { role, content };
  if (reasoning) message["reasoning_content"] = reasoning;
  const calls = tools.filter(Boolean).map((t) => ({ ...t, type: t.type ?? "function" }));
  if (calls.length) message["tool_calls"] = calls;
  return {
    ...base, object: "chat.completion",
    choices: [{ index: 0, message, finish_reason: finish ?? "stop" }],
    ...(usage ? { usage } : {}),
  };
}
