import React from "react";

/**
 * The one total a student's place on the leaderboard stands on: every episode of the game they have
 * really passed and every episode of the examination, added together. Five episodes of the game and
 * five of the examination are read here as ten.
 *
 * The total is the one the standing itself was read through, so an older standing — one that carries
 * only the two parts — is shown as the same total it was ranked by, and the row and the place never
 * disagree.
 */
export default function BoardTotals({ total, game = 0, exam = 0 }) {
  const shown =
    total === undefined || total === null
      ? (Number(game) || 0) + (Number(exam) || 0)
      : Number(total) || 0;
  return (
    <span className="exam-board-totals">
      <span className="exam-board-total">
        <b>{shown}</b> episodes
      </span>
    </span>
  );
}