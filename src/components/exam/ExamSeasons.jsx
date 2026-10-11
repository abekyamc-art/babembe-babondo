import React from "react";
import { Award, Lock, Trophy } from "lucide-react";
import { EXAM_SEASONS, episodesInSeason } from "@/lib/examSeasons";
import { nextEpisode, completedIn, seasonCleared, seasonOpen } from "@/lib/examProgress";

/**
 * The seasons of the examination: which one is open, how far the student has come inside it, and which
 * waits behind a cleared season.
 *
 * A season holds a hundred episodes. The first stands open, every one after it opens when the episode
 * before it is passed, and the season after it opens only when all hundred of this one are done. The
 * public leaderboard is met in one tap at the head of them.
 */
export default function ExamSeasons({ progress, resume, onOpenSeason, onResume, onBoard, onPrizes }) {
  const cleared = EXAM_SEASONS.filter((season) => seasonCleared(progress, season.no)).length;

  return (
    <div className="exam-seasons">
      <button type="button" className="exam-board-open" onClick={onBoard}>
        <Trophy className="h-4 w-4" /> Public leaderboard — the 100 highest scores
      </button>

      <button type="button" className="exam-shelf-open" onClick={onPrizes}>
        <Award className="h-4 w-4" /> Prize shelf — a gold trophy for every season you clear
      </button>

      <p className="exam-seasons-note">
        Pass an episode — more than 80% of its points — to open the one after it. An episode that falls
        short stays open to be taken again, as often as you need. A passed episode stays closed and is
        never given to you again, and passing all hundred of a season is what opens the season after it.
        There is no daily limit.{" "}
        {cleared} of {EXAM_SEASONS.length} seasons cleared.
      </p>

      {resume ? (
        <button type="button" className="exam-next is-go" onClick={onResume}>
          Resume season {resume.season} · episode {resume.episode} — question {resume.at + 1}
        </button>
      ) : null}

      {EXAM_SEASONS.map((season) => {
        const open = seasonOpen(progress, season.no);
        const done = completedIn(progress, season.no);
        const total = episodesInSeason(season.no);
        const clearedSeason = seasonCleared(progress, season.no);
        const next = nextEpisode(progress, season.no);
        // the season that really stands before this one, since a season may go by a number past the ones
        // that are there
        const before = EXAM_SEASONS.filter((held) => held.no < season.no).pop();

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
                {season.blurb} · {total} episodes
              </span>
              <span className="exam-season-tag">
                {clearedSeason
                  ? `Completed · ${done} of ${total} episodes`
                  : open
                    ? `${done} of ${total} episodes completed · next is episode ${next}`
                    : `Clear season ${before ? before.no : 1} to join`}
              </span>
            </span>
            <span className="exam-season-mark">{clearedSeason ? "✓" : open ? "Open" : ""}</span>
          </button>
        );
      })}
    </div>
  );
}