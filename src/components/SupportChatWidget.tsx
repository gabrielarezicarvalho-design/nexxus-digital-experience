import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ChevronRight, Clock, Home, MoreVertical, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClientIdentity } from "@/components/client-auth-context";
import { MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import logoAsset from "@/assets/nexus/nexa-logo.png.asset.json";
import { cleanSupportResponse } from "@/lib/support-response";

const GREETING = "Olá! Como posso ajudar você? 😊";

async function latestThreadId(userId: string) {
  const { data } = await supabase
    .from("assistant_threads")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1);
  return data?.[0]?.id ?? null;
}

async function createThread(userId: string) {
  const { data, error } = await supabase.from("assistant_threads").insert({ user_id: userId }).select("id").single();
  if (error) throw error;
  return data.id;
}

export function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"ajuda" | "conversa">("ajuda");

  return <>
    {open && <ChatPanel view={view} onOpenConversation={() => setView("conversa")} onBack={() => setView("ajuda")} />}
    <button
      type="button"
      className="nexa-chat-launcher"
      aria-label={open ? "Fechar conversa" : "Abrir conversa"}
      aria-expanded={open}
      onClick={() => setOpen((v) => !v)}
    >
      {open
        ? <X size={26} strokeWidth={2.4} />
        : <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
            <path d="M12 3C6.9 3 3 6.4 3 10.6c0 2.2 1 4.1 2.7 5.5-.1.9-.5 2.2-1.5 3.2 0 0 2.4-.2 4.3-1.5 1.1.4 2.3.6 3.5.6 5.1 0 9-3.4 9-7.6S17.1 3 12 3Z" />
          </svg>}
    </button>
  </>;
}

function ChatPanel({ view, onOpenConversation, onBack }: { view: "ajuda" | "conversa"; onOpenConversation: () => void; onBack: () => void }) {
  const { user, ready } = useClientIdentity();

  return <section className="nexa-chat-panel" aria-label="Conversa com a NEXA">
    <header className="nexa-chat-head">
      <div className="nexa-chat-headrow">
        <Link to="/" className="nexa-chat-iconbtn" aria-label="Início" onClick={onBack}><Home size={18} /></Link>
        <span className="nexa-chat-pill">Conversação</span>
        <button type="button" className="nexa-chat-iconbtn" aria-label="Voltar" onClick={onBack}><MoreVertical size={18} /></button>
      </div>
      <div className="nexa-chat-pair" aria-hidden="true">
        <span className="nexa-chat-avatar-dark"><img src={logoAsset.url} alt="" /></span>
        <span className="nexa-chat-avatar-blue">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8.4L4.6 20.3A.8.8 0 0 1 3.3 19.7V5a1 1 0 0 1 .7-.95Z" /></svg>
        </span>
      </div>
      <p className="nexa-chat-title">Dúvidas? Fale conosco!</p>
      <p className="nexa-chat-sub"><Clock size={13} />Respondemos em minutos</p>
    </header>

    {view === "ajuda"
      ? <div className="nexa-chat-body nexa-chat-ajuda">
          <h3>Obter ajuda</h3>
          <button type="button" className="nexa-chat-row" onClick={onOpenConversation}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--orange)" aria-hidden="true"><path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8.4L4.6 20.3A.8.8 0 0 1 3.3 19.7V5a1 1 0 0 1 .7-.95Z" /></svg>
            Enviar uma mensagem
            <ChevronRight size={18} className="nexa-chat-row-chev" />
          </button>
        </div>
      : !ready
        ? <div className="nexa-chat-body nexa-chat-center"><Shimmer>Abrindo conversa…</Shimmer></div>
        : !user
          ? <div className="nexa-chat-body nexa-chat-guest">
              <p><b>Entre na sua conta</b> para conversar com a Alexa, nossa assistente.</p>
              <Link to="/entrar" className="dark-button" onClick={onBack}>ENTRAR</Link>
            </div>
          : <ThreadGate userId={user.id} />}
    <p className="nexa-chat-foot">Assistente Alexa · NEXA CLOUD</p>
  </section>;
}

function ThreadGate({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const existing = await latestThreadId(userId);
        const id = existing ?? (await createThread(userId));
        if (existing === null) void qc.invalidateQueries({ queryKey: ["assistant-threads", userId] });
        setThreadId(id);
      } catch {
        setFailed(true);
      }
    })();
  }, [userId, qc]);

  if (failed) return <div className="nexa-chat-body nexa-chat-center"><p>Não foi possível abrir a conversa agora. Tente de novo em instantes.</p></div>;
  if (!threadId) return <div className="nexa-chat-body nexa-chat-center"><Shimmer>Abrindo conversa…</Shimmer></div>;
  return <WidgetChat key={threadId} threadId={threadId} userId={userId} />;
}

function WidgetChat({ threadId, userId }: { threadId: string; userId: string }) {
  const qc = useQueryClient();
  const history = useQuery({
    queryKey: ["assistant-messages", threadId],
    queryFn: async () => {
      const { data, error } = await supabase.from("assistant_messages").select("message_id,role,parts").eq("thread_id", threadId).order("created_at");
      if (error) throw error;
      return data.map((m) => ({ id: m.message_id, role: m.role as UIMessage["role"], parts: m.parts as UIMessage["parts"] }));
    },
    staleTime: Infinity,
  });

  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/assistente",
    body: { threadId, channel: "widget" },
    headers: async (): Promise<Record<string, string>> => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
  }), [threadId]);

  const { messages, sendMessage, status, stop, error } = useChat({
    id: threadId,
    messages: history.data ?? [],
    transport,
    onError: () => {},
    onFinish: () => {
      void qc.invalidateQueries({ queryKey: ["assistant-threads", userId] });
      void qc.invalidateQueries({ queryKey: ["assistant-messages", threadId] });
    },
  });

  const listRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status, history.isPending]);

  function send() {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    void sendMessage({ text });
  }

  return <>
    <div className="nexa-chat-body" ref={listRef}>
      {history.isPending && <div className="nexa-chat-center"><Shimmer>Carregando conversa…</Shimmer></div>}
      <Bubble from="assistant"><MessageResponse>{GREETING}</MessageResponse></Bubble>
      {messages.map((m) => <Bubble key={m.id} from={m.role}>
        {m.parts.map((p, i) => p.type === "text" ? (m.role === "assistant" ? <MessageResponse key={i}>{cleanSupportResponse(p.text)}</MessageResponse> : <span key={i}>{p.text}</span>) : null)}
      </Bubble>)}
      {status === "submitted" && <Bubble from="assistant"><Shimmer>Alexa está pensando…</Shimmer></Bubble>}
      {error && <Bubble from="assistant"><span role="alert">O atendimento não conseguiu responder agora. Aguarde ou fale com o suporte pelo WhatsApp.</span></Bubble>}
    </div>
    <form
      className="nexa-chat-inputwrap"
      onSubmit={(e) => { e.preventDefault(); stop(); send(); }}
    >
      <div className="nexa-chat-input">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escreva sua mensagem..."
          aria-label="Escreva sua mensagem"
          disabled={history.isPending}
        />
        <button type="submit" aria-label="Enviar mensagem" disabled={!draft.trim() || busy}><Send size={19} /></button>
      </div>
    </form>
  </>;
}

function Bubble({ from, children }: { from: UIMessage["role"]; children: React.ReactNode }) {
  const isUser = from === "user";
  return <div className={`nexa-chat-msg${isUser ? " is-user" : ""}`}>
    {!isUser && <span className="nexa-chat-mini" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8.4L4.6 20.3A.8.8 0 0 1 3.3 19.7V5a1 1 0 0 1 .7-.95Z" /></svg>
    </span>}
    <div className={`nexa-chat-bubble${isUser ? " is-user" : ""}`}>{children}</div>
  </div>;
}
