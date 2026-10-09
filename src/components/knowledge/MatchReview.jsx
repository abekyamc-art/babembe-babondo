import React, { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import MatchRow from "@/components/knowledge/MatchRow";
import ReviewPicker from "@/components/knowledge/ReviewPicker";

/** As many pictures as one action may move at once. */
const RUN = 100;

/**
 * The review list, in its two parts: the pictures whose word is not agreed yet — where the first look
 * is taken — and the pictures whose word is agreed, which the second look saves into the knowledge.
 * The two are kept apart on purpose, so nothing is saved on one look alone.
 *
 * Whole runs are moved on from here: the pictures are chosen, and the one action agrees them all or
 * saves them all. A picture is never picked for a look it is not ready for, and the two looks stay
 * two — agreeing a run only ever fills the second look, and saving only ever takes what has already
 * been agreed.
 */
export default function MatchReview({
  suggested,
  confirmed,
  busy,
  onConfirm,
  onApprove,
  onCorrect,
  onDrop,
  onName,
  onConfirmMany,
  onApproveMany,
}) {
  const unnamed = suggested.filter((row) => !String(row.term || "").trim());

  // The words written in the fields, and the pictures chosen, are kept here for the whole list, so
  // the words a run is agreed with are exactly the words standing on the screen, and a run chosen for
  // saving is the same run the second look shows.
  const [words, setWords] = useState({});
  const [picked, setPicked] = useState([]);
  const live = [...suggested, ...confirmed];
  const key = live.map((row) => row.id).join("|");

  // a picture that is no longer on the list is no longer chosen, and its written word is let go
  useEffect(() => {
    const ids = new Set(key ? key.split("|") : []);
    setPicked((prev) => {
      const next = prev.filter((id) => ids.has(id));
      return next.length === prev.length ? prev : next;
    });
    setWords((prev) => {
      const next = {};
      Object.keys(prev).forEach((id) => {
        if (ids.has(id)) next[id] = prev[id];
      });
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [key]);

  const byId = new Map(live.map((row) => [row.id, row]));
  const wordOf = (row) => (words[row.id] !== undefined ? words[row.id] : row.term || "");
  const roomy = picked.length < RUN;

  const chooseAll = (rows) =>
    setPicked((prev) => Array.from(new Set([...prev, ...rows.slice(0, RUN).map((row) => row.id)])));
  const clearOf = (rows) =>
    setPicked((prev) => prev.filter((id) => !rows.some((row) => row.id === id)));
  const toggle = (row) =>
    setPicked((prev) =>
      prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id]
    );

  // a picture at the first look is ready once a word is written for it; at the second look, its word
  // is already agreed
  const agreeable = suggested.filter((row) => String(wordOf(row)).trim());
  const chosenOf = (rows) => picked.filter((id) => rows.some((row) => row.id === id)).slice(0, RUN);
  const chosenAgree = chosenOf(agreeable);
  const chosenSave = chosenOf(confirmed);

  const rowOf = (row) => (
    <MatchRow
      key={row.id}
      row={row}
      stage={row.stage === "confirmed" ? "confirmed" : "suggested"}
      busy={busy}
      word={wordOf(row)}
      onWord={(item, value) => setWords((prev) => ({ ...prev, [item.id]: value }))}
      picked={picked.includes(row.id)}
      onPick={toggle}
      roomy={roomy}
      onConfirm={onConfirm}
      onApprove={onApprove}
      onCorrect={onCorrect}
      onDrop={onDrop}
    />
  );

  return (
    <>
      <div className="knowledge-field">
        <span className="knowledge-label">
          First look · {suggested.length} {suggested.length === 1 ? "picture" : "pictures"} to agree
        </span>

        {suggested.length ? (
          <span className="knowledge-meter-text">
            Read the picture, read the word, and agree it — or write the word it is really of, or find
            that word among the words of your document. A picture is not saved until you have agreed its
            word here and then looked at it again below.
          </span>
        ) : (
          <span className="knowledge-meter-text">
            Nothing is waiting to be agreed. Put your pictures in above and they stand here.
          </span>
        )}

        {unnamed.length ? (
          <div className="knowledge-field">
            <span className="knowledge-meter-text">
              {unnamed.length} {unnamed.length === 1 ? "picture carries" : "pictures carry"} no word yet.
            </span>
            <button
              type="button"
              onClick={onName}
              disabled={!!busy}
              className="account-save"
            >
              {busy === "aiSuggest" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Looking at them…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Let the AI name them from the pictures
                </span>
              )}
            </button>
          </div>
        ) : null}

        {onConfirmMany && agreeable.length ? (
          <ReviewPicker
            action="Agree these words"
            count={agreeable.length}
            chosen={chosenAgree.length}
            capped={agreeable.length > RUN}
            busy={busy}
            onAll={() => chooseAll(agreeable)}
            onClear={() => clearOf(agreeable)}
            onGo={() =>
              onConfirmMany(
                chosenAgree,
                Object.fromEntries(chosenAgree.map((id) => [id, wordOf(byId.get(id))]))
              )
            }
          />
        ) : null}

        <div className="flex flex-col">{suggested.map(rowOf)}</div>
      </div>

      <div className="knowledge-field">
        <span className="knowledge-label">
          Second look · {confirmed.length} {confirmed.length === 1 ? "picture" : "pictures"} agreed
        </span>

        {confirmed.length ? (
          <span className="knowledge-meter-text">
            Look once more: the picture, and the word it stands beside. Saving it writes it into the
            knowledge under that word, so it stands in your pictures and beside that word in your
            document, where the assistant answers with it. If the word is not the right one, write the
            word that is and put the picture back — it is agreed again, and saved only after that.
          </span>
        ) : (
          <span className="knowledge-meter-text">
            A picture you have agreed stands here for its second look, and is saved from here.
          </span>
        )}

        {onApproveMany && confirmed.length ? (
          <ReviewPicker
            action="Save them into the knowledge"
            count={confirmed.length}
            chosen={chosenSave.length}
            capped={confirmed.length > RUN}
            busy={busy}
            onAll={() => chooseAll(confirmed)}
            onClear={() => clearOf(confirmed)}
            onGo={() => onApproveMany(chosenSave)}
          />
        ) : null}

        <div className="flex flex-col">{confirmed.map(rowOf)}</div>
      </div>
    </>
  );
}