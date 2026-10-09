import React from "react";

/**
 * What the call heard, shown before anything is answered.
 *
 * A turn the app's own knowledge holds nothing of is the one that goes wrong when it is answered
 * unseen: the ears have written words nobody here said. So the writing is shown as it stands — the
 * turn on the strip above can be put right by tapping it — and nothing is put to the voice until the
 * person says the writing is right, or says the turn again.
 */
export default function HeardAsk({ ask, onUse, onAgain }) {
  const text = String(ask?.text || "");
  if (!text) return null;

  return (
    <div className="flex min-h-4 shrink-0 items-center justify-center gap-2.5 text-[11px] leading-4">
      <span className="truncate text-muted-foreground">Not sure I heard you — “{text}”</span>
      <button
        type="button"
        onClick={onUse}
        className="shrink-0 font-semibold uppercase tracking-[0.14em] text-accent"
      >
        Use it
      </button>
      <button
        type="button"
        onClick={onAgain}
        className="shrink-0 font-semibold uppercase tracking-[0.14em] text-muted-foreground"
      >
        Say again
      </button>
    </div>
  );
}