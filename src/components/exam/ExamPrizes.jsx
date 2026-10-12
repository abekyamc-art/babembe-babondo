import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Award, ChevronRight } from "lucide-react";
import { episodesInSeason, seasonByNo } from "@/lib/examSeasons";
import { completedIn, episodeKey, seasonCleared } from "@/lib/examProgress";
import { prizeCover, trophyOf, waitingCup } from "@/lib/examTrophies";
import { REWARD_SEASONS, rewardOf } from "@/lib/examRewards";
import { claimTrophyCode, loadCopiedSeasons } from "@/lib/trophyCodes";
import { Image } from "@/components/ui/image";
import TrophyCard from "./TrophyCard";
import "@/exam-prizes.css";

/**
 * The prize shelf of the examination: every prize the examination gives is gathered under one single
 * cover of its own — the whole collection of cups drawn together — and opening that cover shows them all
 * as one gallery: a drawn gold trophy for every season, standing lit once that season has been cleared
 * and dark while it is still being earned. Clearing a season is passing all of its episodes, and it is
 * the same act that opens the season after it.
 *
 * Every season carries a reward code of its own, and the code is the same one for every student who
 * clears that season. It is written on the cup the moment the season is cleared, and copied in one tap;
 * a season still to be cleared shows no code of its own.
 */

/** Every season the shelf holds a cup and a code for, in their own order. */
const SEASON_NUMBERS = Array.from({ length: REWARD_SEASONS }, (_, step) => step + 1);

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
  // The seasons whose code has already been taken, read from the account when the gallery is opened.
  // Nothing is written on a cup until the account has answered, so a code that was taken before is
  // never written on the shelf again — not on another opening, and not on another device.
  const [taken, setTaken] = useState(null);
  const won = SEASON_NUMBERS.filter((no) => seasonCleared(progress, no)).length;

  useEffect(() => {
    if (!gallery) return;
    let live = true;
    loadCopiedSeasons().then((list) => {
      if (live) setTaken(list);
    });
    return () => {
      live = false;
    };
  }, [gallery]);

  /** One tap on Copy: the account keeps the mark, and the cup stands marked from this moment on. */
  const copyCode = useCallback(async (no) => {
    await claimTrophyCode(no);
    setTaken((prev) => {
      const held = prev || [];
      return held.includes(no) ? held : [...held, no];
    });
  }, []);

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
              {won} of {REWARD_SEASONS} trophies won
            </span>
          </span>
          <span className="exam-cover-go" aria-hidden="true">
            <ChevronRight />
          </span>
        </button>

        <p className="exam-ep-note">
          Every prize of the examination stands under this one cover — all the cups together. Open it and
          the whole gallery is shown at once: a cup for each season, lit in gold once that season has been
          cleared, with the season's own reward code written on the cup that was won.
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
        <Award className="h-3.5 w-3.5" /> {won} of {REWARD_SEASONS} trophies won
      </span>

      <p className="exam-ep-note">
        Every season carries a gold trophy of its own. Passing all of a season's episodes is what wins it —
        the cup is then lit in gold and keeps its place in the gallery — and it is that same pass which
        opens the season after it. A cup still to be earned stands dark.
        <br />
        Clearing a season also wins its reward code: the code stands on the cup itself and is copied in one
        tap. The same season gives the same code to everyone, and a season still to be cleared writes no
        code at all.
        <br />
        The code is copied once. From that copy on, the cup keeps its place and its code is gone for good —
        it stands marked as copied, on this phone and on every other one the account is opened on.
      </p>

      <div className="exam-shelf-grid">
        {SEASON_NUMBERS.map((no) => {
          const season = seasonByNo(no);
          const cleared = seasonCleared(progress, no);
          const total = season ? episodesInSeason(no) : 0;
          return (
            <TrophyCard
              key={no}
              no={no}
              title={season ? season.title : "Waiting for its season"}
              won={cleared}
              done={season ? completedIn(progress, no) : 0}
              total={total}
              wonAt={season ? wonAt(progress, no, total) : ""}
              url={trophyOf(no) || waitingCup()}
              copied={cleared && !!taken?.includes(no)}
              code={cleared && taken && !taken.includes(no) ? rewardOf(no) : ""}
              onCopy={copyCode}
            />
          );
        })}
      </div>
    </div>
  );
}