import React, { useState } from "react";
import { ChevronRight, Eraser } from "lucide-react";
import { base44 } from "@/api/base44Client";

/**
 * The saved word list, cleaned: the server reads every entry, and this states what it found
 * before anything is deleted. What stands is exactly the list both AIs draw on.
 */
export default function CleanWords({ onDone }) {
  const [stage, setStage] = useState("idle");
  const [counts, setCounts] = useState(null);
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");

  const ask = async () => {
    if (stage === "running") return;
    setStage("running");
    setError("");
    try {
      const res = await base44.functions.invoke("knowledgeWords", { action: "count" });
      const data = res?.data || {};
      if (typeof data.saved !== "number") throw new Error(data.error || "count");
      setCounts(data);
      setStage("confirm");
    } catch (err) {
      setError("The saved list could not be read. Try again.");
      setStage("idle");
    }
  };

  const run = async () => {
    setStage("running");
    setError("");
    try {
      const res = await base44.functions.invoke("knowledgeWords", { action: "clean" });
      const data = res?.data || {};
      if (typeof data.kept !== "number") throw new Error(data.error || "clean");
      setDone(data);
      setCounts(null);
      setStage("done");
      onDone?.();
    } catch (err) {
      setError("The list could not be cleaned. Try again.");
      setStage("confirm");
    }
  };

  return (
    <div className="account-actions">
      <button
        type="button"
        className="account-action account-action-neutral"
        onClick={ask}
        disabled={stage === "running"}
      >
        <span className="account-action-label">
          <Eraser className="h-4 w-4" />
          Clean the list
        </span>
        <ChevronRight className="account-chevron" />
      </button>

      {stage === "running" ? (
        <p className="knowledge-empty">Reading the saved list…</p>
      ) : null}

      {stage === "confirm" && counts ? (
        <div className="knowledge-form">
          <span className="knowledge-label">Clean the saved words?</span>
          <p className="knowledge-text">
            {counts.saved.toLocaleString()} entries saved · {counts.kept.toLocaleString()} are real
            words with a short meaning · {counts.removed.toLocaleString()} will go
            {counts.duplicates
              ? `, ${counts.duplicates.toLocaleString()} of them the same word written twice`
              : ""}
            .
            {counts.removed
              ? ` Both AIs will draw on exactly those ${counts.kept.toLocaleString()}.`
              : " Nothing is deleted."}
          </p>
          <div className="knowledge-form-actions">
            {counts.removed ? (
              <button
                type="button"
                onClick={run}
                className="account-save knowledge-clean-confirm"
              >
                Delete {counts.removed.toLocaleString()}
              </button>
            ) : null}
            <button type="button" onClick={() => setStage("idle")} className="knowledge-cancel">
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {stage === "done" && done ? (
        <p className="knowledge-text">
          {done.kept.toLocaleString()} words kept · {done.removed.toLocaleString()} removed. Both
          AIs now draw on exactly those {done.kept.toLocaleString()}.
        </p>
      ) : null}

      {error ? <p className="knowledge-error">{error}</p> : null}
    </div>
  );
}