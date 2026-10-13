import React from "react";

/**
 * The two totals a student's place on the leaderboard stands on, read side by side: every episode of the
 * game they have really passed, and every episode of the examination.
 */
export default function BoardTotals({ game = 0, exam = 0 }) {
  return (
    <span className="exam-board-totals">
      <span className="exam-board-total">
        <b>{game}</b> game
      </span>
      <span className="exam-board-total is-exam">
        <b>{exam}</b> exam
      </span>
    </span>
  );
}