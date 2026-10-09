import React from "react";
import { Loader2, Sparkles } from "lucide-react";
import MatchRow from "@/components/knowledge/MatchRow";

/**
 * The review list, in its two parts: the pictures whose word is not agreed yet — where the first look
 * is taken — and the pictures whose word is agreed, which the second look saves into the knowledge.
 * The two are kept apart on purpose, so nothing is saved on one look alone.
 */
export default function MatchReview({ suggested, confirmed, busy, onConfirm, onApprove, onDrop, onName }) {
  const unnamed = suggested.filter((row) => !String(row.term || "").trim());

  return (
    <>
      <div className="knowledge-field">
        <span className="knowledge-label">
          First look · {suggested.length} {suggested.length === 1 ? "picture" : "pictures"} to agree
        </span>

        {suggested.length ? (
          <span className="knowledge-meter-text">
            Read the picture, read the word, and agree it — or write the word it is really of. A picture
            is not saved until you have agreed its word here and then looked at it again below.
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

        <div className="flex flex-col">
          {suggested.map((row) => (
            <MatchRow
              key={row.id}
              row={row}
              stage="suggested"
              busy={busy}
              onConfirm={onConfirm}
              onDrop={onDrop}
            />
          ))}
        </div>
      </div>

      <div className="knowledge-field">
        <span className="knowledge-label">
          Second look · {confirmed.length} {confirmed.length === 1 ? "picture" : "pictures"} agreed
        </span>

        {confirmed.length ? (
          <span className="knowledge-meter-text">
            Look once more: the picture, and the word it stands beside. Saving it writes it into the
            knowledge under that word, where the assistant answers with it.
          </span>
        ) : (
          <span className="knowledge-meter-text">
            A picture you have agreed stands here for its second look, and is saved from here.
          </span>
        )}

        <div className="flex flex-col">
          {confirmed.map((row) => (
            <MatchRow
              key={row.id}
              row={row}
              stage="confirmed"
              busy={busy}
              onApprove={onApprove}
              onDrop={onDrop}
            />
          ))}
        </div>
      </div>
    </>
  );
}