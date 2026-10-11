import React from "react";
import { ArrowLeft, Award } from "lucide-react";
import { EXAM_SEASONS, episodesInSeason } from "@/lib/examSeasons";
import { completedIn, episodeKey, seasonCleared } from "@/lib/examProgress";
import { trophyOf } from "@/lib/examTrophies";
import TrophyCard from "./TrophyCard";
import "@/exam-prizes.css";

/**
 * The prize shelf of the examination: one drawn gold trophy for every season, standing lit once that
 * season has been cleared and dark while it is still being earned. Clearing a season is passing all of
 * its episodes, and it is the same act that opens the season after it.
 */

/** When a season was won: the time the last of its episodes was passed. */
function wonAt(progress, season, total) {
  let last = "";
  for (let no = 1; no <= total; no += 1) {
    const at = progress?.passed?.[episodeKey(season, no)]?.at;
    if (at && at > last) last = at;
  }
  return last ? new Date(last).toLocaleDateString() : "";
}

export default function ExamPrizes({ progress, onBack }) {
  const won = EXAM_SEASONS.filter((season) => seasonCleared(progress, season.no)).length;

  return (
    <div className="exam-shelf">
      <div className="exam-ep-head">
        <button type="button" className="exam-ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> All seasons
        </button>
        <p className="exam-ep-count">Prize shelf</p>
      </div>

      <span className="exam-shelf-count">
        <Award className="h-3.5 w-3.5" /> {won} of {EXAM_SEASONS.length} trophies won
      </span>

      <p className="exam-ep-note">
        Every season carries a gold trophy of its own. Passing all of a season's episodes is what wins it —
        the cup is then lit in gold and keeps its place on this shelf — and it is that same pass which opens
        the season after it. A cup still to be earned stands dark.
      </p>

      <div className="exam-shelf-grid">
        {EXAM_SEASONS.map((season) => {
          const total = episodesInSeason(season.no);
          return (
            <TrophyCard
              key={season.no}
              no={season.no}
              title={season.title}
              won={seasonCleared(progress, season.no)}
              done={completedIn(progress, season.no)}
              total={total}
              wonAt={wonAt(progress, season.no, total)}
              url={trophyOf(season.no)}
            />
          );
        })}
      </div>
    </div>
  );
}