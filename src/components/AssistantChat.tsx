import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart, type UIMessage } from "ai";
import {
  ArrowLeft,
  MessageSquarePlus,
  Trash2,
  History,
  Home,
  KeyRound,
  BarChart3,
  Store,
  CreditCard,
  Terminal,
  Settings,
  LifeBuoy,
  MessageSquare,
  BookOpen,
  X,
  ShieldCheck,
  Code2,
  Compass,
  ChevronDown,
  ArrowUpRight,
  Plus,
  Mic,
  MicOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClientIdentity } from "@/components/client-auth-context";
import { ClientLogin } from "@/components/ClientLogin";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import modelIconAsset from "@/assets/assistant-model-icon.svg.asset.json";
import { getClientDashboard } from "@/lib/client-dashboard.functions";
import { clientQuota } from "@/lib/client-quota";
import { ClientWorkspaceSidebar } from "./ClientWorkspaceSidebar";
import { getAssistantModels } from "@/lib/assistant-models.functions";
import { useServerFn } from "@tanstack/react-start";
import "./assistant-workspace.css";
import { ModelBrandIcon, isGeminiStyleModel } from "./ModelBrandIcon";
import { modelFamily } from "@/lib/model-family";

function AssistantModelIcon({ id, className }: { id: string; className: string }) {
  const gpt = /gpt|astra/i.test(id) || modelFamily(id) === "openai";
  if (isGeminiStyleModel(id) || gpt) {
    return <ModelBrandIcon id={gpt ? "gpt-5.6-luna" : id} className={className} />;
  }
  return <img src={modelIconAsset.url} alt="" className={className} />;
}

type AssistantModelOption = { id: string; label: string };

function modelGroup(id: string) {
  const value = id.toLowerCase();
  if (value.includes("gemini")) return { id: "gemini", label: "GOOGLE · GEMINI", description: "Modelo Gemini para texto e imagens" };
  if (/gpt|astra/i.test(id) || modelFamily(id) === "openai") return { id: "gpt", label: "OPENAI · GPT", description: "Modelo GPT para conversas e tarefas" };
  return { id: "claude", label: "ANTHROPIC · CLAUDE", description: "Modelo Claude para conversas e código" };
}

function AssistantAttachments() {
  const attachments = usePromptInputAttachments();
  if (!attachments.files.length) return null;
  return (
    <PromptInputHeader className="assistant-attachments" aria-label="Imagens anexadas">
      {attachments.files.map((file) => (
        <span className="assistant-attachment" key={file.id}>
          <img src={file.url} alt={file.filename || "Imagem anexada"} />
          <button type="button" onClick={() => attachments.remove(file.id)} aria-label={`Remover ${file.filename || "imagem"}`}><X size={13} /></button>
        </span>
      ))}
    </PromptInputHeader>
  );
}

function AssistantAddImageButton({ disabled }: { disabled: boolean }) {
  const attachments = usePromptInputAttachments();
  return (
    <PromptInputButton className="assistant-add-image" onClick={attachments.openFileDialog} disabled={disabled} aria-label="Anexar imagem" title="Anexar imagem">
      <Plus size={19} />
    </PromptInputButton>
  );
}

type DictationRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type DictationRecognitionConstructor = new () => DictationRecognition;

declare global {
  interface Window {
    SpeechRecognition?: DictationRecognitionConstructor;
    webkitSpeechRecognition?: DictationRecognitionConstructor;
  }
}

const TOPICS = [
  {
    label: "Começar",
    icon: Terminal,
    suggestions: [
      "Como configuro o Claude Code no Windows?",
      "Como conecto minha chave à API?",
      "Quais modelos posso usar?",
    ],
  },
  {
    label: "Minha chave",
    icon: KeyRound,
    suggestions: [
      "Onde encontro minha chave de API?",
      "Como consulto meus tokens restantes?",
      "O que significa o erro 403?",
    ],
  },
  {
    label: "Planos",
    icon: Store,
    suggestions: [
      "Qual é a diferença entre tokens e mensal?",
      "Como funciona a compra por PIX?",
      "Onde vejo a validade do meu plano?",
    ],
  },
  {
    label: "Código",
    icon: Code2,
    suggestions: [
      "Como configuro a API no meu editor?",
      "Como usar a NEXA com o OpenCode?",
      "Qual base URL devo configurar?",
    ],
  },
];

async function createThread(userId: string) {
  const { data, error } = await supabase
    .from("assistant_threads")
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export function AssistantPage({ threadId }: { threadId?: string }) {
  const { user, ready } = useClientIdentity();
  if (!ready) return <div className="client-page client-loading">Carregando…</div>;
  if (!user) return <ClientLogin />;
  return <AssistantShell userId={user.id} threadId={threadId} />;
}

function AssistantShell({ userId, threadId }: { userId: string; threadId?: string | undefined }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [modelBusy, setModelBusy] = useState(false);
  const loadModels = useServerFn(getAssistantModels);
  const models = useQuery({ queryKey: ["assistant-models", userId], queryFn: () => loadModels(), refetchInterval: 30000, refetchOnWindowFocus: true });
  const activeModel = models.data?.find(m => m.id === selectedModel) ?? models.data?.[0];
  const threads = useQuery({
    queryKey: ["assistant-threads", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assistant_threads")
        .select("id,title,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // /assistente sem conversa: abre a mais recente ou cria a primeira, uma única vez.
  useEffect(() => {
    if (threadId || !threads.data) return;
    let cancel = false;
    (async () => {
      const id = threads.data[0]?.id ?? (await createThread(userId));
      if (!cancel)
        void navigate({ to: "/assistente/$threadId", params: { threadId: id }, replace: true });
    })();
    return () => {
      cancel = true;
    };
  }, [threadId, threads.data, userId, navigate]);

  async function newThread() {
    const id = await createThread(userId);
    await qc.invalidateQueries({ queryKey: ["assistant-threads", userId] });
    void navigate({ to: "/assistente/$threadId", params: { threadId: id } });
    setHistoryOpen(false);
  }
  async function removeThread(id: string) {
    if (!window.confirm("Excluir esta conversa?")) return;
    await supabase.from("assistant_threads").delete().eq("id", id);
    await qc.invalidateQueries({ queryKey: ["assistant-threads", userId] });
    if (id === threadId) void navigate({ to: "/assistente" });
  }

  return (
    <div className="assistant-page client-workspace">
      <ClientWorkspaceSidebar active="assistente" />
      <main className="assistant-main">
        <header className="assistant-head">
          <div className="assistant-head-left">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen((v) => !v)}
              aria-expanded={historyOpen}
            >
              <History size={15} />
              Histórico
            </Button>
            <span>ASSISTENTE ALEXA</span>
          </div>
          <span className="assistant-chat-title">NEXA CHAT</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void newThread()}
              title="Nova conversa"
              aria-label="Nova conversa"
            >
              <MessageSquarePlus size={14} />
              <span>Nova conversa</span>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/minha-chave">
                <ArrowUpRight size={16} />
              </Link>
            </Button>
          </div>
        </header>
        {historyOpen && (
          <section className="assistant-history">
            <div className="assistant-history-heading">
              <b>Suas conversas</b>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Fechar histórico"
                onClick={() => setHistoryOpen(false)}
              >
                <X size={16} />
              </Button>
            </div>
            <nav aria-label="Conversas">
              {threads.data?.map((t) => (
                <div
                  key={t.id}
                  className={`assistant-thread${t.id === threadId ? " is-active" : ""}`}
                >
                  <Link
                    to="/assistente/$threadId"
                    params={{ threadId: t.id }}
                    onClick={() => setHistoryOpen(false)}
                  >
                    {t.title}
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => void removeThread(t.id)}
                    aria-label="Excluir conversa"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </nav>
          </section>
        )}
        {threadId ? (
          <ThreadLoader
            key={threadId}
            threadId={threadId}
            userId={userId}
            models={models.data ?? []}
            modelsPending={models.isPending}
            activeModel={activeModel}
            onSelectModel={setSelectedModel}
            modelBusy={modelBusy}
            onBusy={setModelBusy}
          />
        ) : (
          <div className="assistant-center">
            <Shimmer>Abrindo conversa…</Shimmer>
          </div>
        )}
      </main>
    </div>
  );
}

type ThreadModelProps = {
  models: AssistantModelOption[];
  modelsPending: boolean;
  activeModel?: AssistantModelOption | undefined;
  onSelectModel: (id: string) => void;
  modelBusy: boolean;
  onBusy: (busy: boolean) => void;
};

function ThreadLoader({ threadId, userId, ...modelProps }: { threadId: string; userId: string } & ThreadModelProps) {
  const history = useQuery({
    queryKey: ["assistant-messages", threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assistant_messages")
        .select("message_id,role,parts,created_at")
        .eq("thread_id", threadId)
        .order("created_at");
      if (error) throw error;
      return data.map((m) => ({
        id: m.message_id,
        role: m.role as UIMessage["role"],
        parts: m.parts as UIMessage["parts"],
        metadata: { createdAt: m.created_at },
      }));
    },
    staleTime: Infinity,
  });
  if (history.isPending)
    return (
      <div className="assistant-center">
        <Shimmer>Carregando conversa…</Shimmer>
      </div>
    );
  if (history.error)
    return <div className="assistant-center">Não foi possível abrir esta conversa.</div>;
  return <ChatWindow threadId={threadId} userId={userId} initial={history.data} {...modelProps} />;
}

function ChatWindow({
  threadId,
  userId,
  initial,
  models,
  modelsPending,
  activeModel,
  onSelectModel,
  modelBusy,
  onBusy,
}: {
  threadId: string;
  userId: string;
  initial: UIMessage[];
} & ThreadModelProps) {
  const modelId = activeModel?.id ?? "";
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const [topic, setTopic] = useState(0);
  const [listening, setListening] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<DictationRecognition | null>(null);
  const modelRef = useRef(modelId);
  modelRef.current = modelId;
  const seenAt = useRef(new Map<string, string>());
  const timeOf = (m: UIMessage) => {
    const saved = (m.metadata as { createdAt?: string } | undefined)?.createdAt;
    if (saved) return saved;
    if (!seenAt.current.has(m.id)) seenAt.current.set(m.id, new Date().toISOString());
    return seenAt.current.get(m.id) ?? "";
  };
  const clock = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/assistente",
        body: () => ({ threadId, model: modelRef.current }),
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    [threadId],
  );
  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initial,
    transport,
    onError: (e) => setError(e.message || "Não consegui responder agora."),
    onFinish: () => {
      void qc.invalidateQueries({ queryKey: ["assistant-threads", userId] });
      void qc.invalidateQueries({ queryKey: ["assistant-messages", threadId] });
    },
  });
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => { onBusy(busy); return () => onBusy(false); }, [busy, onBusy]);
  useEffect(() => {
    inputRef.current?.focus();
  }, [threadId, status]);
  useEffect(() => () => recognitionRef.current?.stop(), []);
  useEffect(() => {
    if (!modelMenuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!(event.target as Element | null)?.closest(".assistant-model-picker")) setModelMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [modelMenuOpen]);
  const send = (text: string, files: FileUIPart[] = []) => {
    const t = text.trim();
    if ((!t && !files.length) || busy || !modelId) return;
    if (listening) recognitionRef.current?.stop();
    setError("");
    void sendMessage({ text: t || "Analise a imagem anexada.", files });
    inputRef.current?.focus();
  };
  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setError("O ditado por voz não está disponível neste navegador. Você ainda pode digitar ou anexar uma imagem.");
      return;
    }
    const recognition = new Recognition();
    const original = inputRef.current?.value.trim() ?? "";
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) transcript += `${event.results[i]?.[0]?.transcript ?? ""} `;
      if (inputRef.current) inputRef.current.value = `${original}${original && transcript ? " " : ""}${transcript.trim()}`;
    };
    recognition.onerror = (event) => {
      setListening(false);
      setError(event.error === "not-allowed" ? "Permita o uso do microfone para ditar sua mensagem." : "Não consegui ouvir agora. Tente ditar novamente.");
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      inputRef.current?.focus();
    };
    recognitionRef.current = recognition;
    setError("");
    setListening(true);
    recognition.start();
  };
  const modelGroups = ["claude", "gpt", "gemini"]
    .map((id) => ({ id, models: models.filter((model) => modelGroup(model.id).id === id) }))
    .filter((group) => group.models.length);

  return (
    <>
      <Conversation className="assistant-conversation">
        <ConversationContent className="assistant-transcript">
          {messages.length === 0 && (
            <ConversationEmptyState className="assistant-empty">
              <h1>Como posso ajudar você?</h1>
              <p>Pergunte sobre a NEXA CLOUD ou escolha uma sugestão abaixo</p>
              <div className="assistant-categories">
                {TOPICS.map(({ label, icon: Icon }, i) => (
                  <Button
                    key={label}
                    variant="outline"
                    size="sm"
                    aria-pressed={topic === i}
                    onClick={() => setTopic(i)}
                  >
                    <Icon size={14} />
                    {label}
                  </Button>
                ))}
              </div>
              <div className="assistant-suggest">
                {TOPICS[topic]?.suggestions.map((s) => (
                  <Button key={s} variant="outline" onClick={() => send(s)}>
                    <span>{s}</span>
                    <span className="assistant-suggest-arrow" aria-hidden="true">
                      <ArrowUpRight size={15} strokeWidth={1.8} />
                    </span>
                  </Button>
                ))}
              </div>
            </ConversationEmptyState>
          )}
          {messages.map((m) => m.role === "assistant" ? (
            !m.parts.some((p) => p.type === "text" && p.text.trim()) ? null : (
            <Message key={m.id} from="assistant" className="assistant-reply">
              <div className="assistant-reply-row">
                <span className="assistant-reply-logo"><img src={modelIconAsset.url} alt="" /></span>
                <MessageContent className="assistant-reply-bubble" data-no-translate>
                  {m.parts.map((p, i) => p.type === "text" ? <MessageResponse key={i}>{p.text}</MessageResponse> : null)}
                </MessageContent>
              </div>
              <time className="assistant-reply-time" dateTime={timeOf(m)}>{clock(timeOf(m))}</time>
            </Message>
            )
          ) : (
            <Message key={m.id} from={m.role}>
              {m.parts.some((p) => p.type === "file" && p.mediaType.startsWith("image/")) && (
                <MessageContent className="assistant-user-attachments">
                  {m.parts.map((p, i) => p.type === "file" && p.mediaType.startsWith("image/") ? (
                    <img key={i} className="assistant-user-image" src={p.url} alt={p.filename || "Imagem enviada"} />
                  ) : null)}
                </MessageContent>
              )}
              {m.parts.some((p) => p.type === "text" && p.text.trim()) && (
                <MessageContent>
                  {m.parts.map((p, i) => p.type === "text" ? <span key={i}>{p.text}</span> : null)}
                </MessageContent>
              )}
            </Message>
          ))}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Pensando…</Shimmer>
              </MessageContent>
            </Message>
          )}
          {error && (
            <p className="client-error" role="alert">
              {error}
            </p>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="assistant-composer-band">
        <PromptInput
          className="assistant-input"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          maxFiles={4}
          maxFileSize={5 * 1024 * 1024}
          onError={(issue) => setError(issue.code === "max_file_size" ? "Cada imagem pode ter no máximo 5 MB." : issue.code === "max_files" ? "Envie no máximo 4 imagens por mensagem." : "Escolha uma imagem PNG, JPG, WEBP ou GIF.")}
          onSubmit={(msg) => send(msg.text ?? "", msg.files)}
        >
          <AssistantAttachments />
          <PromptInputTextarea ref={inputRef} autoFocus placeholder="Pergunte qualquer coisa…" />
          <PromptInputFooter className="assistant-composer-footer">
            <PromptInputTools>
              <AssistantAddImageButton disabled={busy} />
            </PromptInputTools>
            <PromptInputTools className="assistant-composer-actions">
              <div className="assistant-model-picker" onKeyDown={(event) => { if (event.key === "Escape") setModelMenuOpen(false); }}>
                <Button
                  type="button"
                  variant="outline"
                  className="assistant-composer-model"
                  disabled={modelBusy || !activeModel}
                  aria-label="Escolher modelo"
                  aria-haspopup="dialog"
                  aria-expanded={modelMenuOpen}
                  onClick={() => setModelMenuOpen((open) => !open)}
                >
                  {activeModel && <AssistantModelIcon id={activeModel.id} className="size-4 shrink-0 object-contain" />}
                  <span>{activeModel?.label ?? (modelsPending ? "Carregando…" : "Indisponível")}</span>
                  <ChevronDown size={14} />
                </Button>
                {modelMenuOpen && (
                  <div className="assistant-model-menu" role="dialog" aria-label="Escolha o modelo">
                    <div className="assistant-model-menu-heading">Escolha o modelo</div>
                    {modelGroups.map((group) => {
                      const info = modelGroup(group.models[0]?.id ?? "");
                      return (
                        <div key={group.id} className="assistant-model-group">
                          <div className="assistant-model-group-label">{info.label}</div>
                          {group.models.map((model) => {
                            const selected = model.id === modelId;
                            return (
                              <button
                                type="button"
                                key={model.id}
                                className="assistant-model-option"
                                aria-pressed={selected}
                                onClick={() => {
                                  onSelectModel(model.id);
                                  setModelMenuOpen(false);
                                  inputRef.current?.focus();
                                }}
                              >
                                <AssistantModelIcon id={model.id} className="assistant-model-option-icon" />
                                <span className="assistant-model-option-copy">
                                  <strong>{model.label}</strong>
                                  <small>{modelGroup(model.id).description}</small>
                                </span>
                                <span className={selected ? "assistant-model-use is-selected" : "assistant-model-use"}>{selected ? "Em uso" : "Usar"}</span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <PromptInputButton
                className={listening ? "assistant-mic is-listening" : "assistant-mic"}
                onClick={toggleListening}
                disabled={busy}
                aria-label={listening ? "Parar ditado" : "Ditar mensagem"}
                aria-pressed={listening}
                title={listening ? "Parar ditado" : "Ditar mensagem"}
              >
                {listening ? <MicOff size={17} /> : <Mic size={17} />}
              </PromptInputButton>
              <PromptInputSubmit status={status} onStop={stop} disabled={!modelId && !busy} aria-label="Enviar mensagem" />
            </PromptInputTools>
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  );
}
