import React from "react";
import { ChevronRight, Lock } from "lucide-react";
import { Image } from "@/components/ui/image";
import GameScene from "./scenes/GameScene";
import { coverOf } from "@/lib/differenceGame/seasonCovers";

/** The untouched drawing, so a season without its own photograph shows a scene as it was made. */
const NONE = new Set();

/**
 * One season's cover: its own number, its own picture, and how far the player has come in it. A season
 * opens on its own 4K photograph where it has one, and on the drawn scene of its first episode otherwise.
 * A season that cannot be opened yet stays visible, dimmed under a lock, with the reason written under it —
 * the season whose episodes are not drawn yet, or the one the player has still to reach.
 */
export default function SeasonTile({ season, onOpen }) {
  const first = season.episodes[0] || null;
  const cover = coverOf(season.no);
  const count = season.episodes.length;

  return (
    <button
      type="button"
      className={"dg-season-tile" + (season.open ? "" : " is-locked")}
      onClick={onOpen}
      disabled={!season.open}
      aria-label={
        count
          ? `Season ${season.no}, ${season.passed} of ${count} episodes passed${
              season.open ? ", open the season" : ", locked"
            }`
          : `Season ${season.no}, coming soon`
      }
    >
      <span className={"dg-season-art" + (cover || first ? "" : " is-empty")} aria-hidden="true">
        {cover ? (
          <Image
            src={cover}
            alt=""
            className="dg-art"
            draggable={false}
            quality={95}
            fittingType="fill"
          />
        ) : first ? (
          <GameScene scene={first.scene} changed={NONE} uid={`season${season.no}`} />
        ) : null}
        {season.open ? null : (
          <span className="dg-season-lock">
            <Lock />
          </span>
        )}
      </span>

      <span className="dg-season-top">
        <span className="dg-season-no">SEASON {season.no}</span>
        {season.open ? (
          <span className="dg-season-go" aria-hidden="true">
            <ChevronRight />
          </span>
        ) : (
          <span className="dg-season-chip">{count ? "Locked" : "Soon"}</span>
        )}
      </span>

      <span className="dg-season-sub">
        {count ? `${season.passed} of ${count} episodes passed` : "Episodes are being drawn"}
      </span>
    </button>
  );
}