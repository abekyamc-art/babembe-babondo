import React, { useState } from "react";
import { ChevronLeft, Lock, Star, Trophy, Volume2, VolumeX, Vibrate, Hourglass } from "lucide-react";
import LevelCard from "./LevelCard";
import LevelsCover from "./LevelsCover";
import { LEVEL_SLOTS, SEASON_STARTS, levelById } from "@/lib/differenceGame/levels";
import { levelRecord, levelsPassed, starsEarned, unlocked } from "@/lib/differenceGame/store";

/**
 * The game's own menu: every episode that stands, the ones still to come, the stars and the score earned,
 * and the three switches the player sets — an episode without a clock, the sound, and the phone's own shake.
 *
 * The episodes stand behind one cover: the menu opens on the cover that stands for Episode 1, and the map
 * of episodes — each under the season it belongs to, with its own number, its own lock, stars and score —
 * is shown the moment that cover is opened.
 */
export default function LevelSelect({ state, onPrefs, onOpen, onExit }) {
  const slots = Array.from({ length: LEVEL_SLOTS }, (_, i) => i + 1);
  const passed = levelsPassed(state);
  const [map, setMap] = useState(false);

  // the cover's own picture: the first scenes of the game, drawn small beside each other
  const previews = slots.map(levelById).filter(Boolean).slice(0, 4);

  // every season, with the episode it opens on and how many episodes stand in it
  const starts = Object.entries(SEASON_STARTS)
    .map(([at, no]) => ({ no, at: Number(at) }))
    .sort((one, two) => one.at - two.at);
  const seasons = starts.map((season, i) => ({
    no: season.no,
    count: (starts[i + 1] ? starts[i + 1].at : LEVEL_SLOTS + 1) - season.at,
  }));
  const seasonAt = (id) => starts.filter((season) => season.at === id).map((season) => season.no)[0] || 0;

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

      {map ? (
        <>
          <div className="dg-map-head">
            <button type="button" className="dg-map-back" onClick={() => setMap(false)}>
              <ChevronLeft aria-hidden="true" /> The cover
            </button>
            <span className="dg-map-count">{LEVEL_SLOTS} episodes</span>
          </div>

          <div className="dg-levels">
            {slots.map((id) => {
              const level = levelById(id);
              const season = seasonAt(id);
              return (
                <React.Fragment key={id}>
                  {season ? <p className="dg-season">Season {season}</p> : null}
                  {level ? (
                    <LevelCard
                      level={level}
                      record={levelRecord(state, id)}
                      locked={!unlocked(state, id)}
                      onOpen={() => onOpen(id)}
                    />
                  ) : (
                    <div className="dg-card is-soon" aria-label={`Episode ${id} is coming soon`}>
                      <span className="dg-soon-mark" aria-hidden="true">
                        <Lock />
                      </span>
                      <span className="dg-card-no">EPISODE {id}</span>
                      <span className="dg-card-name">Coming soon</span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </>
      ) : (
        <LevelsCover
          previews={previews}
          slots={LEVEL_SLOTS}
          seasons={seasons}
          passed={passed}
          stars={starsEarned(state)}
          onOpen={() => setMap(true)}
        />
      )}
    </div>
  );
}