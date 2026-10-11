import React from "react";
import { Check } from "lucide-react";

/**
 * What the player still has to find: one circle for every place the level asks for. A circle stands with a
 * question mark until its place is found, and turns into a green tick for the rest of the level, so how far
 * the player has come is read at a glance. The extra places a picture may hold stand apart from the
 * circles, so what is asked for and what is spare are told apart while the level is played.
 */
export default function DifferenceTracker({ total, found, extras = 0, extrasFound = 0 }) {
  const left = Math.max(0, total - found);
  return (
    <div className="dg-tracker">
      <div className="dg-chips">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={"dg-chip" + (i < found ? " is-found" : "")}
            aria-label={i < found ? "Difference found" : "Difference still to find"}
          >
            {i < found ? <Check aria-hidden="true" /> : <span aria-hidden="true">?</span>}
          </span>
        ))}
      </div>
      <p className="dg-left" role="status">
        {left === 0
          ? "Every difference found!"
          : `${left} ${left === 1 ? "difference" : "differences"} left`}
        {extras > 0 ? ` · ${extrasFound} of ${extras} extra found` : ""}
      </p>
    </div>
  );
}