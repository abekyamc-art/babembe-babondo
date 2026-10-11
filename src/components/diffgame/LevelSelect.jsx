import React, { useState } from "react";
import { ChevronLeft, Star, Trophy, Volume2, VolumeX, Vibrate, Hourglass } from "lucide-react";
import LevelCard from "./LevelCard";
import SeasonsCover from "./SeasonsCover";
import { LEVEL_SLOTS, SEASONS, episodesIn } from "@/lib/differenceGame/levels";
import { levelRecord, levelsPassed, starsEarned, unlocked } from "@/lib/differenceGame/store";

/**
 * The game's own menu: the four seasons the game is planned in, the stars and the score earned, and the
 * three switches the player sets — an episode without a clock, the sound, and the phone's own shake.
 *
 * The menu opens on the four season covers. A season stands open when its own episodes stand and the
 * episode before them has been passed, so a season is opened by finishing the one before it; a season
 * whose episodes are still being drawn keeps its cover, locked. Opening a cover shows that season's
 * episodes alone, each with its own lock, its stars and its score.
 */
export default function LevelSelect({ state, onPrefs, onOpen, onExit }) {
  const passed = levelsPassed(state);
  const [season, setSeason] = useState(null);

  // every season with its own episodes, how far the player has come in it, and whether it can be opened
  const seasons = SEASONS.map((held) => {
    const episodes = episodesIn(held.no);
    return {
      no: held.no,
      episodes,
      passed: episodes.filter((level) => levelRecord(state, level.id).completed).length,
      open: episodes.length > 0 && unlocked(state, held.at),
    };
  });
  const shown = seasons.find((held) => held.no === season) || null;

  return (
    <div className="dg-shell">
      <header className="dg-head">
        <button type="button" className="dg-icon" onClick={onExit} aria-label="Back to the app">
          <ChevronLeft aria-hidden="true" />
        </button>
        <div className="dg-head-text">
          <h1 className="dg-title">Find the Differences</h1>
          <p className="dg-sub">GLOIRE AI · Created by CEO Gloire Sadiki Asende</p>
        </div>
      </header>

      <div className="dg-tally">
        <span className="dg-stat">
          <Trophy aria-hidden="true" />
          <span>{passed}</span>
          <em>episodes passed</em>
        </span>
        <span className="dg-stat">
          <Star aria-hidden="true" />
          <span>{starsEarned(state)}</span>
          <em>of {LEVEL_SLOTS * 3} stars</em>
        </span>
      </div>

      <div className="dg-switches">
        <button
          type="button"
          className={"dg-switch" + (state.relaxed ? " is-on" : "")}
          aria-pressed={state.relaxed}
          onClick={() => onPrefs({ relaxed: !state.relaxed })}
        >
          <Hourglass aria-hidden="true" />
          Relaxed mode
        </button>
        <button
          type="button"
          className={"dg-switch" + (state.sound ? " is-on" : "")}
          aria-pressed={state.sound}
          onClick={() => onPrefs({ sound: !state.sound })}
        >
          {state.sound ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
          Sound
        </button>
        <button
          type="button"
          className={"dg-switch" + (state.vibration ? " is-on" : "")}
          aria-pressed={state.vibration}
          onClick={() => onPrefs({ vibration: !state.vibration })}
        >
          <Vibrate aria-hidden="true" />
          Vibration
        </button>
      </div>
      <p className="dg-note">
        Relaxed mode takes the clock away, for children and for anyone learning the language. The three
        wrong touches are then only counted.
      </p>

      {shown ? (
        <>
          <div className="dg-map-head">
            <button type="button" className="dg-map-back" onClick={() => setSeason(null)}>
              <ChevronLeft aria-hidden="true" /> All seasons
            </button>
            <span className="dg-map-count">
              Season {shown.no} · {shown.episodes.length} episodes
            </span>
          </div>

          <div className="dg-levels">
            {shown.episodes.map((level) => (
              <LevelCard
                key={level.id}
                level={level}
                record={levelRecord(state, level.id)}
                locked={!unlocked(state, level.id)}
                onOpen={() => onOpen(level.id)}
              />
            ))}
          </div>
        </>
      ) : (
        <SeasonsCover seasons={seasons} onOpen={setSeason} />
      )}
    </div>
  );
}