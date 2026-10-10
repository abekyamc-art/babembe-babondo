import React from "react";
import { ArrowRight, RotateCcw } from "lucide-react";

// the band a finished examination stands in, written out so the colour is never guessed at
const TONE = { top: "is-top", good: "is-good", mid: "is-mid", low: "is-low" };

/**
 * How the examination ended: the total, the correct and incorrect answers, the percentage and the
 * band it falls in, every question that was answered wrongly with the confirmed answer beside it,
 * the vocabulary to take away, and the way to begin again.
 */
export default function ExamResults({
  report,
  onRestart,
  restartLabel = "Restart Examination",
  onNext,
  nextLabel = "",
  onLevels,
  note = "",
}) {
  return (
    <div className="exam-report">
      <div className="exam-verdict-card">
        <p className="exam-percent">{report.percent}%</p>
        <p className={`exam-band ${TONE[report.grade.tone]}`}>{report.grade.label}</p>
        <p className="exam-outcome">
          {report.passed ? "Passed" : "Not passed"} — the pass mark is 80%.
        </p>
        <p className="exam-outcome">
          You answered {report.right} of {report.total} questions correctly.
        </p>
        {note ? <p className="exam-outcome">{note}</p> : null}
      </div>

      <div className="exam-tally">
        <div className="exam-tile">
          <p className="exam-tile-num">{report.total}</p>
          <p className="exam-tile-label">Questions</p>
        </div>
        <div className="exam-tile">
          <p className="exam-tile-num">{report.right}</p>
          <p className="exam-tile-label">Correct</p>
        </div>
        <div className="exam-tile">
          <p className="exam-tile-num">{report.wrong}</p>
          <p className="exam-tile-label">Incorrect</p>
        </div>
      </div>

      <section className="exam-panel">
        <h3 className="exam-panel-title">Review of incorrect answers</h3>
        {report.missed.length ? (
          report.missed.map((row) => (
            <div className="exam-review-row" key={`review-${row.at}`}>
              <p className="exam-review-q">{row.prompt}</p>
              <p className="exam-review-line is-wrong">Your answer: {row.chosen}</p>
              <p className="exam-review-line is-right">
                Correct answer: {row.letter}. {row.correct}
              </p>
              <p className="exam-review-line">{row.explain}</p>
            </div>
          ))
        ) : (
          <p className="exam-empty">Every question was answered correctly — there is nothing to review.</p>
        )}
      </section>

      <section className="exam-panel">
        <h3 className="exam-panel-title">Vocabulary for revision</h3>
        {report.practice.length ? (
          report.practice.map((pair) => (
            <div className="exam-word" key={`${pair.en}:${pair.kb}`}>
              <span className="exam-word-kb">{pair.kb}</span>
              <span className="exam-word-en">{pair.en}</span>
            </div>
          ))
        ) : (
          <p className="exam-empty">No vocabulary needs further practice from this examination.</p>
        )}
      </section>

      <div className="exam-report-actions">
        {onNext ? (
          <button type="button" className="exam-next is-go" onClick={onNext}>
            {nextLabel} <ArrowRight className="h-4 w-4" />
          </button>
        ) : null}

        {onRestart ? <button
          type="button"
          className={`exam-next ${onNext ? "" : "is-go"}`}
          onClick={onRestart}
        >
          <RotateCcw className="h-4 w-4" /> {restartLabel}
        </button> : null}

        {onLevels ? (
          <button type="button" className="exam-ghost" onClick={onLevels}>
            Choose another episode
          </button>
        ) : null}
      </div>
    </div>
  );
}