import React from "react";
import { FIELDS, isComplete } from "@/lib/knowledge";

export default function KnowledgeForm({ kind, draft, editing, busy, onChange, onSave, onCancel }) {
  const fields = FIELDS[kind] || [];
  const complete = isComplete(draft);

  return (
    <div className="knowledge-form">
      {fields.map((field) => (
        <label key={field.name} className="knowledge-field">
          <span className="knowledge-label">{field.label}</span>
          {field.area ? (
            <textarea
              value={draft[field.name] || ""}
              placeholder={field.placeholder}
              onChange={(event) => onChange(field.name, event.target.value)}
              className="account-area"
            />
          ) : (
            <input
              value={draft[field.name] || ""}
              placeholder={field.placeholder}
              onChange={(event) => onChange(field.name, event.target.value)}
              className="account-input"
            />
          )}
        </label>
      ))}

      <div className="knowledge-form-actions">
        <button
          type="button"
          onClick={onSave}
          disabled={busy || !complete}
          className="account-save"
        >
          {busy ? "Saving…" : editing ? "Save changes" : "Add entry"}
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