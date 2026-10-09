import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ScanSearch } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PictureAuditReport from "@/components/knowledge/PictureAuditReport";

/**
 * The check over every picture: each one is read to see what it really shows, and the word it stands
 * beside is put right to the word of the document that says the same thing.
 *
 * The whole lot is too many to read in one go, so it goes a run at a time and counts as it goes. A run
 * that stops part way is carried on from where it stopped rather than started again.
 */
const BATCH = 6;

export default function PictureAudit({ onDone }) {
  const [count, setCount] = useState(null);
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  // where the check stopped, and what it has found so far: both kept, so a second press carries on
  const at = useRef(0);
  const seen = useRef(null);

  const open = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("pictureAudit", { action: "count" });
      const data = res?.data || {};
      setCount(data.error ? 0 : Number(data.total) || 0);
    } catch (error) {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    open();
  }, [open]);

  const start = async () => {
    setBusy(true);
    setError("");
    setReport(null);
    if (!seen.current) {
      seen.current = { checked: 0, total: 0, fixed: 0, right: 0, unsure: 0, changes: [], unsureRows: [] };
    }
    const all = seen.current;

    try {
      for (;;) {
        const res = await base44.functions.invoke("pictureAudit", {
          action: "audit",
          offset: at.current,
          batch: BATCH,
        });
        const data = res?.data || {};
        if (data.error) {
          setError(data.error);
          break;
        }
        all.total = Number(data.total) || all.total;
        all.checked += Number(data.checked) || 0;
        all.fixed += Number(data.fixed) || 0;
        all.right += Number(data.right) || 0;
        all.unsure += Number(data.unsure) || 0;
        all.changes.push(...(data.changes || []));
        all.unsureRows.push(...(data.unsureRows || []));
        at.current = Number(data.next) || at.current + (Number(data.checked) || 0);
        setRun({ ...all });
        if (data.done || !data.checked) break;
      }

      if (at.current >= all.total && all.total) {
        seen.current = null;
        at.current = 0;
      }
      setReport({ ...all });
    } catch (error) {
      setError("The check stopped part way. Press Carry on and it goes on from where it stopped.");
    } finally {
      setBusy(false);
      onDone?.();
    }
  };

  const carried = at.current > 0;

  return (
    <div className="knowledge-field">
      <span className="knowledge-label">Every picture checked against your document</span>
      <span className="knowledge-meter-text">
        Each picture is read by the AI to see what it really shows, and the word beside it is put right to
        the word of your own document that says the same thing — a house written as cow is written as the
        word for house. Nothing is invented: a word is written only when your document really holds it. A
        picture showing something your document has no word for, or one the AI cannot make out, is left
        exactly as it is and named for your own eye. A picture waiting for its two looks still waits; one
        already saved is written over, never filed twice.
      </span>

      <button type="button" onClick={start} disabled={busy || count === null} className="account-save">
        {busy ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {run ? `Checked ${run.checked} of ${run.total}…` : "Reading your pictures…"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <ScanSearch className="h-4 w-4" />
            {carried ? "Carry on checking" : count === null ? "Opening your pictures…" : `Check all ${count} pictures`}
          </span>
        )}
      </button>

      {!report && run ? (
        <span className="knowledge-meter-text">
          {run.checked} of {run.total} checked · {run.fixed} put right · {run.right} already right ·{" "}
          {run.unsure} for your eye
        </span>
      ) : null}

      {report ? <PictureAuditReport report={report} /> : null}
      {error ? <p className="knowledge-error">{error}</p> : null}
    </div>
  );
}