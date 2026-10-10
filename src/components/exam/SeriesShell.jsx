import React, { useEffect, useRef, useState } from "react";
import ExamEpisodes from "./ExamEpisodes";
import ExamHeader from "./ExamHeader";
import ExamLeaderboard from "./ExamLeaderboard";
import ExamProgress from "./ExamProgress";
import ExamQuestionCard from "./ExamQuestionCard";
import ExamResults from "./ExamResults";
import ExamSeasons from "./ExamSeasons";
import { reportOf, scoreOf } from "@/lib/examSession";
import { EXAM_SEASONS, episodeSize, episodesInSeason, seasonByNo } from "@/lib/examSeasons";
import { loadStudentProgress, saveStudentProgress } from '@/lib/examProgressSync';
import {
  attemptsOf,
  episodeOpen,
  loadAttempt,
  loadProgress,
  recordFinish,
  saveAttempt,
  startEpisode,
} from "@/lib/examProgress";
import { saveScore } from "@/lib/examLeaderboard";
import { loadExamPool } from "@/lib/examPool";
import "@/exam.css";

const HEAD = {
  title: "GLOIRE AI",
  subtitle: `Learning & Challenges · ${EXAM_SEASONS.length} seasons · 10 questions per episode`,
  system: "Kibembe Learning & Challenge System",
  credit: "Created by Gloire Sadiki Asende.",
  closeLabel: "Close the examination",
};

/**
 * The one examination of the app, taken season by season and episode by episode: the seasons, the
 * hundred episodes of one of them, the paper being taken, the report of a finished one, and the public
 * leaderboard.
 *
 * Completed episodes cannot be replayed, even after a low score. Finishing opens the next episode.
 * Progress is scoped to each student and synced to their account, and scores update the leaderboard.
 */
export default function SeriesShell({ open, onClose }) {
  const [progress, setProgress] = useState({ passed: {}, taken: {}, completed: {} });
  const [attempt, setAttempt] = useState(null);
  const [resume, setResume] = useState(null);
  const [season, setSeason] = useState(1);
  const [view, setView] = useState("seasons");
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState('');
  const [saving, setSaving] = useState(false);
  // the finish of one attempt is written down once, never twice however the screen redraws
  const written = useRef("");

  // Each time the examination is opened: what stands passed on this phone, the episode left
  // half-answered, and the season it belongs to.
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setSyncError('');
    setAttempt(null);
    setResume(null);
    setView('seasons');
    written.current = '';
    // the confirmed words are read before any paper is drawn, so no episode is opened on the written
    // lists while the document's own words are still on their way
    Promise.all([loadExamPool().catch(() => null), loadStudentProgress()]).then(([, held]) => {
      if (!active) return;
      const half = loadAttempt();
      setProgress(held);
      setResume(half);
      setSeason(half?.season || 1);
      setLoading(false);
    }).catch(() => { if (active) setSyncError('Your saved progress could not be loaded. Close and reopen to try again.'); });
    return () => { active = false; };
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
    setResume(null);
    persistFinish(held);
  }, [finished, attempt]);

  const persistFinish = async (held) => {
    setSaving(true);
    setSyncError('');
    try {
      await saveStudentProgress(held);
      await saveScore(held);
    } catch {
      setSyncError('Your result is saved on this device, but account syncing failed. Please retry.');
    } finally { setSaving(false); }
  };

  if (!open) return null;

  const seasonOf =
    (attempt ? seasonByNo(attempt.season) : seasonByNo(season)) || EXAM_SEASONS[0];

  // A pass opens the episode after it, and the hundredth pass of a season opens the season after it —
  // worked out from the paper in hand, so the report never waits on the store to be read back.
  const nextNo = attempt ? attempt.episode + 1 : 0;
  const nextOpen = !!attempt && nextNo <= episodesInSeason(attempt.season);
  const seasonAfter = attempt && !nextOpen && seasonByNo(attempt.season + 1);
  const note = !attempt ? '' : nextOpen
    ? `Episode ${attempt.episode} is completed and cannot be replayed. Episode ${nextNo} is next, whatever your score.`
    : seasonAfter ? `Season ${attempt.season} is complete. Season ${seasonAfter.no} is next.`
    : 'All available seasons are complete. Completed episodes will not be repeated.';

  const openEpisode = (no, seasonNo = season) => {
    if (loading || saving || syncError || !episodeOpen(loadProgress(), seasonNo, no)) return;
    const fresh = startEpisode(seasonNo, no);
    if (!fresh) return;
    written.current = '';
    setSeason(seasonNo);
    setResume(null);
    setAttempt(fresh);
  };

  const openSeason = (no) => {
    setResume(null);
    setSeason(no);
    setView("episodes");
  };

  const resumeEpisode = () => {
    if (!resume || !episodeOpen(loadProgress(), resume.season, resume.episode)) return;
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

          {syncError ? <p className="exam-empty" role="alert">{syncError}</p> : null}
          {saving ? <p className="exam-empty" role="status">Saving your completed episode…</p> : null}
          {syncError && finished ? <button type="button" className="exam-next" disabled={saving} onClick={() => persistFinish(progress)}>Retry saving progress</button> : null}
          {loading ? <p className="exam-empty" role="status">Loading your saved progress…</p> : attempt ? (
            finished ? (
              <ExamResults
                report={report}
                note={note}
                onNext={!saving && !syncError ? nextOpen ? () => openEpisode(nextNo, attempt.season) : seasonAfter ? () => openEpisode(1, seasonAfter.no) : null : null}
                nextLabel={nextOpen ? `Go to episode ${nextNo}` : seasonAfter ? `Start season ${seasonAfter.no}` : ''}
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