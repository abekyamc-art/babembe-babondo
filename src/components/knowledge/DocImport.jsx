import React, { useRef, useState } from "react";
import { FileText, FileUp, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { DOC_MAX } from "@/lib/knowledgeDoc";
import { isPlainTextFile } from "@/lib/knowledgeTexts";

// How much of a file is read at a time, and how much imported text is written back in one go: a file
// larger than the device's memory is never held whole, and a write never carries more than the store
// takes comfortably.
const READ = 512 * 1024;
const WRITE = 120000;
// What the app's own storage keeps as a file of its own; beyond it only the text can be kept.
const KEEP = 50 * 1024 * 1024;
// The room an import takes of the document, kept a little short of the whole of it so the joins
// between its own pieces always fit inside what the document takes.
const ROOM = DOC_MAX - 240;

/**
 * The text of one file, handed over a piece at a time. A plain text file is read right here on the
 * device — a slice at a time, so a file far larger than anything the app could ever upload is no
 * trouble at all — and anything else, a PDF or a Word document, is lifted out by the app first.
 *
 * Where a whole file is lifted, its own private storage reference is handed back through `held` so
 * the same file can be kept beside the document afterwards.
 */
async function* piecesOf(file, stopped, held) {
  if (isPlainTextFile(file)) {
    for (let at = 0; at < file.size; at += READ) {
      if (stopped.current) return;
      yield await file.slice(at, at + READ).text();
    }
    return;
  }

  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
  held.uri = file_uri;
  const res = await base44.functions.invoke("knowledgeTextFromFile", { file_uri });
  const lifted = String(res?.data?.text || "");
  if (!lifted) throw new Error("nothing");
  yield lifted;
}

/**
 * A document imported into the working copy.
 *
 * A very large text file is read on the device and written into the working copy as it is read, so
 * what the admin already has — a file holding the words, the phrases, the rules and everything else
 * — can be brought in whole rather than retyped. The document takes a bounded text, and the import
 * is bounded with it: the file is taken up to that point, and what did not fit is said plainly
 * rather than passed over in silence.
 *
 * The file itself is kept beside the document, privately, so the whole of it stays openable to the
 * admin even when only a part of it stands in the working copy. Nothing reaches an AI until the
 * admin publishes, exactly as with anything else written here.
 */
export default function DocImport({ doc, onState }) {
  const inputRef = useRef(null);
  const stopped = useRef(false);
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const source = doc?.doc?.source || {};

  const openSource = async () => {
    if (!source.uri) return;
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri: source.uri,
      expires_in: 600,
    });
    if (signed_url) window.open(signed_url, "_blank", "noopener,noreferrer");
  };

  const take = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    stopped.current = false;
    setBusy(true);
    onState?.(true);
    setError("");
    setNote("");
    setPercent(0);

    let text = String(doc.text || "");
    const from = text.length;
    const room = ROOM - from;
    const held = { uri: "" };
    let whole = true;

    try {
      if (room <= 0) throw new Error("full");

      let pending = "";
      const flush = async () => {
        const body = pending.replace(/\s+$/, "");
        pending = "";
        if (!body) return;
        text = text ? `${text.replace(/\s+$/, "")}\n\n${body}` : body;
        const data = await doc.writeDraft(text);
        text = String(data?.draft || text);
      };

      for await (const piece of piecesOf(file, stopped, held)) {
        if (stopped.current) {
          whole = false;
          break;
        }
        const left = ROOM - (text.length + pending.length);
        if (left <= 0) {
          whole = false;
          break;
        }
        pending += piece.slice(0, left);
        if (pending.length >= WRITE) await flush();
        setPercent(Math.round(((text.length + pending.length - from) / room) * 100));
      }
      await flush();

      const added = text.length - from;
      const lines = (text.slice(from).match(/\n/g) || []).length;
      const count = added.toLocaleString();

      if (stopped.current) {
        setNote(`Stopped. What was read — ${count} characters — is in the working copy.`);
      } else if (!whole) {
        setNote(
          `Imported the first ${count} characters. The document takes up to ` +
            `${DOC_MAX.toLocaleString()} characters, and it is full now — the rest of the file did ` +
            `not fit, and is untouched in the file itself.`
        );
      } else {
        setNote(
          `Imported the whole file: ${count} characters (${lines.toLocaleString()} lines) now stand ` +
            `in the working copy. Save it, then publish it when you are ready.`
        );
      }

      if (file.size <= KEEP) {
        try {
          const uri = held.uri || (await base44.integrations.Core.UploadPrivateFile({ file })).file_uri;
          await doc.recordSource({ name: file.name, file_uri: uri, chars: added });
          setNote(
            (line) =>
              `${line} The whole file is kept with the document, privately — open it from here whenever you want.`
          );
        } catch (err) {
          setNote((line) => `${line} The file itself could not be kept beside the document.`);
        }
      } else {
        setNote(
          (line) =>
            `${line} A file this large cannot be kept beside the document, so its text is what is kept.`
        );
      }
    } catch (err) {
      setError(
        err?.message === "full"
          ? "The document is already full — take a part of it out, then import."
          : err?.message === "nothing"
            ? "No readable text was found in that document."
            : "That document could not be imported. A plain text file (.txt) is read right here; anything else is lifted out by the app — try again, or paste the text into the box."
      );
    } finally {
      setBusy(false);
      setPercent(0);
      onState?.(false);
    }
  };

  return (
    <div className="knowledge-form">
      <div className="knowledge-upload-wrap">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || !!doc.busy}
          className="knowledge-upload"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileUp className="h-3.5 w-3.5" />
          )}
          {busy ? "Importing…" : "Import a document into the working copy"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.md,.markdown,.csv,.json,.srt,.vtt,.pdf,.doc,.docx,text/plain"
          onChange={take}
          className="hidden"
        />
        <span className="knowledge-meter-text">
          A plain text file is read on your device, a piece at a time, so even a very large one is
          taken as it is — and what it holds is written straight into the working copy. The document
          itself takes up to {DOC_MAX.toLocaleString()} characters, so a longer file comes in up to
          that point, and the whole of it stays kept beside the document for you.
        </span>
      </div>

      {busy ? (
        <div className="knowledge-field">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="knowledge-meter-text">
            Reading the file and writing it into the working copy… {percent}%
          </span>
          <button
            type="button"
            onClick={() => {
              stopped.current = true;
            }}
            className="knowledge-cancel"
          >
            Stop — keep what has been read so far
          </button>
        </div>
      ) : null}

      {note ? <p className="knowledge-meter-text">{note}</p> : null}
      {error ? <p className="knowledge-error">{error}</p> : null}

      {source.name ? (
        <button type="button" onClick={openSource} className="knowledge-upload">
          <FileText className="h-3.5 w-3.5" />
          The file this came from: {source.name}
        </button>
      ) : null}
    </div>
  );
}