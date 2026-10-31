import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Flag } from "lucide-react";
import { useLangMode } from "@/lib/langMode";
import { slideText } from "@/lib/slideText";
import { SLIDE_SIZE, blankAt, canSlide, isSolved, shuffleBoard, slid } from "@/lib/slidePuzzle";
import "@/exam-slide.css";

/**
 * The last question of an episode: the fifteen numbers and the empty space, to be slid back into order.
 *
 * The board belongs to the attempt and not to this screen: every slide is written into the attempt as
 * soon as it is made, so a step to another screen or a refresh of the page brings back the same
 * arrangement at the same move count, and the board is only ever shuffled when a new attempt begins.
 * A tile standing beside the empty space slides; a tile standing anywhere else does nothing. The moment
 * the board stands solved the question is marked — once, with the one point a question of the paper is
 * worth — and the results are opened by the same button every other question ends on.
 */
export default function ExamSlide({
  question,
  mark,
  at,
  total,
  score,
  onChoose,
  onNext,
  isLast,
  onBoard,
}) {
  const lang = useLangMode();
  const words = slideText(lang);

  const held = question.puzzle || {};
  const [board, setBoard] = useState(() => (Array.isArray(held.board) ? held.board : shuffleBoard()));
  const [moves, setMoves] = useState(() => held.moves || 0);
  const solved = isSolved(board);

  // the board is read again only when a different question is on the screen — never on a redraw, so a
  // board being worked on is never pulled back to an older arrangement
  const shown = useRef(question.id);
  useEffect(() => {
    if (shown.current === question.id) return;
    shown.current = question.id;
    setBoard(question.puzzle.board);
    setMoves(question.puzzle.moves || 0);
  }, [question]);

  const move = (tileAt) => {
    // a solved board stands still: the question is answered, and its point is never earned twice
    if (solved || !canSlide(board, tileAt)) return;
    const next = slid(board, tileAt);
    if (!next) return;
    const count = moves + 1;
    setBoard(next);
    setMoves(count);
    onBoard?.(next, count);
    if (isSolved(next) && !mark) onChoose({ got: 1, of: 1 });
  };

  const blank = blankAt(board);
  const tileAt = (place) => ({
    "--col": String(place % SLIDE_SIZE),
    "--row": String(Math.floor(place / SLIDE_SIZE)),
  });

  return (
    <section className="exam-card" aria-labelledby={`exam-q-${at}`}>
      <header className="exam-card-head">
        <p className="exam-qnum" id={`exam-q-${at}`}>
          Question {at + 1} of {total}
        </p>
        <span className="exam-focus">{question.focus}</span>
      </header>

      <h2 className="exam-prompt">{words.title}</h2>
      <p className="exam-hint">{words.how}</p>

      <div className={`slide-board ${solved ? "is-solved" : ""}`} role="group" aria-label={words.title}>
        <div className="slide-well" style={tileAt(blank < 0 ? 0 : blank)} aria-hidden="true" />
        {board.map((value, place) =>
          value === 0 ? null : (
            <button
              key={value}
              type="button"
              className={`slide-tile ${canSlide(board, place) ? "can-move" : ""}`}
              style={tileAt(place)}
              onClick={() => move(place)}
              aria-label={`Tile ${value}`}
              aria-disabled={solved}
            >
              <span className="slide-face">{value}</span>
            </button>
          )
        )}
      </div>

      <p className="slide-moves" aria-live="polite">
        {words.moves}: <strong>{moves}</strong>
      </p>

      {mark ? (
        <div className="exam-feedback is-right" aria-live="polite">
          <p className="exam-verdict is-right">{words.solved}</p>
          <p className="exam-explain">{question.explain} This puzzle is worth one point of the paper.</p>
          <p className="exam-explain">
            Your score: {score} of {total} points.
          </p>
        </div>
      ) : null}

      {mark ? (
        <button type="button" className={`exam-next ${isLast ? "is-go" : ""}`} onClick={onNext}>
          {isLast ? <Flag className="h-4 w-4" /> : null}
          {isLast ? "See Results" : "Next Question"}
          {isLast ? null : <ArrowRight className="h-4 w-4" />}
        </button>
      ) : null}
    </section>
  );
}