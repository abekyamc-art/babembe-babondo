import React from "react";

/**
 * What the check found: the words it put right, and the pictures it left for the admin's own eye.
 *
 * Every picture left over is named with what it actually shows and the word it stands beside now, so
 * the admin can see at a glance which of the two is wrong.
 */
export default function PictureAuditReport({ report }) {
  const changes = report?.changes || [];
  const unsure = report?.unsureRows || [];

  return (
    <>
      <span className="knowledge-meter-text">
        Checked {report.checked} of {report.total}: {report.fixed} put right · {report.right} already
        stood with the right word · {report.unsure} left for your eye.
      </span>

      {report.fixed ? (
        <span className="knowledge-meter-text">
          A picture still waiting for its two looks keeps waiting with the right word written for it; one
          already saved is saved with its new word. Run the check again any time a picture comes out
          wrong.
        </span>
      ) : null}

      {changes.length ? (
        <div className="flex flex-col">
          {changes.map((row, at) => (
            <div key={`${row.name}-${at}`} className="knowledge-row">
              <div className="knowledge-body">
                <span className="knowledge-title">
                  {row.was ? `"${row.was}" → ` : ""}
                  {row.term}
                </span>
                <span className="knowledge-meter-text">
                  {row.name} · shows "{row.saw}" ·{" "}
                  {row.kind === "saved" ? "saved beside the new word" : "waiting for your two looks"}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {unsure.length ? (
        <div className="flex flex-col">
          <span className="knowledge-label">Left for your eye · {unsure.length}</span>
          {unsure.map((row, at) => (
            <div key={`${row.name}-${at}`} className="knowledge-row">
              <div className="knowledge-body">
                <span className="knowledge-title">{row.word || "No word beside it yet"}</span>
                <span className="knowledge-meter-text">
                  {row.name}
                  {row.saw ? ` · shows "${row.saw}"` : ""} · {row.why}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}