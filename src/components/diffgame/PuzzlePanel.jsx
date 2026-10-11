import React, { useRef } from "react";
import { X } from "lucide-react";
import GameScene from "./scenes/GameScene";

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

  // A touch is measured against the picture itself, and it belongs to the nearest difference whose place
  // it landed in. Two places may stand side by side, so a touch between them, or at the very edge of one,
  // finds the place it went looking for rather than the one laid over it.
  const touched = (event) => {
    const rect = panel.current ? panel.current.getBoundingClientRect() : null;
    if (!rect || !rect.width || !rect.height) return;
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    let best = null;
    let closest = Infinity;
    differences.forEach((difference) => {
      if (found.includes(difference.id)) return;
      if (x < difference.x || x > difference.x + difference.w) return;
      if (y < difference.y || y > difference.y + difference.h) return;
      const away = Math.hypot(
        x - (difference.x + difference.w / 2),
        y - (difference.y + difference.h / 2)
      );
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