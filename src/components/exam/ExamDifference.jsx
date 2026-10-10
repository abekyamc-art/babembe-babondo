import React from "react";
import { ArrowRight, Flag } from "lucide-react";
import DifferencePuzzle from "@/components/diff/DifferencePuzzle";

/**
 * The last question of an episode: the same picture twice, the differences to be found between them.
 * It is answered by tapping, not by choosing, so it keeps the card's own head, prompt and feedback while
 * the two pictures and their badges stand where the choices stand on every other question.
 */
export default function ExamDifference({ question, mark, at, total, score, answered, onChoose, onNext, isLast }) {
  // every difference found is a point of its own, and the nine questions before the puzzle are a point each
  const of = question.puzzle.differences.length;
  const possible = (total - 1) + of;

  return (
    <section className="exam-card" aria-labelledby={`exam-q-${at}`}>
      <header className="exam-card-head">
        <p className="exam-qnum" id={`exam-q-${at}`}>
          Question {at + 1} of {total}
        </p>
        <span className="exam-focus">{question.focus}</span>
      </header>

      <h2 className="exam-prompt">{question.prompt}</h2>
      {question.hint ? <p className="exam-hint">{question.hint}</p> : null}

      <DifferencePuzzle
        puzzle={question.puzzle}
        mark={mark}
        onDone={(got) => onChoose({ got, of })}
      />

      {mark ? (
        <div className={`exam-feedback ${mark.ok ? "is-right" : "is-wrong"}`} aria-live="polite">
          <p className={`exam-verdict ${mark.ok ? "is-right" : "is-wrong"}`}>
            {mark.ok ? "✓ ALL DIFFERENCES FOUND!" : "✗ NOT ALL FOUND."}
          </p>
          <p className="exam-explain">
            You found {mark.got} of {of} differences — {mark.got} {mark.got === 1 ? "point" : "points"}.{" "}
            {question.explain}
          </p>
          <p className="exam-explain">
            Your score: {score} of {possible} points.
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