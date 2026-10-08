import React, { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { findInDoc } from "@/lib/knowledgeDoc";

/**
 * Looking for a thing in the document: the search sign, the words typed into it, and the places they
 * stand — each one named by the part of the document it belongs to. Tapping a place opens the
 * document at it with the words themselves chosen, ready to be changed.
 */
export default function DocSearch({ text, onJump }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const asked = term.trim();
  const hits = useMemo(() => (asked.length > 1 ? findInDoc(text, asked) : []), [text, asked]);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="knowledge-upload">
        <Search className="h-4 w-4" />
        Search the document
      </button>
    );
  }

  return (
    <div className="doc-search">
      <div className="doc-search-row">
        <input
          autoFocus
          value={term}
          placeholder="A word, a rule, anything you are looking for…"
          onChange={(event) => setTerm(event.target.value)}
          className="account-input"
        />
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTerm("");
          }}
          aria-label="Close search"
          className="account-icon"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {asked.length > 1 ? (
        hits.length ? (
          <div className="doc-hits">
            {hits.map((hit) => (
              <button
                key={`${hit.index}-${hit.length}`}
                type="button"
                onClick={() => onJump(hit)}
                className="doc-hit"
              >
                <span className="doc-hit-head">{hit.heading}</span>
                <span className="doc-hit-line">{hit.line}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="knowledge-empty">Nothing in the document holds “{asked}”.</p>
        )
      ) : (
        <p className="knowledge-empty">
          Two letters or more, and where it stands in the document is shown — the part it belongs to,
          and the line itself. Tapping a line opens the document on it, with the words chosen, ready
          to change.
        </p>
      )}
    </div>
  );
}