import React from "react";
import { ChevronRight } from "lucide-react";
import GameScene from "./scenes/GameScene";

/** The untouched drawing, so the cover's scenes are the levels' own pictures as they were made. */
const NONE = new Set();

/**
 * The one cover that holds every level: the game's own scenes drawn small beside each other, and what has
 * been passed written under them. Opening it is what shows the level map itself, with every card on it.
 */
export default function LevelsCover({ previews, slots, passed, stars, onOpen }) {
  return (
    <button
      type="button"
      className="dg-cover"
      onClick={onOpen}
      aria-label={`All levels — open the level map, ${passed} of ${slots} passed, ${stars} stars earned`}
    >
      <span className="dg-cover-art">
        {previews.map((level) => (
          <span key={level.id} className="dg-cover-cell" aria-hidden="true">
            <GameScene scene={level.scene} changed={NONE} uid={`cover${level.id}`} />
          </span>
        ))}
      </span>

      <span className="dg-cover-body">
        <span className="dg-cover-name">All levels</span>
        <span className="dg-cover-sub">
          Every picture level in one place — {slots} levels, {passed} passed
        </span>
      </span>

      <span className="dg-cover-go" aria-hidden="true">
        <ChevronRight />
      </span>
    </button>
  );
}