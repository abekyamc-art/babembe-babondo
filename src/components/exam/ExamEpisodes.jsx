import React from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { episodesInSeason, episodeSize } from "@/lib/examSeasons";
import { bestOf, episodeCompleted, episodeOpen, nextEpisode, completedIn } from "@/lib/examProgress";

/**
 * One season's hundred episodes, laid out as its own paper: what has been passed with the best mark it
 * was passed at, the one episode standing open, and everything that waits behind it.
 */
export default function ExamEpisodes({ season, progress, onOpen, onBack }) {
  const done = completedIn(progress, season.no);
  const next = nextEpisode(progress, season.no);
  const total = episodesInSeason(season.no);
  const episodes = Array.from({ length: total }, (_, at) => at + 1);

  return (
    <div className="exam-episodes">
      <div className="exam-ep-head">
        <button type="button" className="exam-ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> All seasons
        </button>
        <p className="exam-ep-count">
          {done} of {total} completed
        </p>
      </div>

      <p className="exam-ep-note">
        Season {season.no} · {season.title}. Every episode asks {episodeSize()} questions.
        Finish an episode to unlock the next one, whatever your score. Completed episodes cannot be replayed.
      </p>

      {next ? <button type="button" className="exam-next is-go" onClick={() => onOpen(next)}>
        Take episode {next}
      </button> : <p className="exam-ep-note">Season completed — choose the next season.</p>}

      <div className="exam-ep-grid">
        {episodes.map((no) => {
          const best = bestOf(progress, season.no, no);
          const passed = episodeCompleted(progress, season.no, no);
          const open = episodeOpen(progress, season.no, no);

          return (
            <button
              key={no}
              type="button"
              className={`exam-ep ${passed ? "is-passed" : open ? "is-open" : "is-locked"}`}
              onClick={open ? () => onOpen(no) : undefined}
              disabled={!open}
              aria-label={`Episode ${no}${
                passed ? ` — completed${best ? `, score ${best}%` : ''}` : open ? " — open" : " — locked"
              }`}
            >
              <span className="exam-ep-no">{no}</span>
              <span className="exam-ep-tag">
                {passed ? 'Done' : open ? "Open" : <Lock className="h-3 w-3" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}