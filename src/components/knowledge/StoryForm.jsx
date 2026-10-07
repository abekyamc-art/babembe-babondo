import React, { useRef, useState } from "react";
import { FileUp, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { isCompleteStory } from "@/lib/stories";

export default function StoryForm({ draft, editing, busy, onChange, onSave, onCancel }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const ready = isCompleteStory(draft);

  // A picture or a video is uploaded to the app's own private storage: what is saved is a
  // reference to it, and it is opened for a person through a short-lived link, never publicly.
  const take = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      onChange({
        media_file_uri: file_uri,
        media_kind: file.type.startsWith("video") ? "video" : "image",
        media_url: "",
      });
    } catch (err) {
      setError("That file couldn't be uploaded — try again, or paste a link instead.");
    } finally {
      setUploading(false);
    }
  };

  const clearMedia = () => onChange({ media_file_uri: "", media_url: "", media_kind: "none" });

  const takeLink = (value) => {
    const link = value.trim();
    onChange({
      media_url: link,
      media_kind: link ? "link" : "none",
      media_file_uri: "",
    });
  };

  const media = draft.media_file_uri ? `${draft.media_kind === "video" ? "Video" : "Picture"} uploaded` : "";

  return (
    <div className="knowledge-form">
      <label className="knowledge-field">
        <span className="knowledge-label">Title</span>
        <input
          value={draft.title || ""}
          placeholder="Mfano: Historia ya Babembe"
          onChange={(event) => onChange({ title: event.target.value })}
          className="account-input"
        />
      </label>

      <label className="knowledge-field">
        <span className="knowledge-label">The story</span>
        <textarea
          value={draft.text || ""}
          placeholder="Andika hadithi hapa — ndiyo inayosomwa na kuonyeshwa kwa mtu"
          onChange={(event) => onChange({ text: event.target.value })}
          className="account-area knowledge-area"
        />
      </label>

      <label className="knowledge-field">
        <span className="knowledge-label">Tags</span>
        <input
          value={draft.tags || ""}
          placeholder="babembe, historia, utamaduni — separated by commas"
          onChange={(event) => onChange({ tags: event.target.value })}
          className="account-input"
        />
      </label>

      <div className="knowledge-field">
        <span className="knowledge-label">Picture, video or link</span>
        <div className="knowledge-upload-wrap">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy || uploading}
            className="knowledge-upload"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileUp className="h-3.5 w-3.5" />
            )}
            {uploading ? "Uploading…" : "Upload a picture or video"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            onChange={take}
            className="hidden"
          />
          {media ? (
            <button type="button" onClick={clearMedia} className="knowledge-cancel">
              {media} — remove
            </button>
          ) : null}
        </div>
        <input
          value={draft.media_url || ""}
          placeholder="Or paste a link — https://…"
          onChange={(event) => takeLink(event.target.value)}
          className="account-input"
        />
      </div>

      <label className="knowledge-field">
        <span className="knowledge-label">Reference links</span>
        <textarea
          value={draft.links || ""}
          placeholder="One link per line — https://…"
          onChange={(event) => onChange({ links: event.target.value })}
          className="account-area"
        />
      </label>

      <label className="account-action account-action-neutral">
        <span className="account-action-label">
          <input
            type="checkbox"
            checked={draft.published !== false}
            onChange={(event) => onChange({ published: event.target.checked })}
          />
          Published — people can meet this story
        </span>
      </label>

      {error ? <p className="knowledge-error">{error}</p> : null}

      <div className="knowledge-form-actions">
        <button type="button" onClick={onSave} disabled={busy || uploading || !ready} className="account-save">
          {busy ? "Saving…" : editing ? "Save changes" : "Add story"}
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