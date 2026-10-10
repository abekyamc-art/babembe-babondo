import React from "react";
import { Lock } from "lucide-react";
import { attemptsOf, bestOf, levelOpen, levelsPassed } from "@/lib/lifeExamSession";

/**
 * The levels of the daily-life examination: which is open, which has been passed, and which waits behind
 * a pass. A locked level says plainly which level opens it, and the note above says that a level may be
 * taken as often as the student likes.
 */
export default function ExamLevels({ levels, progress, resume, onOpen, onResume }) {
  const done = levelsPassed(progress);

  return (
    <div className="exam-levels">
      <p className="exam-levels-note">
        Pass a level at 80% and the next one opens. Any level may be taken again as often as you like —
        no day has a limit. {done} of {levels.length} passed.
      </p>

      {resume ? (
        <button type="button" className="exam-next is-go" onClick={onResume}>
          Resume level {resume.level} — question {resume.at + 1}
        </button>
      ) : null}

      {levels.map((level) => {
        const open = levelOpen(progress, level.no);
        const passed = !!progress?.passed?.[String(level.no)];
        const tries = attemptsOf(progress, level.no);
        const best = bestOf(progress, level.no);
        const size = level.mix || level.ids.length;

        return (
          <button
            key={level.no}
            type="button"
            className={`exam-level ${passed ? "is-passed" : open ? "is-open" : "is-locked"}`}
            onClick={open ? () => onOpen(level.no) : undefined}
            disabled={!open}
            aria-label={`Level ${level.no}: ${level.title}${open ? "" : " — locked"}`}
          >
            <span className="exam-level-no">
              {open ? level.no : <Lock className="h-4 w-4" />}
            </span>
            <span className="exam-level-body">
              <span className="exam-level-title">
                Level {level.no} · {level.title}
              </span>
              <span className="exam-level-blurb">
                {level.blurb} · {size} questions
              </span>
              <span className="exam-level-tag">
                {passed
                  ? `Passed · best ${best}% · taken ${tries} ${tries === 1 ? "time" : "times"}`
                  : open
                    ? tries
                      ? `Not passed yet · taken ${tries} ${tries === 1 ? "time" : "times"}`
                      : "Not taken yet"
                    : `Pass level ${level.no - 1} to open`}
              </span>
            </span>
            <span className="exam-level-mark">{passed ? "✓" : open ? "Start" : ""}</span>
          </button>
        );
      })}
    </div>
  );
}