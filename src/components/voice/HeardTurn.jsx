import React, { useState } from "react";
import { Pencil } from "lucide-react";

/**
 * One turn of the person's, as the app's own ears wrote it down.
 *
 * The newest turn of theirs can be put right where it stands: what they really said takes the place
 * of what was written for it, and those words are the ones the voice holding the call is handed. The
 * sound of the turn itself is never touched, so nothing they said is rewritten behind their back.
 */
export default function HeardTurn({ text, editable, onCorrect }) {
  // a draft is held only while the turn is open for writing: null is the turn as it was heard
  const [draft, setDraft] = useState(null);

  if (draft !== null) {
    const save = () => {
      const words = draft.trim();
      setDraft(null);
      if (words && words !== text) onCorrect?.(words);
    };
    return (
      <div className="w-full max-w-[85%] rounded-2xl rounded-br-md border border-accent/50 bg-card px-3.5 py-2.5">
        <textarea
          autoFocus
          rows={2}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Your own words"
          className="w-full resize-none bg-transparent text-[13px] leading-snug text-foreground outline-none"
        />
        <div className="mt-1 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setDraft(null)}
            className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
          >
            Leave it
          </button>
          <button
            type="button"
            onClick={save}
            className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent"
          >
            Use my words
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={editable ? () => setDraft(text) : undefined}
      disabled={!editable}
      aria-label={editable ? "Put your own words right" : undefined}
      className={`conversation-text max-w-[85%] rounded-2xl rounded-br-md bg-foreground px-3.5 py-2 text-left text-[13px] leading-snug text-background ${
        editable ? "transition-opacity active:opacity-80" : ""
      }`}
    >
      <span className="block">{text}</span>
      {editable ? (
        <span className="mt-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.14em] text-background/55">
          <Pencil className="h-2.5 w-2.5" />
          Your words
        </span>
      ) : null}
    </button>
  );
}