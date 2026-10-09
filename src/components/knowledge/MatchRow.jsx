import React, { useState } from "react";
import { Check, Loader2, Pencil, Trash2 } from "lucide-react";
import { Image } from "@/components/ui/image";
import WordField from "@/components/knowledge/WordField";

/**
 * One picture on the review list: the picture itself, the word it is of, and where that word came
 * from. The two looks stand apart — a suggested picture is agreed here, and a confirmed one is saved
 * from here. A word that is not the right one is written again at either look and the picture goes
 * back for the first look with it, so nothing reaches the knowledge on one look alone.
 */
export default function MatchRow({ row, stage, busy, onConfirm, onApprove, onCorrect, onDrop }) {
  const [word, setWord] = useState(row.term || "");
  const [fixing, setFixing] = useState(false);
  const working = busy === row.id;
  const agreed = stage === "confirmed";
  const showing = agreed && !fixing;

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
          {showing ? (
            <span className="knowledge-title">{row.term}</span>
          ) : (
            <WordField
              value={word}
              onChange={setWord}
              busy={working}
              onSubmit={() => (agreed ? onCorrect(row, word) : onConfirm(row, word))}
              submitLabel={agreed ? "Put it back" : "Agree this word"}
              ariaLabel={`The word the picture ${row.name || ""} is of`}
            />
          )}

          <span className="knowledge-meter-text">
            {row.name || "picture"}
            {row.drawn ? " · drawn here" : ""}
            {row.batch ? ` · ${row.batch}` : ""}
          </span>

          {row.how ? <span className="knowledge-meter-text">{row.how}</span> : null}

          {!showing && row.term && row.in_doc === false ? (
            <span className="knowledge-meter-text is-over">
              This word is not written in your document yet — check it before you save the picture.
            </span>
          ) : null}
        </div>
      </div>

      <div className="knowledge-tools">
        {showing ? (
          <>
            <button
              type="button"
              onClick={() => onApprove(row)}
              disabled={working}
              aria-label={`Save the picture of ${row.term}`}
              className="knowledge-tool account-save"
            >
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setFixing(true)}
              disabled={working}
              aria-label={`Write another word for ${row.name || "this picture"}`}
              className="knowledge-tool"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </>
        ) : null}

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