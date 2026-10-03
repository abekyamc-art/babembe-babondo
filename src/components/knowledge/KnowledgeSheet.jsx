import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { KINDS, emptyEntry, entryFields, kindHint } from "@/lib/knowledge";
import KnowledgeTabs from "@/components/knowledge/KnowledgeTabs";
import KnowledgeForm from "@/components/knowledge/KnowledgeForm";
import KnowledgeEntry from "@/components/knowledge/KnowledgeEntry";
import TextsPanel from "@/components/knowledge/TextsPanel";
import WordModeSwitch from "@/components/knowledge/WordModeSwitch";
import WordListForm from "@/components/knowledge/WordListForm";

export default function KnowledgeSheet({ open, onClose }) {
  const [kind, setKind] = useState(KINDS[0].id);
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState(() => emptyEntry(KINDS[0].id));
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  // words are added one at a time, or as a whole list pasted at once
  const [wordMode, setWordMode] = useState("one");

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    base44.entities.AssistantKnowledge.filter({}, { sort: "-updated_date", limit: 200 })
      .then((page) => {
        if (!alive) return;
        setRows(page?.items || []);
        setReady(true);
      })
      .catch(() => {
        if (!alive) return;
        setError("Could not load your knowledge.");
        setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [open]);

  const pick = (next) => {
    setKind(next);
    setEditingId(null);
    setDraft(emptyEntry(next));
    setError("");
  };

  const change = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));

  const pickWordMode = (next) => {
    setWordMode(next);
    setError("");
  };

  // every word read from a pasted list arrives saved already, as one group
  const addWords = (saved) => setRows((prev) => [...saved, ...prev]);

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(emptyEntry(kind));
    setError("");
  };

  const edit = (row) => {
    setEditingId(row.id);
    setDraft({ ...emptyEntry(row.kind), ...entryFields(row) });
    setError("");
  };

  const save = async () => {
    if (busy) return;
    setBusy("save");
    setError("");
    try {
      const fields = entryFields(draft);
      if (editingId) {
        const saved = await base44.entities.AssistantKnowledge.update(editingId, fields);
        setRows((prev) => prev.map((row) => (row.id === editingId ? saved : row)));
      } else {
        const saved = await base44.entities.AssistantKnowledge.create({ ...fields, kind });
        setRows((prev) => [saved, ...prev]);
      }
      setEditingId(null);
      setDraft(emptyEntry(kind));
    } catch (err) {
      setError("Could not save that entry.");
    } finally {
      setBusy("");
    }
  };

  const remove = async (row) => {
    if (busy) return;
    setBusy(row.id);
    setError("");
    try {
      await base44.entities.AssistantKnowledge.delete(row.id);
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      if (editingId === row.id) cancelEdit();
    } catch (err) {
      setError("Could not delete that entry.");
    } finally {
      setBusy("");
    }
  };

  if (!open) return null;

  const shown = rows.filter((row) => row.kind === kind);

  return (
    <div className="fixed inset-0 z-50">
      <div aria-hidden className="account-backdrop absolute inset-0" />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Assistant knowledge"
        className="account-sheet"
      >
        <div className="account-top">
          <span className="account-brand">Assistant knowledge</span>
          <div className="account-tools">
            {kind === "text" ? null : (
              <span className="account-usage">
                {rows.length} saved
              </span>
            )}
            <button type="button" onClick={onClose} aria-label="Close knowledge" className="account-icon">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="account-panel">
          <p className="account-hint">
            Private to you. The assistant answers typed questions from what you save here, and says
            so when a question isn&apos;t covered yet.
          </p>

          <KnowledgeTabs kind={kind} onPick={pick} />

          {kind === "text" ? (
            <TextsPanel />
          ) : (
            <>
              {kind === "word" && !editingId ? (
                <WordModeSwitch mode={wordMode} onPick={pickWordMode} />
              ) : null}

              {kind === "word" && wordMode === "list" && !editingId ? (
                <WordListForm onSaved={addWords} />
              ) : (
                <KnowledgeForm
                  kind={kind}
                  draft={draft}
                  editing={!!editingId}
                  busy={busy === "save"}
                  onChange={change}
                  onSave={save}
                  onCancel={cancelEdit}
                />
              )}

              {error ? <p className="knowledge-error">{error}</p> : null}

              <div className="account-actions">
                {!ready ? (
                  <p className="knowledge-empty">Loading what you have saved…</p>
                ) : shown.length ? (
                  shown.map((row) => (
                    <KnowledgeEntry
                      key={row.id}
                      row={row}
                      busy={busy === row.id}
                      onEdit={edit}
                      onDelete={remove}
                    />
                  ))
                ) : (
                  <p className="knowledge-empty">{kindHint(kind)}</p>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}