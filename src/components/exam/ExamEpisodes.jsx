import React from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { EPISODES_PER_SEASON, episodeSize } from "@/lib/examSeasons";
import { bestOf, episodeOpen, nextEpisode, passedIn } from "@/lib/examProgress";

/**
 * One season's hundred episodes, laid out as its own paper: what has been passed with the best mark it
 * was passed at, the one episode standing open, and everything that waits behind it.
 */
export default function ExamEpisodes({ season, progress, onOpen, onBack }) {
  const done = passedIn(progress, season.no);
  const next = nextEpisode(progress, season.no);
  const episodes = Array.from({ length: EPISODES_PER_SEASON }, (_, at) => at + 1);
  const shortest = episodeSize(season, 1);
  const longest = episodeSize(season, EPISODES_PER_SEASON);

  return (
    <div className="exam-episodes">
      <div className="exam-ep-head">
        <button type="button" className="exam-ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> All seasons
        </button>
        <p className="exam-ep-count">
          {done} of {EPISODES_PER_SEASON} passed
        </p>
      </div>

      <p className="exam-ep-note">
        Season {season.no} · {season.title}. Each episode asks {shortest} to {longest} questions drawn
        from the confirmed words, and grows a little longer as the season goes on. Pass an episode at 80%
        and the one after it opens; clear all {EPISODES_PER_SEASON} and the next season opens.
      </p>

      <button type="button" className="exam-next is-go" onClick={() => onOpen(next)}>
        Take episode {next}
      </button>

      <div className="exam-ep-grid">
        {episodes.map((no) => {
          const best = bestOf(progress, season.no, no);
          const passed = best > 0;
          const open = episodeOpen(progress, season.no, no);

          return (
            <button
              key={no}
              type="button"
              className={`exam-ep ${passed ? "is-passed" : open ? "is-open" : "is-locked"}`}
              onClick={open ? () => onOpen(no) : undefined}
              disabled={!open}
              aria-label={`Episode ${no}${
                passed ? ` — passed, best ${best}%` : open ? " — open" : " — locked"
              }`}
            >
              <span className="exam-ep-no">{no}</span>
              <span className="exam-ep-tag">
                {passed ? `${best}%` : open ? "Open" : <Lock className="h-3 w-3" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}