import React from "react";
import { Image } from "@/components/ui/image";

const boxOf = (spot) => ({
  left: `${spot.x * 100}%`,
  top: `${spot.y * 100}%`,
  width: `${spot.w * 100}%`,
  height: `${spot.h * 100}%`,
});

/**
 * One of the two pictures of a puzzle: the scene itself, a ring standing wherever a difference has been
 * found, and the five places themselves as whole tap targets. The lower copy of a pair carries the
 * differences drawn into it; the upper one is the same scene without them.
 */
export default function DiffPanel({ puzzle, src, shown, onSpot, onMiss }) {
  return (
    <div className="diff-panel" onPointerDown={onMiss}>
      <Image src={src} alt={puzzle.alt} className="diff-img" fittingType="fill" />
      {puzzle.differences.map((difference) =>
        shown.includes(difference.id) ? (
          <span key={`ring:${difference.id}`} className="diff-ring" style={boxOf(difference)} />
        ) : null
      )}
      {puzzle.differences.map((difference) => (
        <button
          key={`spot:${difference.id}`}
          type="button"
          className="diff-spot"
          style={boxOf(difference)}
          aria-label="A place where the two pictures may differ"
          onPointerDown={(event) => {
            event.stopPropagation();
            event.preventDefault();
            if (shown.includes(difference.id)) return;
            onSpot(difference);
          }}
        />
      ))}
    </div>
  );
}