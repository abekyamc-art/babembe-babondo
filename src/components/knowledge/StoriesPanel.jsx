import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { emptyStory, storyDraft, storyFields } from "@/lib/stories";
import StoryForm from "@/components/knowledge/StoryForm";
import StoryEntry from "@/components/knowledge/StoryEntry";

export default function StoriesPanel() {
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState(emptyStory);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    // the list carries only what it shows: the telling itself stays on the server until it is opened
    base44.entities.Story.filter(
      {},
      { sort: "-updated_date", limit: 50, fields: ["title", "text", "tags", "media_kind", "links", "published"] }
    )
      .then((page) => {
        if (!alive) return;
        setRows(page?.items || []);
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

  const save = async () => {
    if (busy) return;
    const fields = storyFields(draft);
    if (!fields.title || !fields.text) {
      setError("A story needs a title and the telling itself.");
      return;
    }

    setBusy("save");
    setError("");
    try {
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
        over it.
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