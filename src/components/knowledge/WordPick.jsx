import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

/**
 * Finding the word in the document. A picture must stand beside a word the document really holds, and
 * this is how the right one is found: write a few letters, and the document's own words answer. With
 * nothing written, the words no picture stands beside yet are shown.
 */
export default function WordPick({ onPick }) {
  const [q, setQ] = useState("");
  const [words, setWords] = useState(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let alive = true;
    const wait = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await base44.functions.invoke("imageMatches", { action: "wordSearch", q });
        if (alive) setWords(res?.data?.words || []);
      } catch (error) {
        if (alive) setWords([]);
      } finally {
        if (alive) setBusy(false);
      }
    }, 300);
    return () => {
      alive = false;
      clearTimeout(wait);
    };
  }, [q]);

  return (
    <div className="knowledge-field">
      <div className="doc-search-row">
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="find the word in your document"
          aria-label="Find the word in your document"
          className="account-input"
        />
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      </div>

      <div className="knowledge-switch">
        {(words || []).map((word) => (
          <button key={word} type="button" onClick={() => onPick(word)} className="knowledge-tab">
            {word}
          </button>
        ))}
      </div>

      {words && !words.length ? (
        <span className="knowledge-meter-text">
          No word of your document answers to that. Write it as your document writes it, or add the word
          to the document first.
        </span>
      ) : null}
    </div>
  );
}