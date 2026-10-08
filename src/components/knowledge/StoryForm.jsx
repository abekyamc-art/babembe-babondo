import React, { useRef, useState } from "react";
import { FileUp, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { isCompleteStory, storyLines } from "@/lib/stories";

// What kind of thing the chosen file is, so the story knows how to show it.
const kindOfFile = (type) =>
  type?.startsWith("video") ? "video" : type?.startsWith("audio") ? "audio" : "image";

// A pasted address is read for what it carries: a picture, a video or an audio recording is shown
// in the app, and anything else is opened where it already stands.
const kindOfLink = (url) => {
  if (/\.(png|jpe?g|gif|webp|avif|bmp)(\?|#|$)/i.test(url)) return "image";
  if (/\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(url)) return "video";
  if (/\.(mp3|wav|m4a|aac|ogg|oga|opus|flac)(\?|#|$)/i.test(url)) return "audio";
  return "link";
};

const MEDIA_WORD = { image: "Picture", video: "Video", audio: "Audio" };

export default function StoryForm({ draft, editing, busy, onChange, onSave, onCancel }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const ready = isCompleteStory(draft);

  // A picture, a video or an audio recording is uploaded to the app's own private storage: what is
  // saved is a reference to it, and it is opened for a person through a short-lived link, never
  // publicly.
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
        media_kind: kindOfFile(file.type),
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
      media_kind: link ? kindOfLink(link) : "none",
      media_file_uri: "",
    });
  };

  const media = draft.media_file_uri ? `${MEDIA_WORD[draft.media_kind] || "File"} uploaded` : "";
  const attached = !!draft.media_kind && draft.media_kind !== "none";

  // Where the attached thing stands inside the telling, as the spots a person can point at: in
  // front of it, after one of its lines, or at its end.
  const lines = storyLines(draft.text);
  const spots = [
    { value: 0, label: "Before it" },
    ...lines.slice(0, 12).map((line, index) => ({
      value: index + 1,
      label: `After ${index + 1}`,
      hint: line.slice(0, 48),
    })),
    { value: null, label: "At the end" },
  ];
  const placed = draft.media_after ?? null;

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
        <span className="knowledge-label">Picture, video, audio or link</span>
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
            {uploading ? "Uploading…" : "Upload a picture, video or audio"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*,audio/*"
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

      {attached ? (
        <div className="knowledge-field">
          <span className="knowledge-label">Where it stands in the story</span>
          <div className="knowledge-switch">
            {spots.map((spot) => (
              <button
                key={String(spot.value)}
                type="button"
                title={spot.hint || ""}
                onClick={() => onChange({ media_after: spot.value })}
                className={`knowledge-tab ${spot.value === placed ? "is-active" : ""}`}
              >
                {spot.label}
              </button>
            ))}
          </div>
          <span className="knowledge-meter-text">
            {lines.length > 12
              ? "It can stand after your first twelve lines, or at the end."
              : "Choose the line your picture, video, audio or link should follow."}
          </span>
        </div>
      ) : null}

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