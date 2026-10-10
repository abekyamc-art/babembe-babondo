import React from "react";
import { Apple, Bell, Bird, Fish, Flower2, Gift, Heart as HeartIcon, Key, Music, Star, Sun, Umbrella } from "lucide-react";
import { Image } from "@/components/ui/image";

/** The things a puzzle may add, by the name the question keeps with it. */
const THINGS = { Bird, Flower2, Star, Sun, Fish, Key, Heart: HeartIcon, Bell, Umbrella, Gift, Apple, Music };

/** How a turned, brightened, softened or drained place is drawn over the picture. */
const FILTER = {
  hue: { backdropFilter: "hue-rotate(135deg) saturate(1.7)", WebkitBackdropFilter: "hue-rotate(135deg) saturate(1.7)" },
  bright: { backdropFilter: "brightness(1.6)", WebkitBackdropFilter: "brightness(1.6)" },
  blur: { backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)" },
  grey: { backdropFilter: "grayscale(1)", WebkitBackdropFilter: "grayscale(1)" },
};

const boxOf = (spot) => ({
  left: `${spot.x * 100}%`,
  top: `${spot.y * 100}%`,
  width: `${spot.w * 100}%`,
  height: `${spot.h * 100}%`,
});

/** One difference drawn into the lower picture, exactly where its own place stands. */
function DiffMark({ difference }) {
  const box = boxOf(difference);
  if (difference.kind === "added") {
    const Thing = THINGS[difference.thing];
    return (
      <span className="diff-added" style={box}>
        {Thing ? <Thing className="diff-thing" style={{ color: difference.colour }} /> : null}
      </span>
    );
  }
  return <span className="diff-overlay" style={{ ...box, ...(FILTER[difference.kind] || {}) }} />;
}

/**
 * One of the two pictures: the scene itself, the differences drawn into the lower copy, a ring standing
 * wherever one has been found, and the places themselves as whole tap targets.
 */
export default function DiffPanel({ puzzle, layers, shown, onSpot, onMiss }) {
  return (
    <div className="diff-panel" onPointerDown={onMiss}>
      <Image src={puzzle.url} alt={puzzle.alt} className="diff-img" fittingType="fill" />
      {layers
        ? puzzle.differences.map((difference) => <DiffMark key={difference.id} difference={difference} />)
        : null}
      {puzzle.differences.map((difference) => {
        const on = shown.includes(difference.id);
        return on ? <span key={`ring:${difference.id}`} className="diff-ring" style={boxOf(difference)} /> : null;
      })}
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