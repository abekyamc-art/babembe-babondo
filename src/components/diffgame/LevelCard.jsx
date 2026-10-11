import React from "react";
import { Lock, Star } from "lucide-react";
import GameScene from "./scenes/GameScene";

/** The untouched drawing, so a card's picture is the scene as it was made. */
const NONE = new Set();

/**
 * One level on the map: its number, the scene drawn small, how hard it is, and what the player has earned
 * on it. A level stands open when the one before it has been passed, and is locked until then.
 */
export default function LevelCard({ level, record, locked, onOpen }) {
  return (
    <button
      type="button"
      className={"dg-card" + (locked ? " is-locked" : "") + (record.completed ? " is-passed" : "")}
      onClick={onOpen}
      disabled={locked}
      aria-label={`Level ${level.id}: ${level.title}, ${level.difficulty}${
        locked ? ", locked" : record.completed ? `, passed with ${record.stars} stars` : ", open"
      }`}
    >
      <span className="dg-thumb" aria-hidden="true">
        <GameScene scene={level.scene} changed={NONE} uid={`thumb${level.id}`} />
        {locked ? (
          <span className="dg-lock">
            <Lock />
          </span>
        ) : null}
      </span>
      <span className="dg-card-top">
        <span className="dg-card-no">Level {level.id}</span>
        <span className={`dg-tag is-${level.difficulty.toLowerCase()}`}>{level.difficulty}</span>
      </span>
      <span className="dg-card-name">{level.title}</span>
      <span className="dg-card-foot">
        <span className="dg-stars" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <Star key={n} className={n <= (record.stars || 0) ? "dg-star is-on" : "dg-star"} />
          ))}
        </span>
        <span className="dg-best">
          {record.best ? `${record.best} pts` : `${level.differences.length} to find`}
        </span>
      </span>
    </button>
  );
}