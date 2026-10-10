import React from "react";
import { Lock, Trophy } from "lucide-react";
import { EPISODES_PER_SEASON, EXAM_SEASONS } from "@/lib/examSeasons";
import { nextEpisode, passedIn, seasonCleared, seasonOpen } from "@/lib/examProgress";

/**
 * The seasons of the examination: which one is open, how far the student has come inside it, and which
 * waits behind a cleared season.
 *
 * A season holds a hundred episodes. The first stands open, every one after it opens when the episode
 * before it is passed, and the season after it opens only when all hundred of this one are done. The
 * public leaderboard is met in one tap at the head of them.
 */
export default function ExamSeasons({ progress, resume, onOpenSeason, onResume, onBoard }) {
  const cleared = EXAM_SEASONS.filter((season) => seasonCleared(progress, season.no)).length;

  return (
    <div className="exam-seasons">
      <button type="button" className="exam-board-open" onClick={onBoard}>
        <Trophy className="h-4 w-4" /> Public leaderboard — the 100 highest scores
      </button>

      <p className="exam-seasons-note">
        Every season holds {EPISODES_PER_SEASON} episodes, and an episode opens once the one before it has
        been passed — the pass mark is 80%. Clear all {EPISODES_PER_SEASON} episodes of a season and the
        season after it opens. An episode may be taken again as often as you like — no day has a limit.{" "}
        {cleared} of {EXAM_SEASONS.length} seasons cleared.
      </p>

      {resume ? (
        <button type="button" className="exam-next is-go" onClick={onResume}>
          Resume season {resume.season} · episode {resume.episode} — question {resume.at + 1}
        </button>
      ) : null}

      {EXAM_SEASONS.map((season) => {
        const open = seasonOpen(progress, season.no);
        const done = passedIn(progress, season.no);
        const clearedSeason = seasonCleared(progress, season.no);
        const next = nextEpisode(progress, season.no);

        return (
          <button
            key={season.no}
            type="button"
            className={`exam-season ${
              clearedSeason ? "is-passed" : open ? "is-open" : "is-locked"
            }`}
            onClick={open ? () => onOpenSeason(season.no) : undefined}
            disabled={!open}
            aria-label={`Season ${season.no}: ${season.title}${open ? "" : " — locked"}`}
          >
            <span className="exam-season-no">
              {open ? season.no : <Lock className="h-4 w-4" />}
            </span>
            <span className="exam-season-body">
              <span className="exam-season-title">
                Season {season.no} · {season.title}
              </span>
              <span className="exam-season-blurb">
                {season.blurb} · {EPISODES_PER_SEASON} episodes
              </span>
              <span className="exam-season-tag">
                {clearedSeason
                  ? `Cleared · ${done} of ${EPISODES_PER_SEASON} episodes passed`
                  : open
                    ? `${done} of ${EPISODES_PER_SEASON} episodes passed · next is episode ${next}`
                    : `Clear season ${season.no - 1} to join`}
              </span>
            </span>
            <span className="exam-season-mark">{clearedSeason ? "✓" : open ? "Open" : ""}</span>
          </button>
        );
      })}
    </div>
  );
}