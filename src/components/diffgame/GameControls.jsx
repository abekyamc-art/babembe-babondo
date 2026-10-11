import React from "react";
import { Lightbulb, Pause, RotateCcw } from "lucide-react";

/**
 * The three controls of a level, each the size of a thumb and standing apart from the others: one hint,
 * the pause, and starting the level again from the top.
 */
export default function GameControls({ hintsLeft, paused, onHint, onPause, onRestart }) {
  return (
    <div className="dg-bar">
      <button
        type="button"
        className={"dg-act is-hint" + (hintsLeft > 0 ? "" : " is-spent")}
        onClick={onHint}
        disabled={hintsLeft <= 0 || paused}
      >
        <Lightbulb aria-hidden="true" />
        <span>{hintsLeft > 0 ? `Hint (${hintsLeft})` : "No hint left"}</span>
      </button>
      <button type="button" className="dg-act" onClick={onPause} disabled={paused}>
        <Pause aria-hidden="true" />
        <span>Pause</span>
      </button>
      <button type="button" className="dg-act" onClick={onRestart}>
        <RotateCcw aria-hidden="true" />
        <span>Restart</span>
      </button>
    </div>
  );
}