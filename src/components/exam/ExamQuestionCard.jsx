import React, { useEffect, useState } from "react";
import { ArrowRight, Flag } from "lucide-react";
import { LETTERS } from "@/lib/examBank";
import { stopReading } from "@/lib/examVoice";
import ExamFigure from "./ExamFigure";
import ExamOption from "./ExamOption";
import ExamPrompt from "./ExamPrompt";
import ExamRead from "./ExamRead";

/** How one choice is drawn once the answer has been given: the right one named, the rest set back. */
function lookOf(at, question, mark) {
  if (!mark) return "";
  if (at === question.correct) return at === mark.chosen ? "right" : "shown";
  if (at === mark.chosen) return "wrong";
  return "dim";
}

/**
 * One question of the examination: the white card, the illustration it is studied on, and the three
 * choices.
 *
 * The question is read out to the student before anything is asked of them: the choices stay closed
 * until the reading has ended and the voice has been hung up, and then they open and wait for the
 * answer. Nothing of the answer is shown until a choice has been made, and then the choice is locked,
 * marked, explained and counted.
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
  // whether this question's own reading has ended and the voice has been hung up
  const [heard, setHeard] = useState(false);

  // every question turns its own reading on, and the one before it is hung up as it goes
  useEffect(() => {
    setHeard(false);
  }, [question.id]);

  const open = heard || !!mark;

  // the voice is hung up the moment the student answers, so nothing speaks over the paper
  const choose = (choice) => {
    stopReading();
    onChoose(choice);
  };

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

      <ExamRead text={question.prompt} onDone={() => setHeard(true)} />

      {question.image || question.view ? (
        <ExamFigure view={question.view} spot={question.spot} image={question.image} />
      ) : null}

      <div className={`exam-options ${open || mark ? "" : "is-shut"}`}>
        {question.options.map((text, choice) => (
          <ExamOption
            key={`${question.id}:${choice}`}
            letter={LETTERS[choice]}
            choice={choice}
            text={text}
            look={lookOf(choice, question, mark)}
            disabled={!!mark || !open}
            onClick={() => choose(choice)}
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
        <p className="exam-choose">
          {open
            ? "Choose your answer: A, B, or C."
            : "Listen to the question — the choices open when the reading ends."}
        </p>
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