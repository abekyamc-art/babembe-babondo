import React from "react";
import { Loader2, Phone, PhoneOff } from "lucide-react";

// what the call is doing, said in one line. "Imeunganishwa" is only ever shown once the call is
// really open and its sound is ready
const LABELS = {
  idle: "Simu imezimwa",
  connecting: "Inaunganisha…",
  live: "Imeunganishwa — sema sasa",
  thinking: "Anafikiria…",
  speaking: "Anazungumza…",
};

const DOTS = {
  idle: "bg-muted-foreground/50",
  connecting: "bg-amber-500",
  live: "bg-accent",
  thinking: "bg-amber-500",
  speaking: "bg-accent",
};

/**
 * The voice panel: the microphone, opened on the very same conversation as the written chat below
 * it — the answer is the one already on the screen, spoken aloud. Only the call is carried here,
 * Start Call and End Call, with the call's own state beside them.
 */
export default function KibembeVoicePanel({ status, speaking, thinking, micActive, onStart, onEnd }) {
  const shown =
    status === "connecting"
      ? "connecting"
      : speaking
        ? "speaking"
        : thinking
          ? "thinking"
          : micActive
            ? "live"
            : "idle";

  return (
    <section className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-base leading-tight text-card-foreground">
            Mazungumzo ya sauti
          </h2>
          <p className="font-body text-xs text-muted-foreground">
            Sema kwa Kibembe — jibu linakuja kwa Kibembe.
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-2 rounded-full border border-border px-3 py-1 font-body text-[11px] text-muted-foreground">
          <span aria-hidden className={`h-2 w-2 rounded-full ${DOTS[shown]}`} />
          {LABELS[shown]}
        </span>
      </div>

      <div className="mt-4">
        {status === "connecting" ? (
          <button
            type="button"
            disabled
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2.5 font-body text-sm text-muted-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Inaunganisha…
          </button>
        ) : micActive ? (
          <button
            type="button"
            onClick={onEnd}
            className="flex items-center gap-2 rounded-full bg-destructive px-4 py-2.5 font-body text-sm text-destructive-foreground transition active:scale-[0.98]"
          >
            <PhoneOff className="h-4 w-4" />
            End Call
          </button>
        ) : (
          <button
            type="button"
            onClick={onStart}
            className="flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 font-body text-sm text-background transition active:scale-[0.98]"
          >
            <Phone className="h-4 w-4" />
            Start Call
          </button>
        )}
      </div>
    </section>
  );
}