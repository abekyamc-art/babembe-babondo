import React from "react";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import ChatBubble from "@/components/kibembe/ChatBubble";
import useKibembeVoice from "@/hooks/useKibembeVoice";

// what the call is doing, said in one line. "listening" is only ever shown once the voice
// session is really open and its sound is ready
const LABELS = {
  idle: "Simu imezimwa",
  connecting: "Inaunganisha…",
  listening: "Imeunganishwa — sema sasa",
  thinking: "Anafikiria…",
  speaking: "Anazungumza…",
  muted: "Mic imezimwa",
};

const DOTS = {
  idle: "bg-muted-foreground/50",
  connecting: "bg-amber-500",
  listening: "bg-accent",
  thinking: "bg-amber-500",
  speaking: "bg-accent",
  muted: "bg-destructive",
};

/**
 * The voice panel: a spoken conversation with the very same Kibembe assistant the written chat
 * asks. Nothing but the call is carried here — the microphone, Start Call, Mute and End Call —
 * and the written chat below it is left exactly as it was.
 */
export default function KibembeVoicePanel() {
  const { active, muted, status, turns, error, notice, start, stop, toggleMute } = useKibembeVoice();

  return (
    <section className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-base leading-tight text-card-foreground">
            Mazungumzo ya sauti
          </h2>
          <p className="font-body text-xs text-muted-foreground">
            Sema kwa Kibembe — jibu linakuja kwa Kibembe, kutoka Word Bank ile ile.
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-2 rounded-full border border-border px-3 py-1 font-body text-[11px] text-muted-foreground">
          <span aria-hidden className={`h-2 w-2 rounded-full ${DOTS[status]}`} />
          {LABELS[status]}
        </span>
      </div>

      <div className="mt-3 max-h-60 space-y-2 overflow-y-auto">
        {turns.length === 0 ? (
          <p className="pt-2 font-body text-sm leading-relaxed text-muted-foreground">
            {active ? "Sema sasa — anakusikiliza." : "Bonyeza Start Call, kisha sema kwa Kibembe."}
          </p>
        ) : (
          turns.map((turn, index) => (
            <ChatBubble key={index} role={turn.role} text={turn.text} />
          ))
        )}
      </div>

      {error || notice ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 font-body text-sm text-destructive"
        >
          {error || notice}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!active ? (
          <button
            type="button"
            onClick={start}
            className="flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 font-body text-sm text-background transition active:scale-[0.98]"
          >
            <Phone className="h-4 w-4" />
            Start Call
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={toggleMute}
              aria-pressed={muted}
              className={`flex items-center gap-2 rounded-full border px-4 py-2.5 font-body text-sm transition active:scale-[0.98] ${
                muted ? "border-accent text-accent" : "border-border text-foreground"
              }`}
            >
              {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {muted ? "Unmute" : "Mute"}
            </button>
            <button
              type="button"
              onClick={stop}
              className="flex items-center gap-2 rounded-full bg-destructive px-4 py-2.5 font-body text-sm text-destructive-foreground transition active:scale-[0.98]"
            >
              <PhoneOff className="h-4 w-4" />
              End Call
            </button>
          </>
        )}
      </div>
    </section>
  );
}