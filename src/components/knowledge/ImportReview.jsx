import React, { useState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { DOC_MAX } from "@/lib/knowledgeDoc";
import { appendText, mergeWords } from "@/lib/importWords";
import PictureThumb from "@/components/knowledge/PictureThumb";
import PickSheet from "@/components/knowledge/PickSheet";

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
    if (busy || (!keeping.length && !pictures.length)) return;
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
      const merged = entries.length ? mergeWords(text, entries) : { text, added: 0, updated: 0 };
      if (merged.text.length > DOC_MAX) throw new Error("large");

      await doc.writeDraft(merged.text);

      // Every picture the file held is kept here, and not only the ones a word already names: the one
      // that stood beside a word is filed under it and shown with it, and one no word names is kept
      // without one — it stands in the panel waiting for its word instead of being lost on the way in.
      // The word's own line in the document stays what the AIs read, and holds no address.
      const paired = entries.filter((entry) => entry.picture?.file_uri);
      const loosePics = pictures.filter((pic, index) => !keeping.some((row) => row.at === index));
      const saving = [
        ...paired.map((entry) => ({
          term: entry.term,
          name: entry.picture.name || "",
          file_uri: entry.picture.file_uri,
          how: entry.how || "",
        })),
        ...loosePics.map((pic) => ({
          term: "?",
          name: pic.name || "",
          file_uri: pic.file_uri,
          how: "no word beside it in the file",
        })),
      ];
      if (paired.length) {
        await base44.entities.KnowledgeImage.deleteMany({
          term: { $in: paired.map((entry) => entry.term) },
        });
      }
      if (loosePics.length) {
        await base44.entities.KnowledgeImage.deleteMany({
          file_uri: { $in: loosePics.map((pic) => pic.file_uri) },
        });
      }
      if (saving.length) await base44.entities.KnowledgeImage.bulkCreate(saving);

      try {
        await doc.recordSource({
          name: result.name || "The package",
          file_uri: result.file_uri,
          chars: String(result.text || "").length,
        });
      } catch (err) {
        // the words are in the working copy; the file itself simply was not kept beside them
      }

      const said = [];
      if (merged.added) {
        said.push(`Added ${merged.added} ${merged.added === 1 ? "word" : "words"} to the working copy`);
      }
      if (merged.updated) said.push(`updated ${merged.updated} already there`);
      if (saving.length) {
        said.push(`${saving.length} ${saving.length === 1 ? "picture" : "pictures"} saved in the panel`);
      }
      onDone?.(
        `${said.length ? said.join(", ") : "Nothing new was written"}. ` +
          `${loosePics.length ? `${loosePics.length} of the pictures ${loosePics.length === 1 ? "has" : "have"} no word yet — give each one its word in the panel. ` : ""}` +
          `Save it, then publish it when you are ready — nothing reaches the AIs until you do.`
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
                  <PickSheet
                    value={String(row.at)}
                    options={[
                      { value: "-1", label: "No picture" },
                      ...pictures.map((pic, index) => ({
                        value: String(index),
                        label: pic.name,
                      })),
                    ]}
                    onChange={(value) => patch(row.key, { at: Number(value) })}
                    title="The picture beside this word"
                    description="Every picture the package held stands here — choose the one that belongs to this word."
                    ariaLabel="The picture beside this word"
                  />
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
          pictures are listed below, and every one of them can be added to the panel without a word.
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
            Choose one of these from a word's picture list above to put it with that word. Any you
            leave here are kept in the panel all the same, with no word beside them, waiting for one.
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
          disabled={busy || (!keeping.length && !pictures.length)}
          className="knowledge-upload"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {busy
            ? "Writing into the working copy…"
            : `Add ${
                keeping.length
                  ? `${keeping.length} ${keeping.length === 1 ? "word" : "words"}`
                  : `${pictures.length} ${pictures.length === 1 ? "picture" : "pictures"}`
              } to the working copy`}
        </button>
        <button type="button" onClick={onClose} disabled={busy} className="knowledge-cancel">
          Leave it for now
        </button>
      </div>
    </div>
  );
}