import React, { useState } from "react";
import { Loader2, Plus, RefreshCw, X } from "lucide-react";
import { hostOf } from "@/lib/stories";
import { fromChannel, syncStoryChannel } from "@/lib/channelSync";

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

export default function StoryLinks({ channel = "", syncedAt = "", links = [], onChange }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [note, setNote] = useState("");
  const [failed, setFailed] = useState(false);
  const rows = Array.isArray(links) ? links : [];

  /**
   * One reading of the artist's channel. Every video the channel has published comes in with the
   * name the artist gave it, the videos you wrote in yourself stay exactly as they are, and a video
   * the artist has taken down goes with it. A channel that could not be read changes nothing.
   */
  const sync = async () => {
    const target = withScheme(channel);
    if (!target) {
      setFailed(true);
      setNote("Write the channel address first.");
      return;
    }

    setSyncing(true);
    setFailed(false);
    setNote("");
    try {
      const read = await syncStoryChannel({ channel: target, entries: rows });
      if (!read.ok) {
        setFailed(true);
        setNote(
          read.reason ||
            "The channel could not be read just now — the videos you have stay as they are."
        );
        return;
      }
      onChange({ artist_links: read.entries, channel_synced_at: read.synced_at });
      setNote(
        read.count
          ? `${read.count} video${read.count > 1 ? "s" : ""} came from the channel.`
          : "The channel has no published videos yet."
      );
    } catch (err) {
      setFailed(true);
      setNote("The channel could not be read just now — the videos you have stay as they are.");
    } finally {
      setSyncing(false);
    }
  };

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
        // a new address is read afresh: the time of the last reading is cleared with it
        onChange={(event) => onChange({ channel: event.target.value, channel_synced_at: "" })}
        className="account-input"
      />
      <div className="account-edit">
        <button type="button" onClick={sync} disabled={syncing} className="account-save">
          <span className="inline-flex items-center gap-1.5">
            {syncing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {syncing ? "Reading the channel…" : "Read the channel"}
          </span>
        </button>
        <span className="knowledge-meter-text">
          {syncedAt ? `Last read: ${new Date(syncedAt).toLocaleString()}` : "Not read yet"}
        </span>
      </div>
      {note ? (
        <span className={failed ? "knowledge-error" : "knowledge-meter-text"}>{note}</span>
      ) : null}
      <span className="knowledge-meter-text">
        Where everything they do is gathered — the channel opens on its own, apart from the story and
        from its reference links. Read it and every video the artist has published comes in by itself,
        with the name they gave it, and is kept in step with the channel.
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
        One at a time: name it, paste its address, and it takes its own place in the story. What the
        channel has published comes in by itself; anything you write in here stays beside it, whatever
        the channel does.
      </span>

      {rows.length ? (
        <div className="flex flex-col">
          {rows.map((entry, index) => (
            <div key={`${entry.url}-${index}`} className="knowledge-row">
              <span className="knowledge-body">
                <span className="knowledge-title">
                  {entry.name || hostOf(entry.url)}
                </span>
                <span className="knowledge-text">
                  {hostOf(entry.url)}
                  {fromChannel(entry) ? " · read from the channel" : " · written in by you"}
                </span>
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