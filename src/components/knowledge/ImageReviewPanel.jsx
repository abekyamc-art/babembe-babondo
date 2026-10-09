import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import ImageUploader from "@/components/knowledge/ImageUploader";
import MatchReview from "@/components/knowledge/MatchReview";
import WordDraw from "@/components/knowledge/WordDraw";
import { parseWords } from "@/lib/imageWords";

/**
 * The pictures area: your pictures put in, each shown with the word it is of, and the two looks that
 * stand between a picture and the knowledge. A suggested picture is agreed first; an agreed picture is
 * looked at once more and then saved beside its word, where the assistant answers with it.
 *
 * Nothing here is filed on one look alone, and a picture that is not wanted is taken off the list
 * rather than saved.
 */
export default function ImageReviewPanel() {
  const [rows, setRows] = useState(null);
  const [saved, setSaved] = useState(0);
  const [words, setWords] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const open = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("imageMatches", { action: "open" });
      const data = res?.data || {};
      if (data.error) {
        setError(data.error);
        return;
      }
      setRows(data.rows || []);
      setSaved(Number(data.saved) || 0);
    } catch (error) {
      setError("Your pictures could not be opened just now.");
    }
  }, []);

  useEffect(() => {
    open();
  }, [open]);

  const say = useCallback((said) => {
    if (said?.error) setError(said.error);
    if (said?.note) setNote(said.note);
  }, []);

  const ask = useCallback(
    async (action, extra, mark) => {
      setError("");
      setBusy(mark || action);
      try {
        const res = await base44.functions.invoke("imageMatches", { action, ...extra });
        const data = res?.data || {};
        if (data.error) {
          setError(data.error);
          return null;
        }
        return data;
      } catch (error) {
        setError("That could not be done just now. Try again.");
        return null;
      } finally {
        setBusy("");
      }
    },
    []
  );

  const confirm = async (row, word) => {
    const data = await ask("confirm", { ids: [row.id], terms: { [row.id]: word } }, row.id);
    if (!data) return;
    setNote(
      data.not_in_doc
        ? "Agreed — but that word is not written in your document yet. Look at it again before you save the picture."
        : "Agreed. It is waiting for your second look below."
    );
    open();
  };

  const approve = async (row) => {
    const data = await ask("approve", { ids: [row.id] }, row.id);
    if (!data) return;
    setNote(`Saved — the picture now stands beside "${row.term}" in your knowledge.`);
    open();
  };

  const drop = async (row) => {
    const data = await ask("drop", { ids: [row.id] }, row.id);
    if (!data) return;
    setNote(`Taken off the list: ${row.name || "that picture"}.`);
    open();
  };

  const name = async () => {
    const left = (rows || [])
      .filter((row) => row.stage !== "confirmed" && !String(row.term || "").trim())
      .slice(0, 10)
      .map((row) => ({ name: row.name, url: row.file_url }));
    if (!left.length) return;
    const data = await ask("aiSuggest", { files: left, words: parseWords(words) }, "aiSuggest");
    if (!data) return;
    setNote(
      `The AI looked at ${data.asked} ${data.asked === 1 ? "picture" : "pictures"} and named ${data.named}. ` +
        "Every name it gives is a word of your own knowledge — read them over before you agree them."
    );
    open();
  };

  if (!rows) {
    return <p className="knowledge-empty">Opening your pictures…</p>;
  }

  const suggested = rows.filter((row) => row.stage !== "confirmed");
  const confirmed = rows.filter((row) => row.stage === "confirmed");

  return (
    <>
      <p className="account-hint">
        Pictures saved beside words stand with the words, and the assistant answers with them. {saved}{" "}
        {saved === 1 ? "picture is" : "pictures are"} saved in your knowledge.
      </p>

      <ImageUploader words={words} setWords={setWords} onDone={open} onSay={say} />

      <MatchReview
        suggested={suggested}
        confirmed={confirmed}
        busy={busy}
        onConfirm={confirm}
        onApprove={approve}
        onDrop={drop}
        onName={name}
      />

      <WordDraw words={words} version={rows.length} onDrawn={open} onSay={say} />

      {note ? <p className="knowledge-meter-text">{note}</p> : null}
      {error ? <p className="knowledge-error">{error}</p> : null}
    </>
  );
}