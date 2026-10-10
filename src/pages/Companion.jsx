import React, { useEffect, useRef, useState } from "react";
import ChatComposer from "@/components/kibembe/ChatComposer";
import CompanionHeader from "@/components/agents/CompanionHeader";
import CompanionMessage from "@/components/agents/CompanionMessage";
import useCompanionChat from "@/hooks/useCompanionChat";
import { KIBEMBE_CLASS } from "@/lib/providerNames";

/**
 * The Kibembe live companion's screen: Gloire AI's own agent answers here — the whole turn is taken
 * as Kibembe unless another language is asked for, the complete confirmed Word Bank is its
 * vocabulary, and it says plainly what it really did.
 */
export default function Companion() {
  const { messages, sending, error, send, restart } = useCompanionChat();
  const [draft, setDraft] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, sending, error]);

  const submit = async () => {
    const message = draft.trim();
    if (!message || sending) return;
    setDraft("");
    await send(message);
  };

  return (
    <div className={`flex min-h-full flex-col bg-background ${KIBEMBE_CLASS}`}>
      <CompanionHeader onRestart={restart} />

      <div className="flex-1 space-y-3 px-4 py-4">
        {messages.length === 0 ? (
          <p className="mx-auto max-w-md pt-12 text-center font-body text-sm leading-relaxed text-muted-foreground">
            Ongea Kibembe, Kiswahili au English — the companion hears the whole turn and answers in the
            language you use.
          </p>
        ) : null}

        {messages.map((message, index) => (
          <CompanionMessage key={message.id || index} message={message} />
        ))}

        {sending ? <p className="font-body text-xs text-muted-foreground">Anafikiria…</p> : null}

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
        <ChatComposer value={draft} busy={sending} onChange={setDraft} onSend={submit} />
      </div>
    </div>
  );
}