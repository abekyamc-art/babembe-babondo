import React from "react";
import { ArrowRight, Flag } from "lucide-react";
import { LETTERS } from "@/lib/examBank";
import ExamFigure from "./ExamFigure";
import ExamOption from "./ExamOption";
import ExamPrompt from "./ExamPrompt";

/** How one choice is drawn once the answer has been given: the right one named, the rest set back. */
function lookOf(at, question, mark) {
  if (!mark) return "";
  if (at === question.correct) return at === mark.chosen ? "right" : "shown";
  if (at === mark.chosen) return "wrong";
  return "dim";
}

/**
 * One question of the examination: the white card, the illustration it is studied on, and the three
 * choices. Nothing of the answer is shown until the student has chosen, and then the choice is
 * locked, marked, explained and counted.
 */
export default function ExamQuestionCard({
  question,
  mark,
  at,
  total,
  score,
  answered,
  onChoose,
  onNext,
  isLast,
}) {
  return (
    <section className="exam-card" aria-labelledby={`exam-q-${at}`}>
      <header className="exam-card-head">
        <p className="exam-qnum" id={`exam-q-${at}`}>
          Question {at + 1} of {total}
        </p>
        <span className="exam-focus">{question.focus}</span>
      </header>

      <h2 className="exam-prompt">
        <ExamPrompt question={question} />
      </h2>
      {question.hint ? <p className="exam-hint">{question.hint}</p> : null}

      {question.image || question.view ? (
        <ExamFigure view={question.view} spot={question.spot} image={question.image} />
      ) : null}

      <div className="exam-options">
        {question.options.map((text, choice) => (
          <ExamOption
            key={`${question.id}:${choice}`}
            letter={LETTERS[choice]}
            choice={choice}
            text={text}
            look={lookOf(choice, question, mark)}
            disabled={!!mark}
            onClick={() => onChoose(choice)}
          />
        ))}
      </div>

      {mark ? (
        <div className={`exam-feedback ${mark.ok ? "is-right" : "is-wrong"}`} aria-live="polite">
          <p className={`exam-verdict ${mark.ok ? "is-right" : "is-wrong"}`}>
            {mark.ok ? "✓ CORRECT!" : "✗ INCORRECT."}
          </p>
          <p className="exam-explain">
            {mark.ok ? (
              question.explain
            ) : (
              <>
                Correct answer: {LETTERS[question.correct]}. {question.options[question.correct]}.{" "}
                {question.explain}
              </>
            )}
          </p>
          <p className="exam-explain">
            Your score: {score}/{answered}
          </p>
        </div>
      ) : (
        <p className="exam-choose">Choose your answer: A, B, or C.</p>
      )}

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