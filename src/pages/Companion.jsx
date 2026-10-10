import React, { useEffect, useRef, useState } from "react";
import ChatComposer from "@/components/kibembe/ChatComposer";
import CompanionHeader from "@/components/agents/CompanionHeader";
import CompanionMessage from "@/components/agents/CompanionMessage";
import KibembeVoicePanel from "@/components/kibembe/KibembeVoicePanel";
import MediaDock from "@/components/media/MediaDock";
import useCompanionCall from "@/hooks/useCompanionCall";
import useCompanionChat from "@/hooks/useCompanionChat";
import useMediaDock from "@/hooks/useMediaDock";
import { KIBEMBE_CLASS } from "@/lib/providerNames";

/**
 * The Kibembe live companion's screen: Gloire AI's own agent answers here — the whole turn is taken
 * as Kibembe unless another language is asked for, the complete confirmed Word Bank is its
 * vocabulary, and it says plainly what it really did.
 */
export default function Companion() {
  const { messages, sending, error, send, restart } = useCompanionChat();
  // the microphone on the very same conversation: the turn is heard, put to the companion, and its
  // own answer read out — so the writing and the call are one talk and neither repeats the other
  const call = useCompanionCall({ messages, send });
  // the app's own player, standing behind the piece the app's own selection chose
  const media = useMediaDock(messages);
  const [draft, setDraft] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
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
      <CompanionHeader
        onRestart={restart}
        voiceOpen={voiceOpen}
        onToggleVoice={() => setVoiceOpen((open) => !open)}
      />

      {voiceOpen ? (
        <KibembeVoicePanel
          status={call.status}
          speaking={call.speaking}
          thinking={call.thinking}
          micActive={call.micActive}
          onStart={call.start}
          onEnd={call.stop}
        />
      ) : null}

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

        {error || call.error || call.notice ? (
          <p
            role="alert"
            className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 font-body text-sm text-destructive"
          >
            {error || call.error || call.notice}
          </p>
        ) : null}

        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 bg-background/95 backdrop-blur">
        <MediaDock
          item={media.item}
          others={media.others}
          playing={media.playing}
          onStart={media.began}
          onNext={media.next}
          onClose={media.close}
        />
        <div className="border-t border-border px-4 py-3">
          <ChatComposer value={draft} busy={sending} onChange={setDraft} onSend={submit} />
        </div>
      </div>
    </div>
  );
}