import React from "react";

/**
 * The bars a clip stands on, read from the clip's own seed, so the same clip always draws the same
 * shape. Nothing here is counted, stored or sent anywhere — it is only how the clip looks.
 */
function barsOf(seed, count) {
  const text = String(seed || "clip");
  let hash = 0;
  for (let at = 0; at < text.length; at += 1) hash = (hash * 31 + text.charCodeAt(at)) % 9973;

  const bars = [];
  for (let at = 0; at < count; at += 1) {
    hash = (hash * 1103515245 + 12345) % 2147483648;
    bars.push(26 + (hash % 70));
  }
  return bars;
}

/**
 * One clip on the timeline: the work it holds, drawn as bars. A voice of its own can be taken hold
 * of where it stands and carried along its lane, and the clip that was taken hold of is marked.
 */
export default function TimelineClip({ clip, draggable, selected, dragging, onGrab, onSlide, onDrop }) {
  return (
    <div
      className={`rap-clip ${draggable ? "is-movable" : ""} ${selected ? "is-sel" : ""} ${
        dragging ? "is-dragging" : ""
      }`}
      style={{ left: clip.left, width: clip.width, background: clip.color }}
      onPointerDown={draggable ? onGrab : undefined}
      onPointerMove={draggable ? onSlide : undefined}
      onPointerUp={draggable ? onDrop : undefined}
      onPointerCancel={draggable ? onDrop : undefined}
    >
      <span className="rap-clip-name">{clip.name}</span>
      {barsOf(clip.seed, Math.max(6, Math.min(18, clip.count + 4))).map((height, index) => (
        <i key={index} style={{ height: `${height}%` }} />
      ))}
    </div>
  );
}