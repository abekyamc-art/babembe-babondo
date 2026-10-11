import React, { useState } from "react";
import { ArrowLeft, Award, ChevronRight } from "lucide-react";
import { EXAM_SEASONS, episodesInSeason } from "@/lib/examSeasons";
import { completedIn, episodeKey, seasonCleared } from "@/lib/examProgress";
import { prizeCover, trophyOf } from "@/lib/examTrophies";
import { Image } from "@/components/ui/image";
import TrophyCard from "./TrophyCard";
import "@/exam-prizes.css";

/**
 * The prize shelf of the examination: every prize the examination gives is gathered under one single
 * cover of its own — the whole collection of cups drawn together — and opening that cover shows them all
 * as one gallery: a drawn gold trophy for every season, standing lit once that season has been cleared
 * and dark while it is still being earned. Clearing a season is passing all of its episodes, and it is
 * the same act that opens the season after it.
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
  const [gallery, setGallery] = useState(false);
  const won = EXAM_SEASONS.filter((season) => seasonCleared(progress, season.no)).length;

  // The one cover stands over every prize: the whole collection waits behind it, and the gallery is one
  // tap away. It is lit as soon as a single cup has been won, and dimmed while none of them has.
  if (!gallery) {
    const lit = won > 0;
    return (
      <div className="exam-shelf">
        <div className="exam-ep-head">
          <button type="button" className="exam-ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> All seasons
          </button>
          <p className="exam-ep-count">Prize shelf</p>
        </div>

        <button
          type="button"
          className={`exam-cover ${lit ? "is-won" : "is-locked"}`}
          onClick={() => setGallery(true)}
          aria-label="All prizes — open the prize gallery"
        >
          <span className="exam-cover-frame">
            {prizeCover() ? (
              <Image
                src={prizeCover()}
                alt="Every prize of the examination"
                className="exam-cover-img"
                fittingType="fill"
              />
            ) : null}
            <span className="exam-cover-seal">
              <Award aria-hidden="true" />
            </span>
          </span>
          <span className="exam-cover-body">
            <span className="exam-cover-name">All prizes</span>
            <span className="exam-cover-title">Every cup in one place</span>
            <span className="exam-cover-tag">
              {won} of {EXAM_SEASONS.length} trophies won
            </span>
          </span>
          <span className="exam-cover-go" aria-hidden="true">
            <ChevronRight />
          </span>
        </button>

        <p className="exam-ep-note">
          Every prize of the examination stands under this one cover — all the cups together. Open it and
          the whole gallery is shown at once: a cup for each season, lit in gold once that season has been
          cleared.
        </p>
      </div>
    );
  }

  return (
    <div className="exam-shelf">
      <div className="exam-ep-head">
        <button type="button" className="exam-ghost" onClick={() => setGallery(false)}>
          <ArrowLeft className="h-4 w-4" /> All prizes
        </button>
        <p className="exam-ep-count">Prize gallery</p>
      </div>

      <span className="exam-shelf-count">
        <Award className="h-3.5 w-3.5" /> {won} of {EXAM_SEASONS.length} trophies won
      </span>

      <p className="exam-ep-note">
        Every season carries a gold trophy of its own. Passing all of a season's episodes is what wins it —
        the cup is then lit in gold and keeps its place in the gallery — and it is that same pass which
        opens the season after it. A cup still to be earned stands dark.
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