import React, { useRef } from "react";
import { X } from "lucide-react";
import GameScene from "./scenes/GameScene";
/** A small finger margin in screen pixels, not a broad guessed region of the picture. */
const REACH = 12;

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
    let best = null;
    let closest = Infinity;
    differences.forEach((difference) => {
      const left = difference.x;
      const top = difference.y;
      const across = Math.max(left - x, 0, x - (left + difference.w)) * rect.width;
      const down = Math.max(top - y, 0, y - (top + difference.h)) * rect.height;
      if (Math.hypot(across, down) > REACH) return;
      const distance = Math.hypot(
        (x - left - difference.w / 2) * rect.width,
        (y - top - difference.h / 2) * rect.height
      );
      if (distance < closest) { closest = distance; best = difference; }
    });
    if (best) {
      if (!found.includes(best.id)) onFound(best.id);
    } else onWrong(x, y, uid);
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
      <GameScene scene={scene} changed={changed} uid={uid} differences={differences} />

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