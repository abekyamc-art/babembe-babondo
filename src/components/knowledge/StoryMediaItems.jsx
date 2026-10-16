import React, { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { hostOf } from "@/lib/stories";
import PickSheet from "@/components/knowledge/PickSheet";
import {
  kindOfFile,
  kindOfLink,
  lineLabel,
  storyLines,
  suggestAfter,
  withScheme,
} from "@/lib/storyPlacement";

const KIND_WORD = { image: "Picture", video: "Video", audio: "Audio", link: "Link" };
const CLIP = 64;

/** The places a thing can stand: in front of the telling, or after any of its lines — the last of
 *  which is the end of the story. */
function placesOf(lines) {
  const options = [{ value: 0, label: "Before the first line of the telling" }];
  lines.forEach((line, index) => {
    const said = lineLabel(line).slice(0, CLIP);
    options.push({
      value: index + 1,
      label: index + 1 === lines.length ? `At the end — after: “${said}”` : `After: “${said}”`,
    });
  });
  return options;
}

const nameOf = (value) =>
  String(value || "")
    .replace(/\.[a-z0-9]{1,5}$/i, "")
    .trim()
    .slice(0, 60);

/** What one thing added from the panel is called in the list. */
const labelOf = (thing) => thing.name || (thing.url ? hostOf(thing.url) : "An uploaded file");

/**
 * The pictures, videos, audio recordings and links the admin gives a place to by hand.
 *
 * Each one is added here without touching the telling, and the app reads the telling to find the line
 * that names it — the address written out, or the words of its own name — and places it there. What
 * was found is said plainly and can be moved to any other line, so nothing is ever guessed at
 * silently. A thing that wants to stand in the middle of a sentence is written into the telling
 * itself instead, with # or *, and stands exactly where it is typed.
 */
export default function StoryMediaItems({ text, items = [], onChange }) {
  const fileRef = useRef(null);
  const [link, setLink] = useState("");
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const lines = storyLines(text);
  const places = placesOf(lines);

  /** Where one thing stands, said plainly: after the line it follows, as that line reads on screen. */
  const placeText = (thing) => {
    const spot = Math.min(Math.max(Number(thing.after) || 0, 0), lines.length);
    if (!spot) return "Stands before the first line of the telling.";
    const said = lineLabel(lines[spot - 1]).slice(0, CLIP);
    return spot === lines.length
      ? `Stands at the end, after: “${said}”`
      : `Stands after: “${said}”`;
  };

  const spotOf = (thing) => Math.min(Math.max(Number(thing.after) || 0, 0), lines.length);

  /** The app finds the line that names the thing and offers that place, which the admin can move. */
  const add = (thing) => {
    const found = suggestAfter(text, thing);
    // a thing no line names is kept at the end until the admin moves it, and is told so plainly
    const after = found.after === null ? lines.length : found.after;
    onChange({ media: [...items, { ...thing, after }] });
    setNote(
      found.after === null
        ? "Nothing in the telling names this one — choose where it stands below."
        : `Placed after the line that names it — move it below if you like: “${lineLabel(
            found.line
          ).slice(0, CLIP)}”`
    );
  };

  // An added file goes to the app's own private storage, and is kept with the place it stands; it is
  // opened later through a short-lived link, never publicly.
  const take = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setAdding(true);
    setError("");
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      add({ kind: kindOfFile(file.type), url: "", uri: file_uri, name: nameOf(file.name) });
    } catch (err) {
      setError("That file couldn't be uploaded — try again.");
    } finally {
      setAdding(false);
    }
  };

  const putLink = () => {
    const url = withScheme(link);
    if (!url) return;
    add({ kind: kindOfLink(url), url, uri: "", name: "" });
    setLink("");
  };

  const move = (index, value) =>
    onChange({
      media: items.map((thing, at) =>
        at === index ? { ...thing, after: Number(value) } : thing
      ),
    });

  const drop = (index) => onChange({ media: items.filter((thing, at) => at !== index) });

  return (
    <div className="knowledge-field">
      <span className="knowledge-label">Pictures, videos and links in the telling</span>

      <span className="knowledge-meter-text">
        Add one here and the app reads the telling to find the line that names it, then places it
        there — you can move it to any line. A thing that must stand in the middle of a sentence is
        written into the telling itself: # where you want it for a picture, video or audio, and * for
        a link.
      </span>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*,audio/*"
        onChange={take}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={adding}
        className="knowledge-upload"
      >
        {adding ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        {adding ? "Uploading…" : "Add a picture, video or audio"}
      </button>

      <div className="account-edit">
        <input
          value={link}
          placeholder="Paste a video or picture link — https://…"
          onChange={(event) => setLink(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") putLink();
          }}
          className="account-input"
        />
        <button type="button" onClick={putLink} disabled={!link.trim()} className="account-save">
          Add
        </button>
      </div>

      {items.length ? (
        <div className="account-actions">
          {items.map((thing, index) => (
            <div key={index} className="knowledge-row">
              <div className="knowledge-body">
                <div className="knowledge-title">
                  {KIND_WORD[thing.kind] || "Media"} · {labelOf(thing)}
                </div>
                <div className="knowledge-text">{placeText(thing)}</div>
                <PickSheet
                  value={String(spotOf(thing))}
                  options={places.map((place) => ({
                    value: String(place.value),
                    label: place.label,
                  }))}
                  onChange={(value) => move(index, value)}
                  title="Where this stands in the telling"
                  description="The app placed it by reading the telling. Move it to any line it should stand after."
                  ariaLabel="Where it stands in the telling"
                />
              </div>
              <div className="knowledge-tools">
                <button
                  type="button"
                  onClick={() => drop(index)}
                  aria-label="Take it out of the story"
                  className="knowledge-tool knowledge-tool-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {note ? <p className="knowledge-meter-text">{note}</p> : null}
      {error ? <p className="knowledge-error">{error}</p> : null}
    </div>
  );
}