import React, { useRef, useState } from "react";

/** Where a picture is framed in its circle: the middle, unless a framing was chosen for it. */
export function cropOf(profile) {
  return {
    x: typeof profile?.avatar_crop_x === "number" ? profile.avatar_crop_x : 0.5,
    y: typeof profile?.avatar_crop_y === "number" ? profile.avatar_crop_y : 0.5,
  };
}

const clamp = (value) => Math.min(1, Math.max(0, value));

/**
 * Choosing which part of a new picture sits in the frame. The picture itself is never turned,
 * widened or changed: it is dragged inside the round frame — a little to the left, a little down —
 * until the right part of it shows, and that choice is saved with the picture, so every place the
 * picture appears frames it the same way.
 */
export default function AvatarCrop({ url, x = 0.5, y = 0.5, busy, onCancel, onSave }) {
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const [point, setPoint] = useState({ x, y });

  // The picture follows the finger the way a picture does when it is moved inside a frame:
  // pulling it down brings the part above it into view, pulling it right brings the left part in.
  const move = (event) => {
    const drag = dragRef.current;
    const stage = stageRef.current;
    if (!drag || !stage) return;
    const size = stage.getBoundingClientRect().width || 1;
    setPoint({
      x: clamp(drag.x - (event.clientX - drag.px) / size),
      y: clamp(drag.y - (event.clientY - drag.py) / size),
    });
  };

  const start = (event) => {
    dragRef.current = { px: event.clientX, py: event.clientY, x: point.x, y: point.y };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const end = (event) => {
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return (
    <div className="avatar-crop">
      <div
        ref={stageRef}
        role="img"
        aria-label="Your new picture, dragged to frame it"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className="avatar-crop-stage"
      >
        <img
          src={url}
          alt=""
          draggable={false}
          className="avatar-crop-img"
          style={{ objectPosition: `${point.x * 100}% ${point.y * 100}%` }}
        />
      </div>
      <p className="avatar-crop-hint">Drag the picture to frame it</p>
      <div className="avatar-crop-tools">
        <button
          type="button"
          onClick={() => onSave(point.x, point.y)}
          disabled={busy}
          className="account-save"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="knowledge-cancel">
          Cancel
        </button>
      </div>
    </div>
  );
}