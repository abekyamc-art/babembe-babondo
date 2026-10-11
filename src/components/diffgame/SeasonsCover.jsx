import React from "react";
import SeasonTile from "./SeasonTile";

/**
 * The game's cover: the four seasons side by side, two to a row, sized to the screen rather than laid
 * over anything. Each tile carries its own season — the scenes of it, how much of it is passed, and the
 * lock where it cannot be opened yet. Opening a tile shows that season's episodes alone.
 */
export default function SeasonsCover({ seasons, onOpen }) {
  return (
    <>
      <div className="dg-covers">
        {seasons.map((season) => (
          <SeasonTile key={season.no} season={season} onOpen={() => onOpen(season.no)} />
        ))}
      </div>

      <p className="dg-note">
        Pass every episode of a season to open the one after it. A season whose episodes are still being
        drawn keeps its cover locked until they stand.
      </p>
    </>
  );
}