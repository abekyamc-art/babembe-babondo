import React from "react";

/**
 * The one total a student's place on the leaderboard stands on: every episode of the game they have
 * really passed and every episode of the examination, added together. Five episodes of the game and
 * five of the examination are read here as ten.
 */
export default function BoardTotals({ game = 0, exam = 0 }) {
  const total = (Number(game) || 0) + (Number(exam) || 0);
  return (
    <span className="exam-board-totals">
      <span className="exam-board-total">
        <b>{total}</b> episodes
      </span>
    </span>
  );
}