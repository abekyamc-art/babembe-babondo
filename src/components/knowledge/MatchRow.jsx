import React, { useState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import { Image } from "@/components/ui/image";

/**
 * One picture on the review list: the picture itself, the word it is of, and where that word came
 * from. The two looks stand apart — a suggested picture is agreed here, and a confirmed one is saved
 * from here. Nothing reaches the knowledge on one look alone.
 */
export default function MatchRow({ row, stage, busy, onConfirm, onApprove, onDrop, drawn }) {
  const [word, setWord] = useState(row.term || "");
  const working = busy === row.id;
  const agreed = stage === "confirmed";

  return (
    <div className="knowledge-row">
      <div className="knowledge-body flex items-start gap-3">
        <Image
          src={row.file_url}
          alt={row.name || "A picture of the knowledge"}
          fittingType="fill"
          className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover"
        />

        <div className="flex min-w-0 flex-col gap-1">
          {agreed ? (
            <span className="knowledge-title">{row.term}</span>
          ) : (
            <input
              value={word}
              onChange={(event) => setWord(event.target.value)}
              placeholder="the word this picture is of"
              aria-label={`The word the picture ${row.name || ""} is of`}
              className="account-input"
            />
          )}

          <span className="knowledge-meter-text">
            {row.name || "picture"}
            {row.drawn || drawn ? " · drawn here" : ""}
            {row.batch ? ` · ${row.batch}` : ""}
          </span>

          {row.how ? <span className="knowledge-meter-text">{row.how}</span> : null}

          {!agreed && row.term && row.in_doc === false ? (
            <span className="knowledge-meter-text is-over">
              This word is not written in your document yet — check it before you save the picture.
            </span>
          ) : null}
        </div>
      </div>

      <div className="knowledge-tools">
        {agreed ? (
          <button
            type="button"
            onClick={() => onApprove(row)}
            disabled={working}
            aria-label={`Save the picture of ${row.term}`}
            className="knowledge-tool account-save"
          >
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onConfirm(row, word)}
            disabled={working || !String(word || "").trim()}
            aria-label={`Agree the word of ${row.name || "this picture"}`}
            className="knowledge-tool account-save"
          >
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </button>
        )}

        <button
          type="button"
          onClick={() => onDrop(row)}
          disabled={working}
          aria-label={`Take away ${row.name || "this picture"}`}
          className="knowledge-tool knowledge-tool-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}