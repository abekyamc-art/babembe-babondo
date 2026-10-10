import React, { useEffect, useRef, useState } from "react";
import ExamHeader from "./ExamHeader";
import ExamLevels from "./ExamLevels";
import ExamProgress from "./ExamProgress";
import ExamQuestionCard from "./ExamQuestionCard";
import ExamResults from "./ExamResults";
import { reportOf, scoreOf } from "@/lib/examSession";
import { LIFE_LEVELS, levelByNo } from "@/lib/lifeExamLevels";
import {
  attemptsOf,
  levelOpen,
  loadAttempt,
  loadProgress,
  recordFinish,
  saveAttempt,
  startLevel,
} from "@/lib/lifeExamSession";

const HEAD = {
  title: "GLOIRE AI",
  subtitle: "Kibembe Daily Life Examination",
  system: "Kibembe Learning & Examination System",
  credit: "Created by Gloire Sadiki Asende.",
  closeLabel: "Close the examination",
};

/**
 * The daily-life examination, level by level: the paper of levels, the level being taken, and the report
 * of a finished one. Passing a level writes the pass down and opens the next; failing it writes only the
 * attempt down, and the same level waits to be taken again — as often as the student likes, with no day's
 * limit.
 */
export default function LifeExamShell({ open, onClose }) {
  const [progress, setProgress] = useState({ passed: {}, taken: {} });
  const [attempt, setAttempt] = useState(null);
  const [resume, setResume] = useState(null);
  // the finish of one attempt is written down once, never twice however the screen redraws
  const written = useRef("");

  // Each time the examination is opened: what is passed on this phone, and the level left half-answered.
  useEffect(() => {
    if (!open) return;
    setProgress(loadProgress());
    setResume(loadAttempt());
    setAttempt(null);
    written.current = "";
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const finished = !!attempt && attempt.at >= attempt.questions.length;
  const report = finished ? reportOf(attempt) : null;

  useEffect(() => {
    if (!finished || written.current === attempt.id) return;
    written.current = attempt.id;
    setProgress(recordFinish(attempt.level, reportOf(attempt)));
  }, [finished, attempt]);

  if (!open) return null;

  const level = attempt ? levelByNo(attempt.level) : null;
  const nextNo =
    attempt && report?.passed && attempt.level < LIFE_LEVELS.length ? attempt.level + 1 : null;
  const canNext = nextNo && levelOpen(progress, nextNo);

  const openLevel = (no) => {
    written.current = "";
    setResume(null);
    setAttempt(startLevel(no));
  };

  const resumeLevel = () => setAttempt(resume);

  // back to the paper of levels: a level left half-answered is kept, so it waits to be taken up again
  const backToLevels = () => {
    if (attempt && attempt.at < attempt.questions.length) saveAttempt(attempt);
    setAttempt(null);
    setResume(loadAttempt());
    setProgress(loadProgress());
  };

  const choose = (choice) => {
    setAttempt((held) => {
      if (!held || held.marks[held.at]) return held;
      const ok = choice === held.questions[held.at].correct;
      return saveAttempt({ ...held, marks: { ...held.marks, [held.at]: { chosen: choice, ok } } });
    });
  };

  const goNext = () => {
    setAttempt((held) =>
      held && held.marks[held.at] ? saveAttempt({ ...held, at: held.at + 1 }) : held
    );
  };

  return (
    <div
      className="exam-shell"
      role="dialog"
      aria-modal="true"
      aria-label="GLOIRE AI Kibembe daily life examination"
    >
      <div className="exam-scroll">
        <div className="exam-inner">
          <ExamHeader {...HEAD} onClose={onClose} />

          {!attempt ? (
            <ExamLevels
              levels={LIFE_LEVELS}
              progress={progress}
              resume={resume}
              onOpen={openLevel}
              onResume={resumeLevel}
            />
          ) : finished ? (
            <ExamResults
              report={report}
              note={
                report.passed
                  ? nextNo
                    ? `Level ${nextNo} is now open.`
                    : "Every level is passed — the whole series is yours."
                  : `The pass mark is 80% — take level ${attempt.level} again as often as you like.`
              }
              onRestart={() => openLevel(attempt.level)}
              restartLabel={`Take level ${attempt.level} again`}
              onNext={canNext ? () => openLevel(nextNo) : null}
              nextLabel={canNext ? `Go to level ${nextNo}` : ""}
              onLevels={backToLevels}
            />
          ) : (
            <>
              <p className="exam-count">
                Level {attempt.level} · {level?.title}
              </p>
              <ExamProgress
                at={attempt.at}
                total={attempt.questions.length}
                answered={Object.keys(attempt.marks || {}).length}
                score={scoreOf(attempt)}
              />
              <ExamQuestionCard
                question={attempt.questions[attempt.at]}
                mark={attempt.marks[attempt.at] || null}
                at={attempt.at}
                total={attempt.questions.length}
                score={scoreOf(attempt)}
                answered={Object.keys(attempt.marks || {}).length}
                onChoose={choose}
                onNext={goNext}
                isLast={attempt.at === attempt.questions.length - 1}
              />
              <div className="exam-tools">
                <button type="button" className="exam-ghost" onClick={backToLevels}>
                  Back to levels
                </button>
                <span className="exam-credit">
                  Attempt {attemptsOf(progress, attempt.level) + 1} · no daily limit
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}