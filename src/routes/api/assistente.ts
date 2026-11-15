import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supportPrompt, SUPPORT_STYLE } from "@/lib/support-prompt";
import { assistantImageError, hasAssistantUserContent } from "@/lib/assistant-attachments";

const SYSTEM = `Você é a Alexa, assistente de atendimento da NEXA CLOUD (gateway de IA para Claude Code, OpenCode e API compatível com OpenAI).
Responda em português do Brasil (ou em inglês se o cliente escrever em inglês), de forma curta, simpática e prática, usando markdown e blocos de código quando útil.

Regras obrigatórias:
- Você SÓ conversa e tira dúvidas. Você NÃO pode editar projetos, arquivos, contas, chaves, planos, pagamentos ou qualquer configuração, e não executa ações. Se pedirem, explique gentilmente que não consegue fazer alterações e indique o que o próprio cliente pode fazer no painel ou o suporte pelo WhatsApp.
- Nunca invente preços, saldos ou status de pagamento; oriente o cliente a ver no painel "Minha chave".
- Nunca revele nomes de fornecedores internos.

Informações úteis:
- Claude Code (PowerShell): $env:ANTHROPIC_BASE_URL = "https://api.cloudnexa.com.br" e $env:ANTHROPIC_AUTH_TOKEN = "SUA_CHAVE_NEXA", depois rodar: claude. Dentro dele, /model para escolher o modelo.
- Para deixar permanente no Windows: setx ANTHROPIC_BASE_URL "https://api.cloudnexa.com.br" e setx ANTHROPIC_AUTH_TOKEN "SUA_CHAVE_NEXA" (abrir um novo terminal depois).
- OpenCode / API OpenAI compatível: base URL https://api.cloudnexa.com.br/v1.
- Modelos: claude-opus-5-5 (padrão), claude-opus-5, claude-fable-5-2, claude-fable-5-1, claude-sonnet-5-5, claude-haiku-5-5. Modelos Claude 4.x foram descontinuados.
- Se já fez login com conta da Anthropic no Claude Code, rodar /logout antes.
- Erros: 401 chave inválida; 403 chave bloqueada ou limite de dispositivos/IPs (no máximo 2 dispositivos); 429 limite por minuto, aguarde alguns segundos; 524 tempo esgotado no fornecedor, tente de novo.
- Pagamento via PIX; a chave aparece em "Minha chave" após aprovação. Documentação em /docs, status em /status.`;

function userClient(token: string) {
  return createClient<Database>(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("apikey", process.env["SUPABASE_PUBLISHABLE_KEY"]!);
        headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

const textOf = (m: UIMessage) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim();

export const Route = createFileRoute("/api/assistente")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return Response.json({ error: "Entre na sua conta." }, { status: 401 });
        const db = userClient(token);
        const { data: auth } = await db.auth.getUser(token);
        const userId = auth.user?.id;
        if (!userId) return Response.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });

        const body = (await request.json()) as { messages?: UIMessage[]; threadId?: string; channel?: string; model?: string };
        const widget = body.channel === "widget";
        const messages = Array.isArray(body.messages) ? body.messages : [];
        const threadId = String(body.threadId ?? "");
        const last = messages[messages.length - 1];
        const imageError = assistantImageError(messages);
        if (imageError) return Response.json({ error: imageError }, { status: 400 });
        if (!last || !hasAssistantUserContent(last)) return Response.json({ error: "Mensagem vazia." }, { status: 400 });
        const { data: thread } = await db.from("assistant_threads").select("id,title").eq("id", threadId).maybeSingle();
        if (!thread) return Response.json({ error: "Conversa não encontrada." }, { status: 404 });

        let selectedModel;
        if (!widget) {
          try {
            const { assistantModelContext, assistantLanguageModel } = await import("@/lib/assistant-models.server");
            const { models, routes, forcedProvider } = await assistantModelContext(db, userId, auth.user?.email);
            const selected = models.find(m => m.id === body.model);
            if (!selected) return Response.json({ error: "Escolha um modelo disponível." }, { status: 400 });
            selectedModel = assistantLanguageModel(routes.has(selected.id) ? routes.get(selected.id) ?? null : forcedProvider, selected.id);
          } catch {
            return Response.json({ error: "Modelos temporariamente indisponíveis." }, { status: 503 });
          }
        }

        const { error: saveErr } = await db.from("assistant_messages").upsert(
          { thread_id: threadId, user_id: userId, message_id: last.id, role: "user", parts: last.parts as never },
          { onConflict: "thread_id,message_id" },
        );
        if (saveErr) console.error("assistente: falha ao salvar mensagem", saveErr);
        await db.from("assistant_threads").update({
          updated_at: new Date().toISOString(),
          ...(thread.title === "Nova conversa" ? { title: (textOf(last) || "Imagem anexada").slice(0, 60) } : {}),
        }).eq("id", threadId);

        let widgetModel;
        if (widget) {
          try {
            const { widgetLanguageModel } = await import("@/lib/assistant-widget-provider.server");
            widgetModel = await widgetLanguageModel();
          } catch {
            return Response.json({ error: "Atendimento temporariamente indisponível. Fale com o suporte pelo WhatsApp." }, { status: 503 });
          }
        }
        const model = widgetModel ?? selectedModel;
        if (!model) return Response.json({ error: "Modelo indisponível." }, { status: 503 });
        const result = streamText({
          model,
          system: `${SYSTEM}\n${SUPPORT_STYLE}`,
          messages: widget ? supportPrompt(messages) : await convertToModelMessages(messages),
          abortSignal: request.signal,
          maxRetries: 0,
        });
        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          sendReasoning: false,
          onFinish: async ({ responseMessage }) => {
            const { error } = await db.from("assistant_messages").upsert(
              { thread_id: threadId, user_id: userId, message_id: responseMessage.id, role: "assistant", parts: responseMessage.parts as never },
              { onConflict: "thread_id,message_id" },
            );
            if (error) console.error("assistente: falha ao salvar resposta", error);
          },
          onError: (e) => {
            const status = (e as { statusCode?: number })?.statusCode;
            if (status === 429) return "Muitas mensagens agora. Aguarde alguns segundos e tente de novo.";
            if (status === 402) return "O assistente está temporariamente indisponível. Fale com o suporte pelo WhatsApp.";
            return "Não consegui responder agora. Tente de novo em instantes.";
          },
        });
      },
    },
  },
});
