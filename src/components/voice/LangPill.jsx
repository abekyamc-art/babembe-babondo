import React from "react";
import { Languages } from "lucide-react";
import { langLabel, nextLangMode, saveLangMode, useLangMode } from "@/lib/langMode";

/**
 * The language being answered in, on the screen itself as one control.
 *
 * Kibembe stands until the person changes it, and one tap moves to the next language. It is on the
 * call screen rather than buried in a panel because it is the one setting a person reaches for while
 * they are talking — and because a voice can also be asked for a language outright, the pill always
 * shows the language that really stands, whichever way it was changed.
 */
export default function LangPill() {
  const lang = useLangMode();
  const label = langLabel(lang);

  return (
    <button
      type="button"
      onClick={() => saveLangMode(nextLangMode(lang))}
      aria-label={`Answering in ${label} — tap to change the language`}
      className="mode-badge"
    >
      <Languages className="h-3 w-3" />
      {label}
    </button>
  );
}