import React from "react";

// the five ways one answer choice is drawn, written out so the styles are never guessed at
const LOOK = { right: "is-right", wrong: "is-wrong", shown: "is-shown", dim: "is-dim" };
const MARK = { right: "✓", wrong: "✗" };

/**
 * One answer choice: the letter it goes by, what it says, and — once the answer has been given — the mark
 * of it, green where it stands right and red where it was the one chosen wrongly.
 *
 * Each choice carries a pure colour of its own by the place it stands in, so the three choices are told
 * apart at a glance before any of them is read.
 */
export default function ExamOption({ letter, text, look = "", choice, disabled, onClick }) {
  return (
    <button
      type="button"
      className={`exam-option ${LOOK[look] || ""}`}
      data-choice={choice}
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