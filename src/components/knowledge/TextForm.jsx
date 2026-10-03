import React from "react";
import TextUpload from "@/components/knowledge/TextUpload";
import { WORD_LIMIT, countWords, formatLength, isCompleteText } from "@/lib/knowledgeTexts";

export default function TextForm({ draft, editing, busy, onChange, onSave, onCancel }) {
  const words = countWords(draft.text);
  const over = words > WORD_LIMIT;
  const ready = isCompleteText(draft) && !over;

  return (
    <div className="knowledge-form">
      <label className="knowledge-field">
        <span className="knowledge-label">Title</span>
        <input
          value={draft.title || ""}
          placeholder="Mfano: Kitabu cha historia ya Babembe"
          onChange={(event) => onChange({ title: event.target.value })}
          className="account-input"
        />
      </label>

      <label className="knowledge-field">
        <span className="knowledge-label">The whole text</span>
        <textarea
          value={draft.text || ""}
          placeholder="Paste the whole document here — the assistant answers from it"
          onChange={(event) => onChange({ text: event.target.value })}
          className="account-area knowledge-area"
        />
      </label>

      <div className="knowledge-meter">
        <span className={`knowledge-meter-text${over ? " is-over" : ""}`}>
          {formatLength(words)} · up to {WORD_LIMIT.toLocaleString()}
        </span>
        <TextUpload
          disabled={busy}
          onLifted={(text, fileUri) => onChange({ text, file_uri: fileUri })}
        />
      </div>

      {over ? (
        <p className="knowledge-error">
          That text is too long — trim it, or save it as two texts.
        </p>
      ) : null}

      <div className="knowledge-form-actions">
        <button type="button" onClick={onSave} disabled={busy || !ready} className="account-save">
          {busy ? "Saving…" : editing ? "Save changes" : "Save the text"}
        </button>
        {editing ? (
          <button type="button" onClick={onCancel} className="knowledge-cancel">
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}