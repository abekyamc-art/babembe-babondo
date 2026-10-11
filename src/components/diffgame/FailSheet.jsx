import React from "react";
import { HeartCrack, LifeBuoy, RotateCcw, Grid2x2, LogOut } from "lucide-react";
import { extraCount, requiredCount } from "@/lib/differenceGame/places";

/**
 * The level was not passed — the time ran out, or the three wrong touches were spent. Nothing here is
 * said sharply: it says how many differences were found, keeps the score, and shows where the ones that
 * were missed stood — softly, in yellow, on both pictures — so the player learns them for the next try.
 */
export default function FailSheet({ level, result, mistakesUsed, onRetry, canContinue, onContinue, onLevels, onMenu }) {
  // what is shown is what the level asked for, never the extras a picture may hold beside them
  const found = result.foundRequired ?? result.found;
  const total = requiredCount(level);
  const extras = extraCount(level);
  return (
    <div className="dg-sheet-wrap" role="dialog" aria-modal="true" aria-label="Level not passed">
      <div className="dg-sheet is-lose">
        <span className="dg-sheet-mark is-lose" aria-hidden="true">
          <HeartCrack />
        </span>
        <h2 className="dg-sheet-title">Try Again — You Can Do It!</h2>
        <p className="dg-sheet-sub">
          {result.reason === "time"
            ? "The time ran out."
            : "The three wrong touches were used up."}{" "}
          The places you missed stand in yellow on both pictures.
          {extras > 0
            ? ` Find any ${total} of the ${total + extras} visible differences to pass.`
            : ""}
        </p>

        <dl className="dg-facts">
          <div>
            <dt>Found</dt>
            <dd>
              {found} of {total}
            </dd>
          </div>
          <div>
            <dt>Score</dt>
            <dd>{result.score}</dd>
          </div>
          <div>
            <dt>Mistakes</dt>
            <dd>
              {mistakesUsed} of {level.mistakes}
            </dd>
          </div>
        </dl>

        <div className="dg-sheet-actions">
          <button type="button" className="dg-btn is-main" onClick={onRetry}>
            <RotateCcw aria-hidden="true" /> Try Again
          </button>
          {canContinue ? (
            <button type="button" className="dg-btn" onClick={onContinue}>
              <LifeBuoy aria-hidden="true" /> Use a Hint and Continue
            </button>
          ) : null}
          <button type="button" className="dg-btn is-ghost" onClick={onLevels}>
            <Grid2x2 aria-hidden="true" /> Choose Another Level
          </button>
          <button type="button" className="dg-btn is-ghost" onClick={onMenu}>
            <LogOut aria-hidden="true" /> Back to Game Menu
          </button>
        </div>
      </div>
    </div>
  );
}