import React from "react";
import SavedPictureRow from "@/components/knowledge/SavedPictureRow";

/**
 * The pictures already saved beside a word: they stand in the knowledge, and beside that word in the
 * document. A picture whose word is not the right one is put right from here — the word that is is
 * written for it, and it goes back to be looked at twice before it is saved again.
 */
export default function SavedPictures({ kept, total, busy, onReopen }) {
  const rows = kept || [];

  return (
    <div className="knowledge-field">
      <span className="knowledge-label">
        Saved beside a word · {total}
        {rows.length < total ? ` · ${rows.length} shown here` : ""}
      </span>

      {rows.length ? (
        <span className="knowledge-meter-text">
          These stand in your knowledge and beside their word in the document. If a picture's word is
          not the right one, write the word that is and put the picture back — it stands in the first
          look again, and is saved only after you have looked at it twice.
        </span>
      ) : (
        <span className="knowledge-meter-text">
          No picture is saved beside a word yet. A picture is saved from the second look above.
        </span>
      )}

      <div className="flex flex-col">
        {rows.map((row) => (
          <SavedPictureRow key={row.id} row={row} busy={busy} onReopen={onReopen} />
        ))}
      </div>
    </div>
  );
}