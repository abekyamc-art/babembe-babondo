import React from "react";
import { ArrowRight, Flag } from "lucide-react";
import { LETTERS } from "@/lib/examBank";
import { stopReading } from "@/lib/examVoice";
import ExamDifference from "./ExamDifference";
import ExamSlide from "./ExamSlide";
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
 * The question can be heard before it is answered: the reading is asked for by a tap on the button under
 * the question, and it reads the question and its choices together. The choices stand open the whole
 * time — the reading is a help the student may ask for, never a gate held in front of the paper. Nothing
 * of the answer is shown until a choice has been made, and then the choice is locked, marked, explained
 * and counted.
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
  onBoard,
}) {
  // The last question of every episode is a puzzle: the numbers to be slid back into order. It is
  // answered by moving tiles rather than by choosing, so it has a card of its own, and every slide of it
  // is written back into the attempt by onBoard, so the board outlives the screen.
  if (question.kind === "slide") {
    return (
      <ExamSlide
        question={question}
        mark={mark}
        at={at}
        total={total}
        score={score}
        onChoose={onChoose}
        onNext={onNext}
        isLast={isLast}
        onBoard={(board, moves) => onBoard?.(at, board, moves)}
      />
    );
  }

  // An episode saved before the number puzzle ends on the picture puzzle still stands: the same picture
  // twice, with the differences to be found between them. It is kept so those attempts finish as they
  // were drawn.
  if (question.kind === "difference") {
    return (
      <ExamDifference
        question={question}
        mark={mark}
        at={at}
        total={total}
        score={score}
        answered={answered}
        onChoose={onChoose}
        onNext={onNext}
        isLast={isLast}
      />
    );
  }

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

      <ExamRead text={question.prompt} options={question.options} kibembe={question.kb || ""} />

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