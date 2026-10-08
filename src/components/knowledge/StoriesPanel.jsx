import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { emptyStory, storyDraft, storyFields } from "@/lib/stories";
import { channelStale, syncStoryChannel } from "@/lib/channelSync";
import StoryForm from "@/components/knowledge/StoryForm";
import StoryEntry from "@/components/knowledge/StoryEntry";

export default function StoriesPanel() {
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState(emptyStory);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [ask, setAsk] = useState("");

  // The list carries only what it shows: the telling itself stays on the server until it is opened.
  // A search is put to the whole library on the server, so a story saved long ago is found by its
  // title or by one of the words it is filed under, and can be opened in the form and put right.
  const load = async (text) => {
    const wanted = String(text || "").trim();
    const query = wanted
      ? {
          $or: [
            { title: { $regex: wanted, $options: "i" } },
            { tags: { $regex: wanted, $options: "i" } },
          ],
        }
      : {};

    const page = await base44.entities.Story.filter(query, {
      sort: "-updated_date",
      limit: 50,
      fields: [
        "title",
        "text",
        "tags",
        "media_kind",
        "links",
        "channel_url",
        "channel_synced_at",
        "artist_links",
        "published",
      ],
    });
    return page?.items || [];
  };

  useEffect(() => {
    let alive = true;
    load("")
      .then((items) => {
        if (!alive) return;
        setRows(items);
        setReady(true);
      })
      .catch(() => {
        if (!alive) return;
        setError("Could not load your stories.");
        setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const change = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  const startNew = () => {
    setEditingId(null);
    setDraft(emptyStory());
    setError("");
  };

  const edit = async (row) => {
    if (busy) return;
    setBusy(row.id);
    setError("");
    try {
      const full = await base44.entities.Story.get(row.id);
      setEditingId(full.id);
      setDraft(storyDraft(full));
    } catch (err) {
      setError("Could not open that story.");
    } finally {
      setBusy("");
    }
  };

  const find = async () => {
    if (busy) return;
    setBusy("find");
    setError("");
    try {
      setRows(await load(ask));
    } catch (err) {
      setError("Could not search your stories.");
    } finally {
      setBusy("");
    }
  };

  const all = async () => {
    setAsk("");
    if (busy) return;
    setBusy("find");
    setError("");
    try {
      setRows(await load(""));
    } catch (err) {
      setError("Could not load your stories.");
    } finally {
      setBusy("");
    }
  };

  const save = async () => {
    if (busy) return;
    let fields = storyFields(draft);
    if (!fields.title || !fields.text) {
      setError("A story needs a title and the telling itself.");
      return;
    }

    setBusy("save");
    setError("");
    try {
      // A story whose channel has never been read — or was last read more than a day ago — has the
      // artist's published videos brought in again before it is saved, so the list on screen is the
      // channel's own list. A channel that could not be read leaves the saved list exactly as it is.
      if (fields.channel_url && channelStale(draft.channel_synced_at)) {
        const read = await syncStoryChannel({
          channel: fields.channel_url,
          entries: fields.artist_links,
        });
        if (read.ok) {
          fields = { ...fields, artist_links: read.entries, channel_synced_at: read.synced_at };
        }
      }

      if (editingId) {
        const saved = await base44.entities.Story.update(editingId, fields);
        setRows((prev) => prev.map((row) => (row.id === editingId ? saved : row)));
      } else {
        const saved = await base44.entities.Story.create(fields);
        setRows((prev) => [saved, ...prev]);
      }
      startNew();
    } catch (err) {
      setError("Could not save that story.");
    } finally {
      setBusy("");
    }
  };

  const remove = async (row) => {
    if (busy) return;
    setBusy(row.id);
    setError("");
    try {
      await base44.entities.Story.delete(row.id);
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      if (editingId === row.id) startNew();
    } catch (err) {
      setError("Could not delete that story.");
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <p className="account-hint">
        A story you save here is your own telling: the assistant answers from it, and a person meets
        it on screen — the telling, its picture, video or audio recording, and your links — when a
        call turns to what you wrote. Playing what you attached ends their call, so nothing is heard
        over it. Give a story the artist's channel and the videos they have published come in by
        themselves and are kept in step. Every story you have saved stays editable, however old.
      </p>

      <StoryForm
        draft={draft}
        editing={!!editingId}
        busy={busy === "save"}
        onChange={change}
        onSave={save}
        onCancel={startNew}
      />

      {error ? <p className="knowledge-error">{error}</p> : null}

      <div className="knowledge-field">
        <span className="knowledge-label">Find an old story</span>
        <div className="account-edit">
          <input
            value={ask}
            placeholder="Its title, or one of its tags"
            onChange={(event) => setAsk(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") find();
            }}
            className="account-input"
          />
          <button type="button" onClick={find} disabled={busy === "find"} className="account-save">
            {busy === "find" ? "Finding…" : "Find"}
          </button>
        </div>
        {ask.trim() ? (
          <button type="button" onClick={all} className="knowledge-cancel">
            Show all your stories again
          </button>
        ) : (
          <span className="knowledge-meter-text">
            Search the whole library — an old story opens in the form above and can be put right.
          </span>
        )}
      </div>

      <div className="account-actions">
        {!ready ? (
          <p className="knowledge-empty">Loading your stories…</p>
        ) : rows.length ? (
          rows.map((row) => (
            <StoryEntry
              key={row.id}
              row={row}
              busy={busy === row.id}
              onEdit={edit}
              onDelete={remove}
            />
          ))
        ) : (
          <p className="knowledge-empty">
            No stories saved yet — write the first one, give it its tags, and attach a picture, a
            video, an audio recording or a link.
          </p>
        )}
      </div>
    </>
  );
}