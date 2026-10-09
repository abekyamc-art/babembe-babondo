import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Circle, FileText, Trash2, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";

/**
 * The files the language is kept in: the corpus itself, and the two dictionaries — English to
 * Kibembe, and Kibembe to English.
 *
 * A file is read twice over. The first reading only shows what is in it, so the words are seen before
 * any of them is used: the file is kept as a draft and changes nothing. The second reading is the
 * admin's approval, and only then are the file's words written into the app's own knowledge — each
 * one stamped with the file it came out of.
 *
 * The admin's one knowledge document is never overwritten by a file: a word the document already
 * carries is left exactly as the document writes it, and a file only adds what the app does not hold.
 * Because every word a file brought in carries its name, throwing the file away takes back exactly
 * what it brought in and nothing else.
 */

const KINDS = [
  { id: "dictionary_en_kb", label: "English → Kibembe" },
  { id: "dictionary_kb_en", label: "Kibembe → English" },
  { id: "corpus", label: "The corpus" },
];

export default function DictionaryPanel() {
  const [kind, setKind] = useState("dictionary_en_kb");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const inputRef = useRef(null);

  const loadRows = useCallback(async () => {
    const page = await base44.entities.KnowledgeFile.list({ sort: "-created_date", limit: 40 });
    return page?.items || [];
  }, []);

  const refresh = useCallback(async () => {
    try {
      setRows(await loadRows());
    } catch (err) {
      setRows([]);
      setError("The saved files could not be read just now.");
    }
  }, [loadRows]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** The file goes into private storage first, then the app reads it and shows what it holds. */
  const read = useCallback(async () => {
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setBusy("read");
    setError("");
    setPreview(null);
    try {
      const saved = await base44.integrations.Core.UploadPrivateFile({ file });
      const file_uri = String(saved?.file_uri || "");
      if (!file_uri) throw new Error("no-file");

      const res = await base44.functions.invoke("knowledgeFiles", {
        action: "read",
        file_uri,
        name: file.name,
        kind,
        note: note.trim(),
      });
      const data = res?.data || {};
      if (data.error) {
        setError(data.error);
        return;
      }
      setPreview({ ...data, file_uri });
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          "That file could not be read — try again, or use a plain .txt, .csv, .md or .json file."
      );
    } finally {
      setBusy("");
    }
  }, [file, kind, note]);

  /** The admin's own approval: only now do the file's words reach an answer. */
  const approve = useCallback(async () => {
    if (!preview) return;
    setBusy("approve");
    setError("");
    try {
      const res = await base44.functions.invoke("knowledgeFiles", {
        action: "approve",
        id: preview.id,
        file_uri: preview.file_uri,
        name: preview.name,
        kind: preview.kind,
        note: note.trim(),
      });
      const data = res?.data || {};
      if (data.error) {
        setError(data.error);
        return;
      }
      setPreview(null);
      setFile(null);
      setNote("");
      if (inputRef.current) inputRef.current.value = "";
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error || "That approval could not be saved just now.");
    } finally {
      setBusy("");
    }
  }, [note, preview, refresh]);

  /**
   * A file that was read earlier and left waiting is approved from the list — the app takes the
   * file, its name and its kind from the draft it already holds, so the same file is never chosen
   * a second time.
   */
  const approveSaved = useCallback(
    async (row) => {
      setBusy(row.id);
      setError("");
      try {
        const res = await base44.functions.invoke("knowledgeFiles", {
          action: "approve",
          id: row.id,
        });
        const data = res?.data || {};
        if (data.error) {
          setError(data.error);
          return;
        }
        await refresh();
      } catch (err) {
        setError("That approval could not be saved just now.");
      } finally {
        setBusy("");
      }
    },
    [refresh]
  );

  const remove = useCallback(
    async (row) => {
      setBusy(row.id);
      setError("");
      try {
        await base44.functions.invoke("knowledgeFiles", { action: "remove", id: row.id });
        await refresh();
      } catch (err) {
        setError("That file could not be thrown away just now.");
      } finally {
        setBusy("");
      }
    },
    [refresh]
  );

  return (
    <div className="account-panel">
      <div className="knowledge-form">
        <div className="knowledge-field">
          <span className="knowledge-label">Which file this is</span>
          <div className="knowledge-switch" role="group" aria-label="Kind of file">
            {KINDS.map((one) => (
              <button
                key={one.id}
                type="button"
                onClick={() => setKind(one.id)}
                aria-pressed={kind === one.id}
                className={`knowledge-tab${kind === one.id ? " is-active" : ""}`}
              >
                {one.label}
              </button>
            ))}
          </div>
          <p className="knowledge-empty">
            A Kibembe word is always the word in the pair, whichever way the dictionary is written: in
            the English to Kibembe file it is the right-hand side, and in the Kibembe to English file
            it is the left.
          </p>
        </div>

        <div className="knowledge-field">
          <span className="knowledge-label">The file</span>
          <label className="knowledge-upload">
            <Upload className="h-3.5 w-3.5" />
            {file ? file.name : "Choose a .txt, .csv, .md or .json file"}
            <input
              ref={inputRef}
              type="file"
              accept=".txt,.csv,.md,.json,.tsv,text/plain,text/csv,application/json"
              className="hidden"
              onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                setPreview(null);
                setError("");
              }}
            />
          </label>
          <span className="knowledge-meter-text">
            A Word or ZIP file is read through the document import instead.
          </span>
        </div>

        <div className="knowledge-field">
          <span className="knowledge-label">A note, if you want one</span>
          <input
            className="account-input"
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, 200))}
            placeholder="Mfano: the approved dictionary, second edition"
            aria-label="A note about the file"
          />
        </div>

        <div className="knowledge-form-actions">
          <button
            type="button"
            onClick={read}
            disabled={!!busy || !file}
            className="knowledge-pick is-go"
          >
            {busy === "read" ? <Circle className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
            Read the file
          </button>
          {preview ? (
            <button type="button" onClick={approve} disabled={!!busy} className="knowledge-pick">
              {busy === "approve" ? <Circle className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
              Approve {preview.fresh_count.toLocaleString()} new words
            </button>
          ) : null}
        </div>

        {error ? <p className="knowledge-error">{error}</p> : null}
      </div>

      {preview ? (
        <div className="knowledge-form">
          <span className="knowledge-label">What this file holds — not used yet</span>
          <p className="knowledge-meter-text">
            {preview.count.toLocaleString()} word pairs read · {preview.fresh_count.toLocaleString()}{" "}
            the app does not hold yet · {preview.held_count.toLocaleString()} already in the knowledge
          </p>
          {preview.capped ? (
            <p className="knowledge-meter-text">
              The file is longer than one reading takes in: the first 800 pairs are the ones written.
            </p>
          ) : null}
          <div className="doc-hits">
            {preview.preview.map((pair) => (
              <div key={pair.term} className="doc-hit">
                <span className="doc-hit-head">{pair.term}</span>
                <span className="doc-hit-line">{pair.meaning}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="knowledge-field">
        <span className="knowledge-label">The files saved</span>
        {rows === null ? (
          <p className="knowledge-empty">Reading them…</p>
        ) : rows.length ? (
          rows.map((row) => (
            <div key={row.id} className="knowledge-row">
              <div className="knowledge-body">
                <div className="knowledge-title">
                  {row.name}
                  <span className={`doc-chip${row.status === "approved" ? " is-live" : " is-dirty"}`} style={{ marginLeft: 8 }}>
                    {row.status === "approved" ? "in use" : "draft"}
                  </span>
                </div>
                <div className="knowledge-text">
                  {KINDS.find((one) => one.id === row.kind)?.label || row.kind}
                  {row.entry_count ? ` · ${Number(row.entry_count).toLocaleString()} words saved` : ""}
                  {row.chars ? ` · ${Number(row.chars).toLocaleString()} characters read` : ""}
                  {row.note ? ` · ${row.note}` : ""}
                </div>
              </div>
              <div className="knowledge-tools">
                {row.status === "approved" ? null : (
                  <button
                    type="button"
                    onClick={() => approveSaved(row)}
                    disabled={!!busy}
                    aria-label={`Approve ${row.name}`}
                    className="knowledge-tool"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(row)}
                  disabled={!!busy}
                  aria-label={`Throw away ${row.name}`}
                  className="knowledge-tool knowledge-tool-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="knowledge-empty">
            No files saved yet. Upload the approved dictionaries here, check the words they hold, then
            approve them — nothing out of a file reaches an answer until you do.
          </p>
        )}
      </div>
    </div>
  );
}