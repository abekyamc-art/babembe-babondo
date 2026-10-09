import React, { useState } from "react";
import { Download, FolderDown, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

/** Hand the browser one file to keep, saved under the name given here. */
function save(href, name) {
  const link = document.createElement("a");
  link.href = href;
  link.download = name;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// a moment between one saved picture and the next: a browser takes a run of downloads better spaced
const PAUSE = 400;

/**
 * Every picture the admin saved beside a word, taken away for review at once.
 *
 * Two ways, because the two are useful for different things: one folder of all of them (a ZIP), or
 * each picture as its own file, saved under its word's own name so the name says what the picture is
 * of. Both are gathered on the server, where every privately kept picture can be read, and handed
 * here only as the file itself — so this works the same on a phone as on a desk.
 */
export default function PictureDownload({ count = 0 }) {
  const [busy, setBusy] = useState("");
  const [said, setSaid] = useState("");
  const [error, setError] = useState("");
  const none = !count;

  const zip = async () => {
    if (busy) return;
    setBusy("zip");
    setError("");
    setSaid("Reading every picture and building the folder…");
    try {
      const res = await base44.functions.invoke("knowledgePictures", { action: "zip" });
      const data = res?.data || {};
      if (data.error) throw new Error(data.error);
      save(data.url, data.file_name || "kibembe-knowledge-images.zip");
      setSaid(
        `${data.included} of ${data.total} pictures are in ${data.file_name} — your downloads are taking it now.` +
          (data.failed ? ` ${data.failed} could not be read.` : "")
      );
    } catch (err) {
      setSaid("");
      setError(err?.message || "The folder could not be built just now. Try again.");
    } finally {
      setBusy("");
    }
  };

  const each = async () => {
    if (busy) return;
    setBusy("each");
    setError("");
    setSaid("Saving them one at a time…");
    let from = 0;
    let saved = 0;
    let total = count;
    try {
      for (;;) {
        const res = await base44.functions.invoke("knowledgePictures", { action: "page", from, count: 5 });
        const data = res?.data || {};
        if (data.error) throw new Error(data.error);
        total = Number(data.total) || total;
        const items = Array.isArray(data.items) ? data.items : [];
        if (!items.length) break;
        for (const item of items) {
          const blob = await (await fetch(item.data_url)).blob();
          const url = URL.createObjectURL(blob);
          save(url, item.file_name);
          setTimeout(() => URL.revokeObjectURL(url), 30000);
          saved += 1;
          setSaid(`Saved ${saved} of ${total} pictures…`);
          await new Promise((done) => setTimeout(done, PAUSE));
        }
        if (!data.more) break;
        from = Number(data.next) || from + items.length;
      }
      setSaid(saved ? `${saved} pictures were saved to your downloads.` : "No pictures are saved yet.");
    } catch (err) {
      setError(err?.message || "They could not be saved just now. Try again.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="knowledge-field">
      <span className="knowledge-label">
        Take the pictures away with you{count ? ` · ${count}` : ""}
      </span>

      <div className="knowledge-form-actions">
        <button type="button" onClick={zip} disabled={!!busy || none} className="knowledge-upload">
          {busy === "zip" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FolderDown className="h-3.5 w-3.5" />
          )}
          {busy === "zip" ? "Building one folder…" : "Download all as one folder (ZIP)"}
        </button>
        <button type="button" onClick={each} disabled={!!busy || none} className="knowledge-upload">
          {busy === "each" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {busy === "each" ? "Saving them one by one…" : "Download each as its own file"}
        </button>
      </div>

      <span className="knowledge-meter-text">
        {none
          ? "No pictures are saved beside words yet — import a ZIP or a Word file that holds them, and they stand here."
          : "The folder comes as one ZIP; the other way saves each picture under its word's own name. Your browser may ask you to allow several downloads at once."}
      </span>

      {said ? <span className="knowledge-meter-text">{said}</span> : null}
      {error ? <p className="knowledge-error">{error}</p> : null}
    </div>
  );
}