import React from "react";

/**
 * The question as it is read, with the one thing it turns on standing in a pure colour of its own: the
 * word, the number, the phrase or the proverb that has to be answered. The rest of the question keeps
 * the card's own ink, so the key is found at a glance on a small screen.
 */
export default function ExamPrompt({ question }) {
  if (!question?.key) return question?.prompt || "";
  return (
    <>
      {question.lead}
      <span className="exam-key">{question.key}</span>
      {question.tail}
    </>
  );
}