import React from "react";
import { Award, Lock, Trophy } from "lucide-react";
import { Image } from "@/components/ui/image";
import { EXAM_SEASONS, episodesInSeason, seasonShown } from "@/lib/examSeasons";
import { useExamAdmin } from "@/lib/examAccess";
import { examCoverOf } from "@/lib/examSeasonCovers";
import { nextEpisode, completedIn, seasonBefore, seasonCleared, seasonOpen } from "@/lib/examProgress";

/**
 * The seasons of the examination: which one is open, how far the student has come inside it, and which
 * waits behind a cleared season.
 *
 * A season holds a hundred episodes. The first stands open, every one after it opens when the episode
 * before it is passed, and the season after it opens only when all hundred of this one are done. The
 * public leaderboard is met in one tap at the head of them.
 */
export default function ExamSeasons({ progress, resume, onOpenSeason, onResume, onBoard, onPrizes }) {
  // the seasons this person is met with: a student meets the examination up to the last season it is being
  // taken in, and an admin meets the whole of it
  const admin = useExamAdmin();
  const shown = EXAM_SEASONS.filter((season) => seasonShown(season.no, admin));
  // a season still waiting for its own list of words cannot be cleared, so it is not counted among the
  // seasons a student is working through
  const playable = shown.filter((season) => !season.waiting);
  const cleared = playable.filter((season) => seasonCleared(progress, season.no)).length;

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
        {cleared} of {playable.length} seasons cleared.
      </p>

      {resume && seasonShown(resume.season, admin) ? (
        <button type="button" className="exam-next is-go" onClick={onResume}>
          Resume season {resume.season} · episode {resume.episode} — question {resume.at + 1}
        </button>
      ) : null}

      {shown.map((season) => {
        const open = seasonOpen(progress, season.no);
        const done = completedIn(progress, season.no);
        const total = episodesInSeason(season.no);
        const clearedSeason = seasonCleared(progress, season.no);
        const next = nextEpisode(progress, season.no);
        // the season that really stands before this one, since a season may go by a number past the ones
        // that are there
        const before = seasonBefore(season.no);
        // the season's own 4K cover, where one has been drawn for it
        const cover = examCoverOf(season.no);

        return (
          <button
            key={season.no}
            type="button"
            className={`exam-season ${
              clearedSeason ? "is-passed" : open ? "is-open" : "is-locked"
            }`}
            onClick={open ? () => onOpenSeason(season.no) : undefined}
            disabled={!open}
            aria-label={`Season ${season.no}: ${season.title}${
              open ? "" : season.waiting ? " — waiting for its own words" : " — locked"
            }`}
          >
            {cover ? (
              <span className="exam-season-art">
                <Image
                  src={cover}
                  alt=""
                  className="exam-season-img"
                  draggable={false}
                  quality={95}
                  fittingType="fill"
                />
              </span>
            ) : null}

            <span className="exam-season-row">
              <span className="exam-season-no">
                {open ? season.no : <Lock className="h-4 w-4" />}
              </span>
              <span className="exam-season-body">
                <span className="exam-season-title">
                  Season {season.no} · {season.title}
                </span>
                <span className="exam-season-blurb">
                  {season.blurb}
                  {season.waiting ? "" : ` · ${total} episodes`}
                </span>
                <span className="exam-season-tag">
                  {season.waiting
                    ? "Waiting for its own list of words"
                    : clearedSeason
                      ? `Completed · ${done} of ${total} episodes`
                      : open
                        ? `${done} of ${total} episodes completed · next is episode ${next}`
                        : `Clear season ${before ? before.no : 1} to join`}
                </span>
              </span>
              <span className="exam-season-mark">{clearedSeason ? "✓" : open ? "Open" : ""}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}