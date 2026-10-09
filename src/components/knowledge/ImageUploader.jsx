import React, { useRef, useState } from "react";
import { Images, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { parseWords } from "@/lib/imageWords";

// how many pictures are put in before the server is told about them: a batch is bound to stay well
// inside what one request carries, and a run that is stopped keeps everything already put in
const RUN = 25;

const stamp = () => {
  const at = new Date();
  const two = (value) => String(value).padStart(2, "0");
  return `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())} ${two(at.getHours())}:${two(at.getMinutes())}`;
};

/**
 * Putting the pictures in. A hundred pictures are put in a run at a time — never all in one go — and
 * each run is filed the moment it lands, so the run can be stopped and carried on later, and the
 * words the admin writes here are used to find a word for every name that the document itself does
 * not hold.
 */
export default function ImageUploader({ words, setWords, onDone, onSay }) {
  const picker = useRef(null);
  const [run, setRun] = useState(null);
  const [busy, setBusy] = useState(false);

  const put = async () => {
    const files = Array.from(picker.current?.files || []);
    if (!files.length || busy) return;
    setBusy(true);
    setRun({ done: 0, all: files.length });
    const batch = stamp();
    const list = parseWords(words);
    let added = 0;
    let skipped = 0;
    let left = 0;

    try {
      for (let at = 0; at < files.length; at += RUN) {
        const slice = files.slice(at, at + RUN);
        const carried = [];

        for (const file of slice) {
          const up = await base44.integrations.Core.UploadPublicFile({ file });
          if (up?.file_url) carried.push({ name: file.name, url: up.file_url });
          setRun((was) => (was ? { ...was, done: was.done + 1 } : was));
        }

        if (carried.length) {
          const res = await base44.functions.invoke("imageMatches", {
            action: "suggest",
            files: carried,
            words: list,
            batch,
          });
          const data = res?.data || {};
          if (data.error) {
            onSay({ error: data.error });
            return;
          }
          added += Number(data.added) || 0;
          skipped += Number(data.skipped) || 0;
          left += Number(data.left) || 0;
        }
      }

      onSay({
        note:
          `${added} ${added === 1 ? "picture" : "pictures"} put in` +
          (left ? `, ${left} still with no word found for them` : "") +
          (skipped ? `, ${skipped} already here` : "") +
          ". Look each one over before you save it.",
      });
      onDone();
    } catch (error) {
      onSay({ error: "The pictures could not all be put in. What arrived is kept — carry on from here." });
      onDone();
    } finally {
      if (picker.current) picker.current.value = "";
      setBusy(false);
      setRun(null);
    }
  };

  return (
    <div className="knowledge-field">
      <span className="knowledge-label">Put your pictures in</span>

      <span className="knowledge-meter-text">
        Choose as many pictures as you like — a hundred and more is fine. Each one is looked at as it
        arrives: a word is looked for in its own file name, first among the words of your document and
        then among any words you write below. Whatever has no word found for it is shown to you, and can
        be named by the AI from the picture itself.
      </span>

      <label className="knowledge-field">
        <span className="knowledge-label">Words to match by (if you want them)</span>
        <textarea
          value={words}
          onChange={(event) => setWords(event.target.value)}
          placeholder={"one word to a line, e.g.\nmtu\nmto\nnyumba"}
          className="account-area"
        />
      </label>

      <div className="knowledge-upload-wrap">
        <input
          ref={picker}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={put}
          aria-label="Choose the pictures to put in"
        />
        <button
          type="button"
          onClick={() => picker.current?.click()}
          disabled={busy}
          className="knowledge-upload"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Images className="h-4 w-4" />}
          {busy ? "Putting them in…" : "Choose pictures"}
        </button>

        {run ? (
          <span className="knowledge-meter-text">
            {run.done} of {run.all} put in — each one is filed as it arrives, so you can stop and carry on.
          </span>
        ) : null}
      </div>
    </div>
  );
}