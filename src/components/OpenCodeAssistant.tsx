import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

export function OpenCodeAssistant() {
  const [input, setInput] = useState("");
  // null = ainda verificando; o assistente usa um modelo pago e só responde a quem entrou.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(!!session));
    return () => data.subscription.unsubscribe();
  }, []);
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/opencode-chat",
    headers: async (): Promise<Record<string, string>> => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
  }), []);
  const { messages, sendMessage, status, error } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";

  return (
    <div className="oc-chat">
      <p className="oc-eyebrow">Dúvida na configuração?</p>
      <h3>Pergunte ao assistente do OpenCode</h3>
      <div className="oc-msgs">
        {messages.length === 0 && (
          <p className="oc-vazio">Ex.: "Onde eu colo o opencode.json?" ou "Como defino minha chave no terminal?"</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "oc-msg oc-user" : "oc-msg oc-bot"}>
            {m.parts.map((p, i) =>
              p.type === "text" ? (m.role === "user" ? <span key={i}>{p.text}</span> : <ReactMarkdown key={i}>{p.text}</ReactMarkdown>) : null,
            )}
          </div>
        ))}
        {status === "submitted" && <div className="oc-msg oc-bot oc-pensando">Pensando…</div>}
        {signedIn === false && (
          <p className="oc-vazio"><Link to="/entrar">Entre na sua conta</Link> para conversar com o assistente.</p>
        )}
        {error && <div className="oc-erro">{error.message.includes("Entre na sua conta") ? "Entre na sua conta para usar o assistente." : "Não consegui responder agora."}</div>}
      </div>
      <form
        className="oc-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || busy || !signedIn) return;
          sendMessage({ text: input });
          setInput("");
        }}
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Digite sua pergunta…" aria-label="Sua pergunta" />
        <button type="submit" disabled={busy || !input.trim() || !signedIn}>Perguntar</button>
      </form>
    </div>
  );
}
