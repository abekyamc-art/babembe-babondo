import React, { useEffect, useMemo, useState } from "react";
import {
  knownLine,
  loadPasteDoc,
  loadSavedTerms,
  loadWordStats,
  parseWordList,
  readLine,
  reviewNote,
  savePasteDocument,
  saveWordList,
  writeNote,
} from "@/lib/wordList";

/**
 * A whole paste saved at once: the lines that read like words go to the store, which keeps
 * only real words with a short meaning, and the plurals, rules and letters are kept whole as
 * the document both AIs read.
 */
export default function WordListForm({ onSaved }) {
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  // what the assistant is actually given of everything saved so far
  const [known, setKnown] = useState(null);
  // the spellings already in the store, so a list pasted again is not written twice
  const [saved, setSaved] = useState(null);
  // the document this box is kept as, and whether the text in it is already kept
  const [doc, setDoc] = useState(null);
  const [stored, setStored] = useState(false);
  const { entries, ruleCount, guideCount, document } = useMemo(() => parseWordList(raw), [raw]);
  const already = useMemo(
    () => entries.filter((entry) => saved?.has(entry.term.toLowerCase())).length,
    [entries, saved]
  );
  const read = readLine({ entries, ruleCount, guideCount, already });
  const knows = knownLine(known, doc?.word_count, doc?.review_note);

  useEffect(() => {
    let alive = true;
    loadWordStats().then((stats) => {
      if (alive) setKnown(stats);
    });
    loadSavedTerms().then((terms) => {
      if (alive) setSaved(terms);
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
    setNote("");
    setError("");
  };

  const saveAll = async () => {
    if (busy || !document) return;
    setBusy(true);
    setError("");
    setNote("");

    // the whole paste is kept as one document first, so its plurals and rules reach both
    // AIs however long the paste is and whatever it mixes
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

    const out = await saveWordList(entries);
    if (!out.ok) {
      // whatever did not save stays in the box word for word, ready for another try
      setError(`${out.saved.length.toLocaleString()} saved so far — tap Save all to try the rest again.`);
      setBusy(false);
      return;
    }

    if (out.saved.length) onSaved(out.saved);
    setNote(writeNote(out));
    setKnown(await loadWordStats());
    setSaved(await loadSavedTerms());
    setRaw("");
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
        {note ? <span className="knowledge-meter-text">{note}</span> : null}
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