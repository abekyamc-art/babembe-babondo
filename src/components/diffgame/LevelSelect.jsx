import React from "react";
import { ChevronLeft, Lock, Star, Trophy, Volume2, VolumeX, Vibrate, Hourglass } from "lucide-react";
import LevelCard from "./LevelCard";
import { LEVEL_SLOTS, levelById } from "@/lib/differenceGame/levels";
import { levelRecord, levelsPassed, starsEarned, unlocked } from "@/lib/differenceGame/store";

/**
 * The game's own menu: every level that stands, the ones still to come, the stars and the score earned,
 * and the three switches the player sets — a level without a clock, the sound, and the phone's own shake.
 */
export default function LevelSelect({ state, onPrefs, onOpen, onExit }) {
  const slots = Array.from({ length: LEVEL_SLOTS }, (_, i) => i + 1);
  const passed = levelsPassed(state);

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
          <em>levels passed</em>
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

      <div className="dg-levels">
        {slots.map((id) => {
          const level = levelById(id);
          if (!level) {
            return (
              <div key={id} className="dg-card is-soon" aria-label={`Level ${id} is coming soon`}>
                <span className="dg-soon-mark" aria-hidden="true">
                  <Lock />
                </span>
                <span className="dg-card-no">Level {id}</span>
                <span className="dg-card-name">Coming soon</span>
              </div>
            );
          }
          return (
            <LevelCard
              key={id}
              level={level}
              record={levelRecord(state, id)}
              locked={!unlocked(state, id)}
              onOpen={() => onOpen(id)}
            />
          );
        })}
      </div>
    </div>
  );
}