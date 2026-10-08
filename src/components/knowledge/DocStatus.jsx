import React, { useState } from "react";
import moment from "moment";
import { Eye } from "lucide-react";

const when = (at) => (at ? moment(at).format("D MMM YYYY, HH:mm") : "");

/**
 * Where the document stands, and the one action that matters in it: what every AI is reading right
 * now is the version that was published, and nothing else — a line that has been typed or saved but
 * not published reaches no one. The published version can be read back here, as it is, so what is
 * being approved is always known.
 */
export default function DocStatus({ doc, busy, unsaved, unpublished, onSave, onPublish, onRestore }) {
  const [peek, setPeek] = useState(false);
  const published = String(doc?.published || "");
  const draftCounts = doc?.draft_counts || { words: 0, rules: 0 };
  const liveCounts = doc?.published_counts || { words: 0, rules: 0 };

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
        Reading now: {liveCounts.words} words · {liveCounts.rules} rules. In this working copy:{" "}
        {draftCounts.words} words · {draftCounts.rules} rules.
      </span>

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
          onClick={onPublish}
          disabled={!!busy || !unpublished}
          className="account-save"
        >
          {busy === "publish" ? "Publishing…" : "Publish — every AI uses it"}
        </button>
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