import React from "react";

/**
 * What the app would keep from a turn the person has just put right: their own words, and the saved
 * Kibembe word or phrase they belong to when they are another way of saying one.
 *
 * Nothing is written into the Word Bank by the offer itself — the person's own answer is what saves
 * it, so a pronunciation is learned from a confirmation and never from a guess.
 */
export default function SaveAsk({ ask, onKeep, onLeave }) {
  const said = String(ask?.term || "");
  const canonical = String(ask?.canonical || "");
  if (!said) return null;

  return (
    <div className="flex min-h-4 shrink-0 items-center justify-center gap-2.5 text-[11px] leading-4">
      <span className="truncate text-muted-foreground">
        {canonical
          ? `Keep “${said}” as another way of saying “${canonical}”?`
          : `Keep “${said}” in the Word Bank?`}
      </span>
      <button
        type="button"
        onClick={onKeep}
        className="shrink-0 font-semibold uppercase tracking-[0.14em] text-accent"
      >
        Keep it
      </button>
      <button
        type="button"
        onClick={onLeave}
        className="shrink-0 font-semibold uppercase tracking-[0.14em] text-muted-foreground"
      >
        Not now
      </button>
    </div>
  );
}