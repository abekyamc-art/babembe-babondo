import React, { useRef } from "react";
import { X } from "lucide-react";
import GameScene from "./scenes/GameScene";
import { PANEL } from "@/lib/differenceGame/levels";

/**
 * How far from a difference a touch may land and still find it, measured in the picture's own units — the
 * picture stands 1000 wide and 560 high. A place is small beside the whole picture, and a finger is not a
 * pointer: a touch that lands beside a place finds it rather than counting as a touch that found nothing.
 */
const REACH = 120;

const place = (difference) => ({
  left: `${difference.x * 100}%`,
  top: `${difference.y * 100}%`,
  width: `${difference.w * 100}%`,
  height: `${difference.h * 100}%`,
});

/**
 * One of the two pictures of a level.
 *
 * The picture itself is drawn by the app, and the places its differences stand are laid over it as the
 * level's own touch areas: a touch inside one of them means that difference, and a touch anywhere else is
 * a touch that found nothing. Both pictures of a level take touches, and what is found in one is rung out
 * on both — so the player may work on either picture, whichever they are looking at.
 */
export default function PuzzlePanel({
  scene,
  uid,
  differences,
  changed,
  found,
  hintId,
  reveal,
  marks,
  label,
  onFound,
  onWrong,
}) {
  const panel = useRef(null);

  // A touch is measured against the picture itself and belongs to the nearest difference it landed on —
  // or just beside. A place is small on a phone, so a touch near one finds it, and two places standing
  // side by side still take the touch that went to the nearer of them rather than both at once.
  const touched = (event) => {
    const rect = panel.current ? panel.current.getBoundingClientRect() : null;
    if (!rect || !rect.width || !rect.height) return;
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    // the touch and the places are both held in the picture's own units, so the reach is the same share
    // of the picture, and so the same distance under a finger, on every phone
    const px = x * PANEL.width;
    const py = y * PANEL.height;
    let best = null;
    let closest = Infinity;
    differences.forEach((difference) => {
      if (found.includes(difference.id)) return;
      const left = difference.x * PANEL.width;
      const top = difference.y * PANEL.height;
      // how far outside the place's own area the touch landed — nothing at all when it landed on it
      const across = Math.max(left - px, 0, px - (left + difference.w * PANEL.width));
      const down = Math.max(top - py, 0, py - (top + difference.h * PANEL.height));
      const away = Math.hypot(across, down);
      if (away > REACH) return;
      if (away < closest) {
        closest = away;
        best = difference;
      }
    });
    if (best) onFound(best.id);
    else onWrong(x, y, uid);
  };

  const hint = hintId ? differences.find((difference) => difference.id === hintId) : null;

  return (
    <div
      className={"dg-panel" + (reveal ? " is-reveal" : "")}
      ref={panel}
      role="group"
      aria-label={label}
      onPointerDown={touched}
    >
      <GameScene scene={scene} changed={changed} uid={uid} />

      {differences.map((difference, i) => {
        const isFound = found.includes(difference.id);
        return (
          <button
            key={difference.id}
            type="button"
            className={"dg-spot" + (isFound ? " is-found" : "")}
            style={place(difference)}
            onClick={() => onFound(difference.id)}
            aria-label={
              isFound
                ? `Found: ${difference.label}`
                : `Hidden difference ${i + 1} of ${differences.length}`
            }
          />
        );
      })}

      {differences
        .filter((difference) => found.includes(difference.id))
        .map((difference) => (
          <span key={difference.id} className="dg-ring" style={place(difference)} aria-hidden="true" />
        ))}

      {reveal
        ? differences
            .filter((difference) => !found.includes(difference.id))
            .map((difference) => (
              <span
                key={difference.id}
                className="dg-ring is-reveal"
                style={place(difference)}
                aria-hidden="true"
              />
            ))
        : null}

      {hint ? <span className="dg-ring is-hint" style={place(hint)} aria-hidden="true" /> : null}

      {marks.map((mark) => (
        <span
          key={mark.key}
          className="dg-wrong"
          style={{ left: `${mark.x * 100}%`, top: `${mark.y * 100}%` }}
          aria-hidden="true"
        >
          <X />
        </span>
      ))}
    </div>
  );
}