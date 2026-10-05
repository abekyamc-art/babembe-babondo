import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mic } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ChatBubble from "@/components/kibembe/ChatBubble";
import ChatComposer from "@/components/kibembe/ChatComposer";
import KibembeVoicePanel from "@/components/kibembe/KibembeVoicePanel";
import ModeToggle from "@/components/voice/ModeToggle";
import { providerClass, providerName } from "@/lib/providerNames";
import { useVoiceMode } from "@/lib/voiceMode";
import useVoiceAgent from "@/hooks/useVoiceAgent";

/**
 * The Kibembe screen: the same talk the home screen's voice carries on — the original outside
 * voice, Gloire AI, answers here, written or spoken. A typed line goes to whoever answers, and the
 * answer that comes back is the one already on the screen; the voice panel opens the microphone for
 * the same conversation, so neither side repeats the other.
 */
export default function KibembeChat() {
  const { status, speaking, thinking, micActive, turns, error, notice, start, stop } =
    useVoiceAgent();
  const [draft, setDraft] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [user, setUser] = useState(null);
  const endRef = useRef(null);
  const mode = useVoiceMode();

  // the switch belongs to the admin, and is only shown to one
  useEffect(() => {
    let alive = true;
    base44.auth
      .me()
      .then((me) => {
        if (alive) setUser(me);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns, thinking, error, notice]);

  const busy = status === "connecting" || thinking;

  const send = useCallback(async () => {
    const message = draft.trim();
    if (!message || busy) return;
    setDraft("");
    await start({ withMic: false, silent: true, firstMessage: message });
  }, [busy, draft, start]);

  return (
    <div className={`flex min-h-full flex-col bg-background ${providerClass(mode)}`}>
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
          <p className="truncate font-body text-xs text-muted-foreground">
            {providerName(mode)} answers here
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {user?.role === "admin" ? <ModeToggle /> : null}
          <button
            type="button"
            onClick={() => setVoiceOpen((open) => !open)}
            aria-expanded={voiceOpen}
            aria-label={voiceOpen ? "Close the voice panel" : "Open the voice panel"}
            className={`flex h-10 shrink-0 items-center gap-2 rounded-full border px-3 font-body text-xs transition ${
              voiceOpen ? "border-accent text-accent" : "border-border text-foreground"
            }`}
          >
            <Mic className="h-4 w-4" />
            Sauti
          </button>
        </div>
      </header>

      {voiceOpen ? (
        <KibembeVoicePanel
          status={status}
          speaking={speaking}
          thinking={thinking}
          micActive={micActive}
          onStart={() => start({ withMic: true })}
          onEnd={stop}
        />
      ) : null}

      <div className="flex-1 space-y-3 px-4 py-4">
        {turns.length === 0 ? (
          <p className="mx-auto max-w-md pt-12 text-center font-body text-sm leading-relaxed text-muted-foreground">
            Andika swali lako kwa Kibembe — the answer comes back in Kibembe only.
          </p>
        ) : null}

        {turns.map((line, index) => (
          <ChatBubble key={index} role={line.role} text={line.text} />
        ))}

        {busy ? (
          <p className="font-body text-xs text-muted-foreground">Anafikiria…</p>
        ) : null}

        {error || notice ? (
          <p
            role="alert"
            className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 font-body text-sm text-destructive"
          >
            {error || notice}
          </p>
        ) : null}

        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <ChatComposer value={draft} busy={busy} onChange={setDraft} onSend={send} />
      </div>
    </div>
  );
}