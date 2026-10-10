import React from "react";

/**
 * Where the student stands: which question is on screen, the score as it stands, and the bar that
 * fills as the questions are answered.
 */
export default function ExamProgress({ at, total, answered, score }) {
  const percent = total ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="exam-meter">
      <div className="exam-meter-top">
        <span className="exam-count">
          Question {Math.min(at + 1, total)} of {total}
        </span>
        <span className="exam-score">
          Score {score}/{answered}
        </span>
      </div>
      <div
        className="exam-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={answered}
        aria-label={`${answered} of ${total} questions answered`}
      >
        <div className="exam-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}