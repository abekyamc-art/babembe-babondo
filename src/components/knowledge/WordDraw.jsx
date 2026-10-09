import React, { useCallback, useEffect, useState } from "react";
import { Brush, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

// how many pictures are drawn in one run, so a long list is drawn in steps and never in one lump
const RUN = 8;

/**
 * A picture drawn for a word that has none. The words are the ones your document holds and no picture
 * stands beside yet; the picture is drawn for the word, given a public address the moment it is made,
 * and then goes onto the review list like any other picture — the same two looks stand before it.
 */
export default function WordDraw({ words, version, onDrawn, onSay }) {
  const [need, setNeed] = useState(null);
  const [all, setAll] = useState(0);
  const [picked, setPicked] = useState({});
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState(null);

  const open = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("imageMatches", { action: "wordList" });
      const data = res?.data || {};
      if (data.error) {
        setNeed([]);
        return;
      }
      setNeed(data.need || []);
      setAll(Number(data.all) || 0);
    } catch (error) {
      setNeed([]);
    }
  }, [words]);

  useEffect(() => {
    open();
  }, [open, version]);

  const chosen = Object.keys(picked).filter((term) => picked[term]);

  const draw = async () => {
    if (!chosen.length || busy) return;
    setBusy(true);
    setRun({ done: 0, all: chosen.length });
    try {
      for (const term of chosen.slice(0, RUN)) {
        const res = await base44.functions.invoke("imageMatches", { action: "draw", term });
        const data = res?.data || {};
        if (data.error) {
          onSay({ error: data.error });
          break;
        }
        setRun((was) => (was ? { ...was, done: was.done + 1 } : was));
      }
      setPicked({});
      onSay({ note: "A drawn picture goes onto the list above — look it over before you save it." });
      onDrawn();
    } finally {
      setBusy(false);
      setRun(null);
    }
  };

  if (need === null) return <p className="knowledge-empty">Reading the words of your document…</p>;

  return (
    <div className="knowledge-field">
      <span className="knowledge-label">Draw a picture for a word</span>

      <span className="knowledge-meter-text">
        {all
          ? `Your document holds ${all} ${all === 1 ? "word" : "words"}, and ${need.length} of them ${
              need.length === 1 ? "has" : "have"
            } no picture yet. Choose up to ${RUN} at a time — the picture is drawn for the word, then looked over twice like any other.`
          : "Your document holds no words yet — write your words in the document first, and their pictures can be drawn here."}
      </span>

      {need.length ? (
        <>
          <div className="knowledge-switch">
            {need.map((term) => (
              <button
                key={term}
                type="button"
                aria-pressed={!!picked[term]}
                onClick={() =>
                  setPicked((was) => {
                    const on = Object.keys(was).filter((key) => was[key]);
                    // a run draws eight pictures at a time, so no more than eight are ever chosen
                    if (!was[term] && on.length >= RUN) return was;
                    return { ...was, [term]: !was[term] };
                  })
                }
                className={`knowledge-tab${picked[term] ? " is-active" : ""}`}
              >
                {term}
              </button>
            ))}
          </div>

          <div className="knowledge-form-actions">
            <button
              type="button"
              onClick={draw}
              disabled={busy || !chosen.length}
              className="account-save"
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Drawing {run ? `${run.done} of ${run.all}` : ""}…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Brush className="h-3.5 w-3.5" />
                  Draw {chosen.length ? `${chosen.length} ` : ""}picture{chosen.length === 1 ? "" : "s"}
                </span>
              )}
            </button>
            {chosen.length ? (
              <button type="button" onClick={() => setPicked({})} className="knowledge-cancel">
                Choose none
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}