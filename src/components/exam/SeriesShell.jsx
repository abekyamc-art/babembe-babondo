import React, { useEffect, useRef, useState } from "react";
import ExamEpisodes from "./ExamEpisodes";
import ExamHeader from "./ExamHeader";
import ExamLeaderboard from "./ExamLeaderboard";
import ExamProgress from "./ExamProgress";
import ExamQuestionCard from "./ExamQuestionCard";
import ExamResults from "./ExamResults";
import ExamSeasons from "./ExamSeasons";
import { reportOf, scoreOf } from "@/lib/examSession";
import { EPISODES_PER_SEASON, EXAM_SEASONS, episodeSize, seasonByNo } from "@/lib/examSeasons";
import {
  attemptsOf,
  loadAttempt,
  loadProgress,
  recordFinish,
  saveAttempt,
  startEpisode,
} from "@/lib/examProgress";
import { saveScore } from "@/lib/examLeaderboard";
import "@/exam.css";

const HEAD = {
  title: "GLOIRE AI",
  subtitle: `Kibembe Examination · ${EXAM_SEASONS.length} seasons · ${EPISODES_PER_SEASON} episodes each`,
  system: "Kibembe Learning & Examination System",
  credit: "Created by Gloire Sadiki Asende.",
  closeLabel: "Close the examination",
};

/**
 * The one examination of the app, taken season by season and episode by episode: the seasons, the
 * hundred episodes of one of them, the paper being taken, the report of a finished one, and the public
 * leaderboard.
 *
 * Every episode asks from the confirmed everyday words and the confirmed body and health terms, and
 * grows a little longer as its season goes on. Passing an episode at 80% writes the pass down and opens
 * the one after it; clearing all hundred of a season opens the season after it, and a season opens only
 * once the one before it has been cleared. Failing writes only the attempt down, and the same episode
 * waits to be taken again — as often as the student likes, with no day's limit. Every finished episode
 * writes the student's own standing onto the public leaderboard.
 */
export default function SeriesShell({ open, onClose }) {
  const [progress, setProgress] = useState({ passed: {}, taken: {} });
  const [attempt, setAttempt] = useState(null);
  const [resume, setResume] = useState(null);
  const [season, setSeason] = useState(1);
  const [view, setView] = useState("seasons");
  // the finish of one attempt is written down once, never twice however the screen redraws
  const written = useRef("");

  // Each time the examination is opened: what stands passed on this phone, the episode left
  // half-answered, and the season it belongs to.
  useEffect(() => {
    if (!open) return;
    const held = loadProgress();
    const half = loadAttempt();
    setProgress(held);
    setResume(half);
    setAttempt(null);
    setSeason(half?.season || 1);
    setView("seasons");
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
    const held = recordFinish(attempt.season, attempt.episode, reportOf(attempt));
    setProgress(held);
    // the student's own standing is written onto the public leaderboard from here; a score that cannot
    // be written down changes nothing, and the examination carries on
    saveScore(held);
  }, [finished, attempt]);

  if (!open) return null;

  const seasonOf =
    (attempt ? seasonByNo(attempt.season) : seasonByNo(season)) || EXAM_SEASONS[0];

  // A pass opens the episode after it, and the hundredth pass of a season opens the season after it —
  // worked out from the paper in hand, so the report never waits on the store to be read back.
  const passed = !!report?.passed;
  const nextNo = attempt ? attempt.episode + 1 : 0;
  const nextOpen = passed && !!attempt && nextNo <= EPISODES_PER_SEASON;
  const seasonCleared = passed && !!attempt && attempt.episode >= EPISODES_PER_SEASON;
  const seasonAfter = seasonCleared && seasonByNo(attempt.season + 1);

  const note = !attempt
    ? ""
    : !passed
      ? `The pass mark is 80% — take season ${attempt.season} episode ${attempt.episode} again as often as you like.`
      : nextOpen
        ? `Season ${attempt.season} episode ${nextNo} is now open.`
        : seasonAfter
          ? `Season ${attempt.season} is cleared — season ${attempt.season + 1} is now open.`
          : "Every season is cleared — the whole examination is yours.";

  const openEpisode = (no) => {
    written.current = "";
    setResume(null);
    setAttempt(startEpisode(season, no));
  };

  const openSeason = (no) => {
    setResume(null);
    setSeason(no);
    setView("episodes");
  };

  const resumeEpisode = () => {
    setSeason(resume.season);
    setAttempt(resume);
  };

  // back to the season's own paper of episodes: an episode left half-answered is kept, so it waits to be
  // taken up again where it was left
  const backToEpisodes = () => {
    if (attempt && attempt.at < attempt.questions.length) saveAttempt(attempt);
    const at = attempt ? attempt.season : season;
    setAttempt(null);
    setResume(loadAttempt());
    setProgress(loadProgress());
    setSeason(at);
    setView("episodes");
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
      aria-label="GLOIRE AI Kibembe examination seasons"
    >
      <div className="exam-scroll">
        <div className="exam-inner">
          <ExamHeader {...HEAD} onClose={onClose} />

          {attempt ? (
            finished ? (
              <ExamResults
                report={report}
                note={note}
                onRestart={() => openEpisode(attempt.episode)}
                restartLabel={`Take episode ${attempt.episode} again`}
                onNext={nextOpen ? () => openEpisode(nextNo) : null}
                nextLabel={nextOpen ? `Go to episode ${nextNo}` : ""}
                onLevels={backToEpisodes}
              />
            ) : (
              <>
                <p className="exam-count">
                  Season {attempt.season} · Episode {attempt.episode} · {seasonOf.title}
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
                  <button type="button" className="exam-ghost" onClick={backToEpisodes}>
                    Back to episodes
                  </button>
                  <span className="exam-credit">
                    {episodeSize(seasonOf, attempt.episode)} questions · attempt{" "}
                    {attemptsOf(progress, attempt.season, attempt.episode) + 1} · no daily limit
                  </span>
                </div>
              </>
            )
          ) : view === "board" ? (
            <ExamLeaderboard onBack={() => setView("seasons")} />
          ) : view === "episodes" ? (
            <ExamEpisodes
              season={seasonOf}
              progress={progress}
              onOpen={openEpisode}
              onBack={() => setView("seasons")}
            />
          ) : (
            <ExamSeasons
              progress={progress}
              resume={resume}
              onOpenSeason={openSeason}
              onResume={resumeEpisode}
              onBoard={() => setView("board")}
            />
          )}
        </div>
      </div>
    </div>
  );
}