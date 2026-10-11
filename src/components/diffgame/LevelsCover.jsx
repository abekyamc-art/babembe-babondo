import React from "react";
import { ChevronRight } from "lucide-react";
import GameScene from "./scenes/GameScene";

/** The untouched drawing, so the cover's scenes are the episodes' own pictures as they were made. */
const NONE = new Set();

/**
 * The one cover that holds every episode: it stands for Episode 1, with the game's own scenes drawn small
 * beside each other under its name and every season with its count written below. Opening it is what
 * shows the map of episodes, each of them standing under the season it belongs to.
 */
export default function LevelsCover({ previews, slots, seasons, passed, stars, onOpen }) {
  return (
    <button
      type="button"
      className="dg-cover"
      onClick={onOpen}
      aria-label={`The cover for Episode 1 — open the episode map, ${passed} of ${slots} passed, ${stars} stars earned`}
    >
      <span className="dg-cover-art">
        {previews.map((level) => (
          <span key={level.id} className="dg-cover-cell" aria-hidden="true">
            <GameScene scene={level.scene} changed={NONE} uid={`cover${level.id}`} />
          </span>
        ))}
      </span>

      <span className="dg-cover-body">
        <span className="dg-cover-kicker">The cover</span>
        <span className="dg-cover-name">EPISODE 1</span>
        <span className="dg-cover-sub">
          {seasons.map((season) => `Season ${season.no} · ${season.count} episodes`).join("   ·   ")}
        </span>
      </span>

      <span className="dg-cover-go" aria-hidden="true">
        <ChevronRight />
      </span>
    </button>
  );
}