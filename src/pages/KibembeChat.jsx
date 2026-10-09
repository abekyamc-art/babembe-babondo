import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mic } from "lucide-react";
import ChatBubble from "@/components/kibembe/ChatBubble";
import ChatComposer from "@/components/kibembe/ChatComposer";
import KibembeVoicePanel from "@/components/kibembe/KibembeVoicePanel";
import useOpenAiAssistant from "@/hooks/useOpenAiAssistant";
import useStoryTurn from "@/hooks/useStoryTurn";
import StorySheet from "@/components/story/StorySheet";
import { KIBEMBE_CLASS, SADIKI_AI } from "@/lib/providerNames";
import { noteKibembeSession } from "@/lib/kpiEvents";

/**
 * The Kibembe assistance screen: the app's own Kibembe assistant answers here, from the saved Word
 * Bank, and Sadiki AI reads every answer with it before it is given — written or spoken. The voice
 * panel opens the microphone on the very same conversation, so neither side repeats the other.
 */
export default function KibembeChat() {
  const { status, speaking, thinking, micActive, turns, error, notice, start, stop, ask } =
    useOpenAiAssistant();
  // the admin's own story for what the person asks: it is shown on the same conversation, and
  // playing what it carries ends the call it was asked on
  const { story, closeStory } = useStoryTurn(turns);
  const [draft, setDraft] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const endRef = useRef(null);
  // the session is counted once, on the first turn asked of it — written or spoken
  const countedRef = useRef(false);

  const noteFirstAsk = useCallback(() => {
    if (countedRef.current) return;
    countedRef.current = true;
    noteKibembeSession();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns, thinking, error, notice]);

  const busy = status === "connecting" || thinking;

  const send = useCallback(async () => {
    const message = draft.trim();
    if (!message || busy) return;
    setDraft("");
    noteFirstAsk();
    await ask(message);
  }, [ask, busy, draft, noteFirstAsk]);

  // the person naming which of the names the assistant put before them they mean: their choice is
  // their own turn, and the answer that follows names the one they chose
  const pick = useCallback(
    async (name) => {
      if (busy) return;
      noteFirstAsk();
      await ask(name);
    },
    [ask, busy, noteFirstAsk]
  );

  return (
    <div className={`flex min-h-full flex-col bg-background ${KIBEMBE_CLASS}`}>
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
            Word Bank answers, read with {SADIKI_AI}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVoiceOpen((open) => !open)}
          aria-expanded={voiceOpen}
          aria-label={voiceOpen ? "Close the voice panel" : "Open the voice panel"}
          className={`ml-auto flex h-10 shrink-0 items-center gap-2 rounded-full border px-3 font-body text-xs transition ${
            voiceOpen ? "border-accent text-accent" : "border-border text-foreground"
          }`}
        >
          <Mic className="h-4 w-4" />
          Sauti
        </button>
      </header>

      {voiceOpen ? (
        <KibembeVoicePanel
          status={status}
          speaking={speaking}
          thinking={thinking}
          micActive={micActive}
          onStart={() => {
            noteFirstAsk();
            start();
          }}
          onEnd={stop}
        />
      ) : null}

      <div className="flex-1 space-y-3 px-4 py-4">
        {turns.length === 0 ? (
          <p className="mx-auto max-w-md pt-12 text-center font-body text-sm leading-relaxed text-muted-foreground">
            Andika swali lako kwa Kibembe — the answer comes back in Kibembe only, read with{" "}
            {SADIKI_AI}.
          </p>
        ) : null}

        {turns.map((line, index) => (
          <ChatBubble
            key={index}
            role={line.role}
            text={line.text}
            pictures={line.pictures}
            source={line.source}
            choices={line.choices}
            onPick={pick}
          />
        ))}

        {busy ? <p className="font-body text-xs text-muted-foreground">Anafikiria…</p> : null}

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

      <StorySheet story={story} onClose={closeStory} onPlaybackEnd={stop} />
    </div>
  );
}