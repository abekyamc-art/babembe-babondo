import React, { useState } from "react";
import moment from "moment";
import { Eye } from "lucide-react";

const when = (at) => (at ? moment(at).format("D MMM YYYY, HH:mm") : "");
const num = (value) => Number(value || 0).toLocaleString();

/**
 * Where the document stands, and the one action that matters in it: what every AI is reading right
 * now is the version that was published, and nothing else — a line that has been typed or saved but
 * not published reaches no one.
 *
 * What is about to go out is read over here first: how much of the file it came from stands in it,
 * how many words and rules it holds, how many pictures have a word beside them, and how much of it is
 * kept as a record rather than as something known. A picture with no word stops the publishing until
 * it is given one or taken away — or the admin says to publish all the same.
 */
export default function DocStatus({ doc, audit, busy, unsaved, unpublished, onSave, onPublish, onRestore }) {
  const [peek, setPeek] = useState(false);
  const published = String(doc?.published || "");
  const draftCounts = doc?.draft_counts || { words: 0, rules: 0 };
  const liveCounts = doc?.published_counts || { words: 0, rules: 0 };
  const open = audit?.blockers || [];

  return (
    <div className="knowledge-form">
      <div className="doc-state">
        <span className={`doc-chip ${published ? "is-live" : "is-quiet"}`}>
          {published
            ? `Every AI is reading what you published on ${when(doc?.published_at)}`
            : "Nothing published yet — the AIs are reading nothing from this document"}
        </span>
        {unpublished ? (
          <span className="doc-chip is-dirty">Saved, not published yet</span>
        ) : null}
        {unsaved ? <span className="doc-chip is-dirty">Typed, not saved yet</span> : null}
      </div>

      <span className="knowledge-meter-text">
        Reading now: {num(liveCounts.words)} words · {num(liveCounts.rules)} rules. In this working copy:{" "}
        {num(draftCounts.words)} words · {num(draftCounts.rules)} rules.
      </span>

      {audit ? (
        <div className="knowledge-meter knowledge-meter-stacked">
          <span className="knowledge-meter-text">
            Written here: {num(audit.draft_chars)} characters
            {audit.source_chars
              ? ` of the ${num(audit.source_chars)} the file it came from held`
              : ""}{" "}
            · {num(audit.words)} words · {num(audit.rules)} rules · {num(audit.pictures)} pictures
          </span>
          <span className="knowledge-meter-text">
            Kept as a record rather than as something known: {num(audit.unconfirmed)} lines not confirmed
            · {num(audit.other_form)} another form of a word already held · {num(audit.older_file)} lines
            from the older files · {num(audit.pictures_unnamed)} pictures with no word beside them
          </span>
        </div>
      ) : null}

      {open.length ? (
        <span className="knowledge-meter-text is-over">
          Before this goes out: {open.join(", ")}.
        </span>
      ) : null}

      <div className="knowledge-form-actions">
        <button
          type="button"
          onClick={onSave}
          disabled={!!busy || !unsaved}
          className="account-save"
        >
          {busy === "saveDraft" ? "Saving…" : "Save the working copy"}
        </button>
        <button
          type="button"
          onClick={() => onPublish(false)}
          disabled={!!busy || !unpublished}
          className="account-save"
        >
          {busy === "publish" ? "Publishing…" : "Publish — every AI uses it"}
        </button>
        {open.length ? (
          <button
            type="button"
            onClick={() => onPublish(true)}
            disabled={!!busy}
            className="knowledge-cancel"
          >
            Publish all the same
          </button>
        ) : null}
        {published && unpublished ? (
          <button type="button" onClick={onRestore} disabled={!!busy} className="knowledge-cancel">
            Go back to what is published
          </button>
        ) : null}
      </div>

      {published ? (
        <div className="knowledge-field">
          <button
            type="button"
            onClick={() => setPeek((shown) => !shown)}
            className="knowledge-upload"
          >
            <Eye className="h-3.5 w-3.5" />
            {peek ? "Hide the published version" : "Read the published version"}
          </button>
          {peek ? <pre className="doc-published">{published}</pre> : null}
        </div>
      ) : null}
    </div>
  );
}