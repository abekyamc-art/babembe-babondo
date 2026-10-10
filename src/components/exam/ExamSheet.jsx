import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import "@/exam.css";
import { loadExam, reportOf, saveExam, scoreOf, startExam } from "@/lib/examSession";
import ExamProgress from "./ExamProgress";
import ExamQuestionCard from "./ExamQuestionCard";
import ExamResults from "./ExamResults";

/**
 * GLOIRE AI — the Kibembe medical examination, standing over the call screen without touching the
 * call: one question at a time, three choices, the answer marked the moment it is given, and the
 * whole examination kept while it is being taken.
 */
export default function ExamSheet({ open, onClose }) {
  const [state, setState] = useState(null);
  const began = useRef(false);

  // opening the examination takes up the one already being taken — the answers and the score stand
  // as they were left, on this screen and on this phone — or begins a fresh one
  useEffect(() => {
    if (!open || began.current) return;
    began.current = true;
    setState(loadExam() || startExam());
  }, [open]);

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
      return saveExam({ ...held, marks: { ...held.marks, [held.at]: { chosen: choice, ok } } });
    });
  };

  const goNext = () => {
    setState((held) => (held && held.marks[held.at] ? saveExam({ ...held, at: held.at + 1 }) : held));
  };

  return (
    <div className="exam-shell" role="dialog" aria-modal="true" aria-label="GLOIRE AI Kibembe medical examination">
      <div className="exam-scroll">
        <div className="exam-inner">
          <header className="exam-head">
            <div>
              <p className="exam-title">GLOIRE AI</p>
              <p className="exam-sub">Kibembe Medical Examination</p>
              <p className="exam-system">Kibembe Learning &amp; Examination System</p>
              <p className="exam-credit">Created by Gloire Sadiki Asende.</p>
            </div>
            <button type="button" className="exam-close" onClick={onClose} aria-label="Close the examination">
              <X className="h-4 w-4" />
            </button>
          </header>

          {finished ? (
            <ExamResults report={reportOf(state)} onRestart={() => setState(startExam())} />
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
                <button type="button" className="exam-ghost" onClick={() => setState(startExam())}>
                  Restart examination
                </button>
                <span className="exam-credit">Pass mark 80% · confirmed vocabulary only</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}