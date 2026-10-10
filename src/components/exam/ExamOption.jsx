import React from "react";

// the five ways one answer choice is drawn, written out so the styles are never guessed at
const LOOK = { right: "is-right", wrong: "is-wrong", shown: "is-shown", dim: "is-dim" };
const MARK = { right: "✓", wrong: "✗" };

/**
 * One answer choice: the letter it goes by, what it says, and — once the answer has been given —
 * the mark of it, green where it stands right and red where it was the one chosen wrongly.
 */
export default function ExamOption({ letter, text, look = "", disabled, onClick }) {
  return (
    <button
      type="button"
      className={`exam-option ${LOOK[look] || ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={`Choose answer ${letter}: ${text}`}
    >
      <span className="exam-letter">{letter}</span>
      <span className="exam-option-text">{text}</span>
      {MARK[look] ? (
        <span className="exam-mark" aria-hidden>
          {MARK[look]}
        </span>
      ) : null}
    </button>
  );
}