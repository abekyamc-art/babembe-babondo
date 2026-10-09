import React, { useState } from "react";
import { Pencil } from "lucide-react";
import PictureThumb from "@/components/knowledge/PictureThumb";
import WordField from "@/components/knowledge/WordField";

/**
 * One picture already saved beside a word. Its word stands as it was written into the knowledge, and a
 * word that is not the right one is written again here and the picture put back — it then stands in
 * the first look again, and is looked at twice before it is saved.
 */
export default function SavedPictureRow({ row, busy, onReopen }) {
  const [word, setWord] = useState(row.term || "");
  const [fixing, setFixing] = useState(false);
  const working = busy === row.id;

  return (
    <div className="knowledge-row">
      <div className="knowledge-body flex items-start gap-3">
        <PictureThumb picture={row} />

        <div className="flex min-w-0 flex-col gap-1">
          {fixing ? (
            <WordField
              value={word}
              onChange={setWord}
              busy={working}
              onSubmit={() => onReopen(row, word)}
              submitLabel="Put it back"
              ariaLabel={`The word the picture ${row.name || ""} is of`}
            />
          ) : (
            <span className="knowledge-title">{row.term || "no word"}</span>
          )}

          <span className="knowledge-meter-text">
            {row.name || "picture"}
            {row.how ? ` · ${row.how}` : ""}
          </span>
        </div>
      </div>

      {fixing ? null : (
        <div className="knowledge-tools">
          <button
            type="button"
            onClick={() => setFixing(true)}
            disabled={working}
            aria-label={`Put the picture of ${row.term || "this word"} back for another look`}
            className="knowledge-tool"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}