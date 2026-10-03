import React from "react";

/** His side of the conversation while a written answer is being written. */
export default function TypingDots() {
  return (
    <span className="typing-dots" role="status" aria-label="Writing">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </span>
  );
}