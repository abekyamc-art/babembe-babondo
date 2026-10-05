import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ChatBubble from "@/components/kibembe/ChatBubble";
import ChatComposer from "@/components/kibembe/ChatComposer";

const COULD_NOT_REACH = "The assistant could not be reached. Please try again.";

/**
 * The Kibembe chat: a typed message goes to the assistant on the server, and the answer it
 * grounds in the Kibembe Word Bank comes back into the talk.
 */
export default function KibembeChat() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, busy, error]);

  const send = useCallback(async () => {
    const message = draft.trim();
    if (!message || busy) return;
    setDraft("");
    setError("");
    setBusy(true);
    setMessages((prev) => [...prev, { role: "user", text: message }]);
    try {
      const res = await base44.functions.invoke("chatWithKibembeAssistant", { message });
      const data = res?.data || {};
      // the function says plainly when it is not set up yet, and that line is shown as it is
      if (data.error) {
        setError(data.error);
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch (err) {
      setError(COULD_NOT_REACH);
    } finally {
      setBusy(false);
    }
  }, [busy, draft]);

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Link
          to="/"
          aria-label="Back to the voice screen"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="font-heading text-lg leading-tight text-foreground">Kibembe Assistant</h1>
          <p className="font-body text-xs text-muted-foreground">
            Answers in Kibembe, read from the Word Bank
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-3 px-4 py-4">
        {messages.length === 0 ? (
          <p className="mx-auto max-w-md pt-12 text-center font-body text-sm leading-relaxed text-muted-foreground">
            Andika swali lako kwa Kibembe — the answer comes back in Kibembe only, taken from the
            saved Word Bank.
          </p>
        ) : null}

        {messages.map((line, index) => (
          <ChatBubble key={index} role={line.role} text={line.text} />
        ))}

        {busy ? (
          <p className="font-body text-xs text-muted-foreground">Reading the Word Bank…</p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 font-body text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <ChatComposer
          value={draft}
          busy={busy}
          onChange={setDraft}
          onSend={send}
        />
      </div>
    </div>
  );
}