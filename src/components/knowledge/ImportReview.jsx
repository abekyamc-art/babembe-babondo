import React, { useState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { DOC_MAX } from "@/lib/knowledgeDoc";
import { appendText, mergeWords } from "@/lib/importWords";
import PictureThumb from "@/components/knowledge/PictureThumb";

/**
 * What a package turned out to hold: the words found in it, and the picture standing beside each one.
 *
 * Nothing is written until the admin says so. A word can be corrected here, a row that was read
 * wrongly can be dropped, and a picture can be moved to another word or taken away — so what goes
 * into the working copy is what the admin has read over. It is still only a working copy: it reaches
 * no AI until they publish it.
 */
export default function ImportReview({ result, doc, onState, onDone, onClose }) {
  const pictures = Array.isArray(result?.pictures) ? result.pictures : [];
  const [rows, setRows] = useState(() =>
    (result?.entries || []).map((entry, index) => ({
      key: index,
      term: entry.term || "",
      meaning: entry.meaning || "",
      usage: entry.usage || "",
      guide: entry.guide || "",
      where: entry.source || "",
      how: entry.how || "",
      at: entry.picture ? pictures.findIndex((pic) => pic.file_uri === entry.picture.file_uri) : -1,
    }))
  );
  const [whole, setWhole] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const keeping = rows.filter((row) => row.term.trim());
  const withPicture = keeping.filter((row) => row.at >= 0).length;
  const loose = pictures.filter((pic, index) => !keeping.some((row) => row.at === index));

  const patch = (key, change) =>
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...change } : row)));

  const add = async () => {
    if (busy || !keeping.length) return;
    setBusy(true);
    onState?.(true);
    setError("");

    try {
      const entries = keeping.map((row) => ({
        term: row.term.trim(),
        meaning: row.meaning.trim(),
        usage: row.usage.trim(),
        guide: row.guide.trim(),
        how: row.how,
        picture: row.at >= 0 ? pictures[row.at] : null,
      }));

      let text = String(doc.text || "");
      if (whole && result.text) text = appendText(text, result.text);
      const merged = mergeWords(text, entries);
      if (merged.text.length > DOC_MAX) throw new Error("large");

      await doc.writeDraft(merged.text);

      // each picture is filed under the word it stands beside, so it is shown with that word in the
      // panel — the word's own line in the document stays what the AIs read, and holds no address
      const kept = entries.filter((entry) => entry.picture?.file_uri);
      if (kept.length) {
        const terms = kept.map((entry) => entry.term);
        await base44.entities.KnowledgeImage.deleteMany({ term: { $in: terms } });
        await base44.entities.KnowledgeImage.bulkCreate(
          kept.map((entry) => ({
            term: entry.term,
            name: entry.picture.name || "",
            file_uri: entry.picture.file_uri,
            how: entry.how || "",
          }))
        );
      }

      try {
        await doc.recordSource({
          name: result.name || "The package",
          file_uri: result.file_uri,
          chars: String(result.text || "").length,
        });
      } catch (err) {
        // the words are in the working copy; the file itself simply was not kept beside them
      }

      onDone?.(
        `Added ${merged.added} ${merged.added === 1 ? "word" : "words"} to the working copy` +
          `${merged.updated ? `, and updated ${merged.updated} already there` : ""}` +
          `${kept.length ? `, with ${kept.length} ${kept.length === 1 ? "picture" : "pictures"} saved beside them` : ""}` +
          `. Save it, then publish it when you are ready — nothing reaches the AIs until you do.`
      );
    } catch (err) {
      setError(
        err?.message === "large"
          ? "The document would grow past what it holds — take a part of it out, then add these."
          : err?.message || "That could not be written into the working copy. Try again."
      );
    } finally {
      setBusy(false);
      onState?.(false);
    }
  };

  return (
    <div className="knowledge-form">
      <span className="knowledge-label">What was found in {result.name}</span>

      <div className="knowledge-meter knowledge-meter-stacked">
        <span className="knowledge-meter-text">
          {result.read?.length || 0} file{result.read?.length === 1 ? "" : "s"} read ·{" "}
          {keeping.length} {keeping.length === 1 ? "word" : "words"} found · {withPicture} with a
          picture · {pictures.length} {pictures.length === 1 ? "picture" : "pictures"} kept
        </span>
        {result.skipped?.length ? (
          <span className="knowledge-meter-text">
            Not read: {result.skipped.slice(0, 10).join(", ")}
            {result.skipped.length > 10 ? ` and ${result.skipped.length - 10} more` : ""} — these are
            neither text nor pictures.
          </span>
        ) : null}
        {result.not_kept ? (
          <span className="knowledge-meter-text">
            {result.not_kept} picture{result.not_kept === 1 ? "" : "s"} could not be kept — a package
            of pictures is read up to 100 of them.
          </span>
        ) : null}
      </div>

      {keeping.length ? (
        <div className="flex flex-col">
          {rows.map((row) => (
            <div key={row.key} className="knowledge-row">
              <div className="knowledge-body flex flex-col gap-1.5">
                <input
                  value={row.term}
                  onChange={(event) => patch(row.key, { term: event.target.value })}
                  placeholder="the word or phrase"
                  aria-label="The word"
                  className="account-input"
                />
                <input
                  value={row.meaning}
                  onChange={(event) => patch(row.key, { meaning: event.target.value })}
                  placeholder="what it means"
                  aria-label="What it means"
                  className="account-input"
                />
                <div className="flex items-center gap-2">
                  {row.at >= 0 ? <PictureThumb picture={pictures[row.at]} /> : null}
                  <select
                    value={String(row.at)}
                    onChange={(event) => patch(row.key, { at: Number(event.target.value) })}
                    aria-label="The picture beside this word"
                    className="account-input"
                  >
                    <option value="-1">No picture</option>
                    {pictures.map((pic, index) => (
                      <option key={`${pic.file_uri}-${index}`} value={String(index)}>
                        {pic.name}
                      </option>
                    ))}
                  </select>
                </div>
                {row.how ? <span className="knowledge-meter-text">{row.how}</span> : null}
                {row.where ? (
                  <span className="knowledge-meter-text">
                    read from {row.where}
                    {row.guide ? ` · said ${row.guide}` : ""}
                  </span>
                ) : null}
              </div>
              <div className="knowledge-tools">
                <button
                  type="button"
                  onClick={() => setRows((prev) => prev.filter((held) => held.key !== row.key))}
                  aria-label={`Leave out ${row.term || "this word"}`}
                  className="knowledge-tool knowledge-tool-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="knowledge-empty">
          No words were found in this package — nothing here reads as a word of the language. Its
          pictures are listed below.
        </p>
      )}

      {loose.length ? (
        <div className="knowledge-field">
          <span className="knowledge-label">Pictures no word in the file names</span>
          <div className="flex flex-wrap gap-2">
            {loose.map((pic) => (
              <span
                key={pic.file_uri}
                className="flex items-center gap-2 rounded-xl border border-[#1c2440] px-2 py-1.5"
              >
                <PictureThumb picture={pic} className="h-9 w-9" />
                <span className="knowledge-meter-text">{pic.name}</span>
              </span>
            ))}
          </div>
          <span className="knowledge-meter-text">
            Choose one of these from a word's picture list above to put it with that word.
          </span>
        </div>
      ) : null}

      {result.text ? (
        <label className="knowledge-meter-text flex items-start gap-2">
          <input
            type="checkbox"
            checked={whole}
            onChange={(event) => setWhole(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            Also write the whole text of the file into the working copy, below what is already there.
            The words above go in on their own either way.
          </span>
        </label>
      ) : null}

      {error ? <p className="knowledge-error">{error}</p> : null}

      <div className="knowledge-form-actions">
        <button
          type="button"
          onClick={add}
          disabled={busy || !keeping.length}
          className="knowledge-upload"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {busy
            ? "Writing into the working copy…"
            : `Add ${keeping.length} to the working copy`}
        </button>
        <button type="button" onClick={onClose} disabled={busy} className="knowledge-cancel">
          Leave it for now
        </button>
      </div>
    </div>
  );
}