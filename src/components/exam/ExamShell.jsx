import React, { useEffect, useRef, useState } from "react";
import { reportOf, scoreOf } from "@/lib/examSession";
import ExamHeader from "./ExamHeader";
import ExamProgress from "./ExamProgress";
import ExamQuestionCard from "./ExamQuestionCard";
import ExamResults from "./ExamResults";

/**
 * The examination as it stands on the screen: the head, the progress, the question and the results.
 *
 * Every examination of this app is taken through this one shell — the medical one and the daily-life
 * one — so both are answered, marked, scored and reviewed the same way. Each hands in its own words
 * and its own store, and neither touches the other's answers.
 */
export default function ExamShell({ open, onClose, exam }) {
  const [state, setState] = useState(null);
  const began = useRef(false);

  // Opening an examination takes up the one already being taken — the answers and the score stand as
  // they were left, on this screen and on this phone — or begins a fresh one
  useEffect(() => {
    if (!open || began.current) return;
    began.current = true;
    setState(exam.load() || exam.start());
  }, [open, exam]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !state) return null;

  const questions = state.questions;
  const at = state.at;
  const answered = Object.keys(state.marks || {}).length;
  const score = scoreOf(state);
  const finished = at >= questions.length;

  /** The answer the student has given: it is written down and the choice is locked. */
  const choose = (choice) => {
    setState((held) => {
      if (!held || held.marks[held.at]) return held;
      const ok = choice === held.questions[held.at].correct;
      return exam.save({ ...held, marks: { ...held.marks, [held.at]: { chosen: choice, ok } } });
    });
  };

  const goNext = () => {
    setState((held) => (held && held.marks[held.at] ? exam.save({ ...held, at: held.at + 1 }) : held));
  };

  return (
    <div className="exam-shell" role="dialog" aria-modal="true" aria-label={exam.ariaLabel}>
      <div className="exam-scroll">
        <div className="exam-inner">
          <ExamHeader
            title={exam.title}
            subtitle={exam.subtitle}
            system={exam.system}
            credit={exam.credit}
            closeLabel={exam.closeLabel}
            onClose={onClose}
          />

          {finished ? (
            <ExamResults report={reportOf(state)} onRestart={() => setState(exam.start())} />
          ) : (
            <>
              <ExamProgress at={at} total={questions.length} answered={answered} score={score} />
              <ExamQuestionCard
                question={questions[at]}
                mark={state.marks[at] || null}
                at={at}
                total={questions.length}
                score={score}
                answered={answered}
                onChoose={choose}
                onNext={goNext}
                isLast={at === questions.length - 1}
              />
              <div className="exam-tools">
                <button type="button" className="exam-ghost" onClick={() => setState(exam.start())}>
                  Restart examination
                </button>
                <span className="exam-credit">{exam.footer}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}