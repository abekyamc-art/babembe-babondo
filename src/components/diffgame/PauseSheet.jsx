import React from "react";
import { Play, RotateCcw, Grid2x2 } from "lucide-react";

/** The clock is stopped and the pictures are held still until the player comes back to them. */
export default function PauseSheet({ onResume, onRestart, onLevels }) {
  return (
    <div className="dg-sheet-wrap" role="dialog" aria-modal="true" aria-label="Game paused">
      <div className="dg-sheet">
        <h2 className="dg-sheet-title">Paused</h2>
        <p className="dg-sheet-sub">The clock is stopped. Nothing moves until you come back.</p>
        <div className="dg-sheet-actions">
          <button type="button" className="dg-btn is-main" onClick={onResume}>
            <Play aria-hidden="true" /> Resume
          </button>
          <button type="button" className="dg-btn" onClick={onRestart}>
            <RotateCcw aria-hidden="true" /> Restart Level
          </button>
          <button type="button" className="dg-btn is-ghost" onClick={onLevels}>
            <Grid2x2 aria-hidden="true" /> Game Menu
          </button>
        </div>
      </div>
    </div>
  );
}