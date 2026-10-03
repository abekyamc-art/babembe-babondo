import React, { useEffect, useMemo, useState } from "react";
import { knownLine, listLine, loadWordStats, parseWordList, saveWordList, wordCount } from "@/lib/wordList";

// how many unreadable lines are named before the rest are counted
const NAMED = 3;

/** A whole list of Ebembe words pasted once, saved as an entry each. */
export default function WordListForm({ onSaved }) {
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // what the assistant is actually given of everything saved so far
  const [known, setKnown] = useState(null);
  const { entries, skipped } = useMemo(() => parseWordList(raw), [raw]);

  useEffect(() => {
    let alive = true;
    loadWordStats().then((stats) => {
      if (alive) setKnown(stats);
    });
    return () => {
      alive = false;
    };
  }, []);

  const saveAll = async () => {
    if (busy || !entries.length) return;
    setBusy(true);
    setError("");

    const { saved, remaining } = await saveWordList(entries);
    if (saved.length) {
      onSaved(saved);
      setKnown(await loadWordStats());
    }
    // whatever did not save stays in the box, ready for another try
    setRaw(remaining.map(listLine).join("\n"));
    if (remaining.length) {
      setError(`${wordCount(remaining)} didn't save — tap Save all to try again.`);
    }
    setBusy(false);
  };

  const skippedNote = skipped.length
    ? `Line${skipped.length === 1 ? "" : "s"} ${skipped.slice(0, NAMED).join(", ")}${
        skipped.length > NAMED ? ` and ${skipped.length - NAMED} more` : ""
      } ${skipped.length === 1 ? "has" : "have"} no Ebembe word before the separator, so ${
        skipped.length === 1 ? "it was" : "they were"
      } not read.`
    : "";

  return (
    <div className="knowledge-form">
      <label className="knowledge-field">
        <span className="knowledge-label">The whole list, one word per line</span>
        <textarea
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          placeholder={"babondo = mtu mwenye hekima\nkubala = kupenda"}
          className="account-area knowledge-area"
        />
      </label>

      <div className="knowledge-meter knowledge-meter-stacked">
        <span className="knowledge-meter-text">
          {entries.length ? `${wordCount(entries)} read` : "Write each word as: word = meaning"}
        </span>
        {known ? <span className="knowledge-meter-text">{knownLine(known)}</span> : null}
      </div>

      {skippedNote ? <p className="knowledge-error">{skippedNote}</p> : null}
      {error ? <p className="knowledge-error">{error}</p> : null}

      <div className="knowledge-form-actions">
        <button
          type="button"
          onClick={saveAll}
          disabled={busy || !entries.length}
          className="account-save"
        >
          {busy ? "Saving…" : "Save all"}
        </button>
      </div>
    </div>
  );
}