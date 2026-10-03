import React, { useEffect, useMemo, useState } from "react";
import {
  knownLine,
  listLine,
  loadPasteDoc,
  loadWordStats,
  parseWordList,
  readLine,
  reviewNote,
  savePasteDocument,
  saveWordList,
  wordCount,
} from "@/lib/wordList";

/**
 * A whole paste saved at once: the lines that read like words saved as words, with
 * their pronunciation guides kept privately beside them, and the plurals, rules and
 * letters kept whole as the document the assistant answers from.
 */
export default function WordListForm({ onSaved }) {
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // what the assistant is actually given of everything saved so far
  const [known, setKnown] = useState(null);
  // the document this box is kept as, and whether the text in it is already kept
  const [doc, setDoc] = useState(null);
  const [stored, setStored] = useState(false);
  const { entries, ruleCount, guideCount, document } = useMemo(() => parseWordList(raw), [raw]);
  const read = readLine({ entries, ruleCount, guideCount });
  const knows = knownLine(known, doc?.word_count, doc?.review_note);

  useEffect(() => {
    let alive = true;
    loadWordStats().then((stats) => {
      if (alive) setKnown(stats);
    });
    loadPasteDoc().then((row) => {
      if (alive && row) setDoc(row);
    });
    return () => {
      alive = false;
    };
  }, []);

  const change = (value) => {
    setRaw(value);
    // a changed box is no longer the text that was kept
    setStored(false);
  };

  const saveAll = async () => {
    if (busy || !document) return;
    setBusy(true);
    setError("");

    // the whole paste is kept as one document first, so its plurals and rules reach
    // the assistant however long the paste is and whatever it mixes
    if (!stored) {
      try {
        setDoc(await savePasteDocument(document, reviewNote({ entries, ruleCount, guideCount })));
        setStored(true);
      } catch (err) {
        setError("That paste didn't save — tap Save all to try again.");
        setBusy(false);
        return;
      }
    }

    const { saved, remaining } = await saveWordList(entries);
    if (saved.length) {
      onSaved(saved);
      setKnown(await loadWordStats());
    }
    // whatever did not save stays in the box, ready for another try, while the
    // document already holds the whole paste
    setRaw(remaining.map(listLine).join("\n"));
    if (remaining.length) {
      setError(`${wordCount(remaining)} didn't save — tap Save all to try again.`);
    }
    setBusy(false);
  };

  return (
    <div className="knowledge-form">
      <label className="knowledge-field">
        <span className="knowledge-label">Words, plurals and rules</span>
        <textarea
          value={raw}
          onChange={(event) => change(event.target.value)}
          placeholder={
            "ole bile (oh-leg-bile) = salaam\nkubala = kupenda\nPlural: add -ba at the end for many"
          }
          className="account-area knowledge-area"
        />
      </label>

      <div className="knowledge-meter knowledge-meter-stacked">
        <span className="knowledge-meter-text">
          {read || "Write each word as: word = meaning, and paste the plurals and rules with them"}
        </span>
        {knows ? <span className="knowledge-meter-text">{knows}</span> : null}
      </div>

      {error ? <p className="knowledge-error">{error}</p> : null}

      <div className="knowledge-form-actions">
        <button
          type="button"
          onClick={saveAll}
          disabled={busy || !document}
          className="account-save"
        >
          {busy ? "Saving…" : "Save all"}
        </button>
      </div>
    </div>
  );
}