import React from "react";
import { Lock, LockOpen } from "lucide-react";

/** The lines of the rap: each one is its own bar, written in Ebembe with its Kiswahili meaning. */
export default function RapLyrics({ lines, wordsUsed, words, onEdit, onLock }) {
  const meaningOf = (term) => {
    const found = (words || []).find(
      (word) => word.term?.toLowerCase() === String(term).toLowerCase()
    );
    return found?.meaning || "";
  };

  return (
    <section className="rap-card">
      <div className="rap-card-head">
        <span className="rap-label">Mistari</span>
        <span className="rap-hint">{lines.length} bars</span>
      </div>

      <div className="rap-lines">
        {lines.map((line, index) => (
          <React.Fragment key={index}>
            {line.section && line.section !== lines[index - 1]?.section ? (
              <p className="rap-section">{line.section}</p>
            ) : null}
            <div className={`rap-line ${line.locked ? "is-locked" : ""}`}>
              <span className="rap-index">{index + 1}</span>
              <div className="rap-line-fields">
                <input
                  className="rap-line-ebembe"
                  aria-label={`Mstari ${index + 1} kwa Kibembe`}
                  value={line.ebembe}
                  onChange={(event) => onEdit(index, { ebembe: event.target.value })}
                />
                <input
                  className="rap-line-swahili"
                  aria-label={`Tafsiri ya mstari ${index + 1}`}
                  value={line.swahili}
                  placeholder="Tafsiri ya Kiswahili"
                  onChange={(event) => onEdit(index, { swahili: event.target.value })}
                />
              </div>
              <button
                type="button"
                className="rap-tool"
                aria-label={line.locked ? "Fungua mstari" : "Funga mstari"}
                aria-pressed={!!line.locked}
                onClick={() => onLock(index)}
              >
                {line.locked ? <Lock /> : <LockOpen />}
              </button>
            </div>
          </React.Fragment>
        ))}
      </div>

      {wordsUsed?.length ? (
        <p className="rap-hint">
          Maneno yaliyotumika:{" "}
          {wordsUsed
            .map((term) => (meaningOf(term) ? `${term} (${meaningOf(term)})` : term))
            .join(", ")}
        </p>
      ) : null}
    </section>
  );
}