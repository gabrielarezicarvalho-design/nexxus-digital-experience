import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";

const MAX_MESSAGES = 20;
const MAX_TEXT_CHARS = 4000;

// Só quem tem conta entra: o assistente usa um modelo pago.
async function signedInUser(request: Request): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  const db = createClient(url, key, { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.auth.getClaims(token);
  const sub = data?.claims?.sub;
  return !error && typeof sub === "string" ? sub : null;
}

// Aceita só texto curto dos últimos pedidos; nada de anexos ou papéis inventados.
function safeMessages(value: unknown): UIMessage[] | null {
  if (!Array.isArray(value) || !value.length) return null;
  const out: UIMessage[] = [];
  for (const raw of value.slice(-MAX_MESSAGES)) {
    const m = raw as { id?: unknown; role?: unknown; parts?: unknown };
    if (m?.role !== "user" && m?.role !== "assistant") return null;
    if (!Array.isArray(m.parts)) return null;
    const text = m.parts.map((p: { type?: unknown; text?: unknown }) => (p?.type === "text" && typeof p.text === "string" ? p.text : "")).join("");
    if (text.length > MAX_TEXT_CHARS) return null;
    out.push({ id: String(m.id ?? crypto.randomUUID()).slice(0, 100), role: m.role, parts: [{ type: "text", text }] });
  }
  return out[out.length - 1]?.role === "user" && out[out.length - 1]?.parts.length ? out : null;
}

const SYSTEM = `Você é o assistente da NEXA que ajuda visitantes a configurar o OpenCode ou o Claude Code. Responda em português do Brasil, de forma curta e prática, usando markdown e blocos de código quando útil. Baseie-se APENAS nas instruções abaixo, que são as mesmas mostradas na página. Se a pergunta fugir disso, diga educadamente que só ajuda com a configuração do OpenCode ou do Claude Code e sugira o suporte pelo WhatsApp.

Passos (OpenCode):
1. Instalar: npm install -g --allow-scripts=opencode-ai opencode-ai
2. Definir a chave no PowerShell: $env:NEXA_API_KEY = "SUA_CHAVE_AQUI" (a chave sk-nx-… que o cliente copia em "Já tenho chave" quando o pagamento aprova)
3. Entrar na pasta do projeto: cd "C:\\CAMINHO\\DO\\PROJETO"
4. Criar o arquivo com: notepad .\\opencode.json (não colar o JSON direto no PowerShell) e colar:
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "nexa": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "NEXA API",
      "options": {
        "baseURL": "https://api.cloudnexa.com.br/v1",
        "apiKey": "{env:NEXA_API_KEY}"
      },
      "models": { "claude-sonnet-5-5": { "name": "claude-sonnet-5-5" } }
    }
  }
}
Salvar e fechar o Bloco de Notas.
5. Abrir o OpenCode com: opencode
6. Dentro dele rodar /models e selecionar NEXA API → claude-sonnet-5.

Alternativa (Claude Code, terminal oficial da Anthropic, sem opencode.json):
1. Entrar na pasta do projeto: cd "C:\\CAMINHO\\DO\\PROJETO"
2. No PowerShell, apontar para a ponte da NEXA (SEM www):
$env:ANTHROPIC_BASE_URL = "https://api.cloudnexa.com.br"
3. Definir a chave: $env:ANTHROPIC_AUTH_TOKEN = "SUA_CHAVE_AQUI"
4. Rodar: claude
5. Dentro dele, rodar /model e escolher claude-sonnet-5. Usar na mesma janela do PowerShell em que definiu as variáveis.`;

export const Route = createFileRoute("/api/opencode-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await signedInUser(request))) return Response.json({ error: "Entre na sua conta para usar o assistente." }, { status: 401 });
        // VPS: ASSISTANT_BASE_URL/ASSISTANT_API_KEY point at our own gateway (OpenAI-compatible); otherwise Lovable AI.
        const ownBase = process.env["ASSISTANT_BASE_URL"];
        const apiKey = ownBase ? process.env["ASSISTANT_API_KEY"] : process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("Assistente não configurado.", { status: 500 });
        const body = (await request.json().catch(() => null)) as { messages?: unknown } | null;
        const messages = safeMessages(body?.messages);
        if (!messages) return Response.json({ error: "Pergunta inválida ou longa demais." }, { status: 400 });
        const result = ownBase
          ? streamText({
              model: createOpenAI({ baseURL: ownBase, apiKey }).chat(process.env["ASSISTANT_MODEL"] || "claude-sonnet-5-5"),
              system: SYSTEM,
              messages: await convertToModelMessages(messages),
              abortSignal: request.signal,
            })
          : streamText({
              model: createOpenAI({
                baseURL: "https://ai.gateway.lovable.dev/v1",
                apiKey,
                headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
              }).responses("openai/gpt-6-astra"),
              system: SYSTEM,
              messages: await convertToModelMessages(messages),
              abortSignal: request.signal,
              providerOptions: {
                openai: {
                  forceReasoning: true,
                  reasoningEffort: "low",
                  reasoningSummary: "auto",
                  store: false,
                  include: ["reasoning.encrypted_content"],
                },
              },
            });
        return result.toUIMessageStreamResponse({
          onError: (e) => {
            const msg = String((e as Error)?.message ?? e);
            if (msg.includes("429")) return "Muitas perguntas agora, tente em instantes.";
            if (msg.includes("402")) return "Assistente temporariamente indisponível.";
            return "Não consegui responder agora. Tente novamente.";
          },
        });
      },
    },
  },
});
