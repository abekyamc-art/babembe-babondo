import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import WordPick from "@/components/knowledge/WordPick";

/**
 * The word a picture is of: written by hand, or found among the words of the document. What stands
 * here is what the picture is saved beside, so nothing here is agreed until it is the right word.
 */
export default function WordField({ value, onChange, onSubmit, submitLabel, busy, ariaLabel }) {
  const [seeking, setSeeking] = useState(false);
  const ready = String(value || "").trim().length > 0;

  return (
    <div className="knowledge-field">
      <div className="account-edit">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="the word this picture is of"
          aria-label={ariaLabel}
          className="account-input"
        />
        <button type="button" onClick={onSubmit} disabled={busy || !ready} className="account-save">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
        </button>
      </div>

      <div className="knowledge-switch">
        <button
          type="button"
          aria-expanded={seeking}
          onClick={() => setSeeking((was) => !was)}
          className="knowledge-tab"
        >
          {seeking ? "The words of the document" : "Find the word in the document"}
        </button>
      </div>

      {seeking ? (
        <WordPick
          onPick={(word) => {
            onChange(word);
            setSeeking(false);
          }}
        />
      ) : null}
    </div>
  );
}