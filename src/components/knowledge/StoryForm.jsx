import React, { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { isCompleteStory } from "@/lib/stories";
import { linkMark, mediaMark } from "@/lib/storyMarks";
import { youtubeVideo } from "@/lib/youtube";
import StoryLinks from "@/components/knowledge/StoryLinks";
import StoryPreview from "@/components/story/StoryPreview";

// What kind of thing the chosen file is, so the story knows how to show it.
const kindOfFile = (type) =>
  type?.startsWith("video") ? "video" : type?.startsWith("audio") ? "audio" : "image";

// A pasted address is read for what it carries: a picture, a video or an audio recording is shown
// inside the story itself, and anything else stands as a link opened where it already is.
const kindOfLink = (url) => {
  // a YouTube address is a video, played right inside the story and never sent away
  if (youtubeVideo(url)) return "video";
  if (/\.(png|jpe?g|gif|webp|avif|bmp)(\?|#|$)/i.test(url)) return "image";
  if (/\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(url)) return "video";
  if (/\.(mp3|wav|m4a|aac|ogg|oga|opus|flac)(\?|#|$)/i.test(url)) return "audio";
  return "link";
};

const withScheme = (value) => {
  const link = String(value || "").trim();
  if (!link) return "";
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
};

const MEDIA_WORD = { image: "Picture", video: "Video", audio: "Audio", link: "Link" };

export default function StoryForm({ draft, editing, busy, onChange, onSave, onCancel }) {
  const inputRef = useRef(null);
  const textRef = useRef(null);
  // where the mark goes: the spot the sign was typed at, so a slow upload never moves it
  const spotRef = useRef(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const ready = isCompleteStory(draft);
  const older = draft.media_kind && draft.media_kind !== "none" ? draft.media_kind : "";
  // the studio draws the story back as it is being written, so a mark can be played and checked
  const links = Array.isArray(draft.artist_links) ? draft.artist_links : [];
  const showsAnything =
    !!String(draft.text || "").trim() || !!older || !!draft.channel || links.length > 0;

  /** The writing keeps its place: a mark arriving late never pulls the caret away. */
  const place = (spot) => {
    const node = textRef.current;
    if (!node) return;
    requestAnimationFrame(() => {
      node.focus();
      node.setSelectionRange(spot, spot);
    });
  };

  /** The mark stands exactly where its sign was typed, between the words around it. */
  const putMark = (mark) => {
    const current = String(draft.text || "");
    const at = spotRef.current;
    const spot = at === null || at === undefined ? current.length : Math.min(at, current.length);
    onChange({ text: current.slice(0, spot) + mark + current.slice(spot) });
    spotRef.current = null;
    place(spot + mark.length);
  };

  // # calls the picker and * calls the link box. Neither sign is text: it is taken out as it is
  // typed, and what it brought stands in its place — even before a file has been chosen.
  const onStoryChange = (event) => {
    const value = event.target.value;
    const caret = event.target.selectionStart ?? value.length;
    const sign = value[caret - 1];
    // only a sign that was typed by hand calls anything: a paragraph pasted with a # in it stays text
    const typed = value.length <= String(draft.text || "").length + 1;
    if (!typed || (sign !== "#" && sign !== "*")) {
      onChange({ text: value });
      return;
    }
    // The sign goes as it is typed, and the caret is left where it is: the picker or the link box
    // must keep the place it is being given, or what is written next lands in the telling instead.
    spotRef.current = caret - 1;
    onChange({ text: value.slice(0, caret - 1) + value.slice(caret) });
    if (sign === "#") {
      inputRef.current?.click();
    } else {
      setLink("");
      setLinkOpen(true);
    }
  };

  // A chosen picture, video or audio recording goes to the app's own private storage, and its mark
  // is written where the # stood: it is opened later through a short-lived link, never publicly.
  const take = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      putMark(mediaMark(kindOfFile(file.type), file_uri));
    } catch (err) {
      setError("That file couldn't be uploaded — try again, or type * to paste a link instead.");
    } finally {
      setUploading(false);
    }
  };

  const putLink = () => {
    const url = withScheme(link);
    if (!url) return;
    const kind = kindOfLink(url);
    putMark(kind === "link" ? linkMark(url) : mediaMark(kind, url));
    setLink("");
    setLinkOpen(false);
  };

  // the one attachment an older story carries: it still shows at the story's end until it is taken out
  const dropOlder = () =>
    onChange({ media_kind: "none", media_url: "", media_file_uri: "", media_after: null });

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
          ref={textRef}
          value={draft.text || ""}
          placeholder={"Andika hadithi hapa — ndiyo inayosomwa na kuonyeshwa kwa mtu\n\n# hapa — picha, video au sauti\n* hapa — kiungo"}
          onChange={onStoryChange}
          className="account-area knowledge-area"
        />
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        onChange={take}
        className="hidden"
      />

      <span className="knowledge-meter-text">
        While writing: # puts a picture, video or audio where you type it · * pastes a link there.
        You can do it as many times as you like in one story. A YouTube link becomes a video that
        plays right here in the story, with its sound.
      </span>

      {uploading ? (
        <p className="knowledge-meter-text">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Uploading — its mark stands where you typed #
          </span>
        </p>
      ) : null}

      {linkOpen ? (
        <div className="knowledge-field">
          <span className="knowledge-label">The link</span>
          <div className="account-edit">
            <input
              autoFocus
              value={link}
              placeholder="https://…"
              onChange={(event) => setLink(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") putLink();
              }}
              className="account-input"
            />
            <button type="button" onClick={putLink} disabled={!link.trim()} className="account-save">
              Add
            </button>
            <button type="button" onClick={() => setLinkOpen(false)} className="knowledge-cancel">
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {showsAnything ? (
        <div className="knowledge-field">
          <span className="knowledge-label">In the story</span>
          <span className="knowledge-meter-text">
            What people will meet, standing where you put it — play each one to check it is good.
          </span>
          <StoryPreview
            text={draft.text}
            title={draft.title}
            channel={draft.channel}
            artistLinks={links}
            media={
              older
                ? {
                    kind: draft.media_kind,
                    url: draft.media_url,
                    uri: draft.media_file_uri,
                    after: draft.media_after,
                  }
                : null
            }
          />
        </div>
      ) : null}

      {older ? (
        <div className="knowledge-field">
          <span className="knowledge-label">An earlier attachment</span>
          <div className="account-edit">
            <span className="knowledge-meter-text">
              Its {MEDIA_WORD[older] || "file"} still shows at the end of the story.
            </span>
            <button type="button" onClick={dropOlder} className="knowledge-cancel">
              Remove
            </button>
          </div>
        </div>
      ) : null}

      <StoryLinks
        channel={draft.channel}
        links={links}
        onChange={onChange}
      />

      <label className="knowledge-field">
        <span className="knowledge-label">Tags</span>
        <input
          value={draft.tags || ""}
          placeholder="babembe, historia, utamaduni — separated by commas"
          onChange={(event) => onChange({ tags: event.target.value })}
          className="account-input"
        />
      </label>

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
        <button
          type="button"
          onClick={onSave}
          disabled={busy || uploading || !ready}
          className="account-save"
        >
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