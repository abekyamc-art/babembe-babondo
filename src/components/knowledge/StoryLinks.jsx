import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { hostOf } from "@/lib/stories";

/**
 * The artist's own places, written into the story: the address of their channel, and then the videos
 * and other pieces they have published — each one added on its own, with the name it goes by and the
 * address it stands at.
 *
 * What is added here is kept apart from the story's own telling and apart from its reference links:
 * a channel stands alone, and every published video is its own entry.
 */
const withScheme = (value) => {
  const link = String(value || "").trim();
  if (!link) return "";
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
};

export default function StoryLinks({ channel = "", links = [], onChange }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const rows = Array.isArray(links) ? links : [];

  const add = () => {
    const target = withScheme(url);
    if (!target) return;
    onChange({ artist_links: [...rows, { name: name.trim(), url: target }] });
    setName("");
    setUrl("");
  };

  const drop = (index) =>
    onChange({ artist_links: rows.filter((_, at) => at !== index) });

  return (
    <div className="knowledge-field">
      <span className="knowledge-label">The artist's channel</span>
      <input
        value={channel}
        placeholder="https://www.youtube.com/@jina-lako"
        onChange={(event) => onChange({ channel: event.target.value })}
        className="account-input"
      />
      <span className="knowledge-meter-text">
        Where everything they do is gathered — the channel opens on its own, apart from the story and
        from its reference links.
      </span>

      <span className="knowledge-label">Videos and pieces published</span>
      <div className="account-edit">
        <input
          value={name}
          placeholder="Name of the video"
          onChange={(event) => setName(event.target.value)}
          className="account-input"
        />
        <input
          value={url}
          placeholder="https://youtu.be/…"
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") add();
          }}
          className="account-input"
        />
        <button
          type="button"
          onClick={add}
          disabled={!url.trim()}
          className="account-save"
        >
          <span className="inline-flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add
          </span>
        </button>
      </div>
      <span className="knowledge-meter-text">
        One at a time: name it, paste its address, and it takes its own place in the story.
      </span>

      {rows.length ? (
        <div className="flex flex-col">
          {rows.map((entry, index) => (
            <div key={`${entry.url}-${index}`} className="knowledge-row">
              <span className="knowledge-body">
                <span className="knowledge-title">
                  {entry.name || hostOf(entry.url)}
                </span>
                <span className="knowledge-text">{hostOf(entry.url)}</span>
              </span>
              <span className="knowledge-tools">
                <button
                  type="button"
                  onClick={() => drop(index)}
                  aria-label="Take this entry out"
                  className="knowledge-tool knowledge-tool-danger"
                >
                  <X className="h-4 w-4" />
                </button>
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}