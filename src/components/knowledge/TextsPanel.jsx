import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { WORD_LIMIT, countWords, emptyText, splitPassages } from "@/lib/knowledgeTexts";
import TextForm from "@/components/knowledge/TextForm";
import TextEntry from "@/components/knowledge/TextEntry";

export default function TextsPanel() {
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState(emptyText);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    // the list carries only what it shows: the text itself stays on the server
    base44.entities.KnowledgeText.filter(
      {},
      { sort: "-updated_date", limit: 25, fields: ["title", "word_count"] }
    )
      .then((page) => {
        if (!alive) return;
        setRows(page?.items || []);
        setReady(true);
      })
      .catch(() => {
        if (!alive) return;
        setError("Could not load your texts.");
        setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const change = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  const startNew = () => {
    setEditingId(null);
    setDraft(emptyText());
    setError("");
  };

  const edit = async (row) => {
    if (busy) return;
    setBusy(row.id);
    setError("");
    try {
      const full = await base44.entities.KnowledgeText.get(row.id);
      setEditingId(full.id);
      setDraft({ title: full.title || "", text: full.text || "", file_uri: full.file_uri || "" });
    } catch (err) {
      setError("Could not open that text.");
    } finally {
      setBusy("");
    }
  };

  const save = async () => {
    if (busy) return;
    const title = String(draft.title || "").trim();
    const text = String(draft.text || "").trim();
    const words = countWords(text);
    if (!title || !text) {
      setError("A saved text needs a title and the text itself.");
      return;
    }
    if (words > WORD_LIMIT) {
      setError("That text is too long — trim it, or save it as two texts.");
      return;
    }

    setBusy("save");
    setError("");
    const fields = {
      title,
      text,
      word_count: words,
      passages: splitPassages(text),
      file_uri: draft.file_uri || "",
    };
    try {
      if (editingId) {
        const saved = await base44.entities.KnowledgeText.update(editingId, fields);
        setRows((prev) =>
          prev.map((row) =>
            row.id === editingId ? { ...row, title: saved.title, word_count: saved.word_count } : row
          )
        );
      } else {
        const saved = await base44.entities.KnowledgeText.create(fields);
        setRows((prev) => [{ id: saved.id, title: saved.title, word_count: saved.word_count }, ...prev]);
      }
      startNew();
    } catch (err) {
      setError("Could not save that text.");
    } finally {
      setBusy("");
    }
  };

  const remove = async (row) => {
    if (busy) return;
    setBusy(row.id);
    setError("");
    try {
      await base44.entities.KnowledgeText.delete(row.id);
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      if (editingId === row.id) startNew();
    } catch (err) {
      setError("Could not delete that text.");
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <p className="account-hint">
        Both AIs read what you save here and follow it. A text whose title mentions rules — a
        rule book saved as &quot;Rules&quot; — is obeyed on every answer and every rap take.
      </p>

      <TextForm
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
          <p className="knowledge-empty">Loading your texts…</p>
        ) : rows.length ? (
          rows.map((row) => (
            <TextEntry
              key={row.id}
              row={row}
              busy={busy === row.id}
              onEdit={edit}
              onDelete={remove}
            />
          ))
        ) : (
          <p className="knowledge-empty">
            No long texts saved yet — paste a whole document or upload one, and the assistant
            answers from the parts that matter.
          </p>
        )}
      </div>
    </>
  );
}