import React, { useRef, useState } from "react";
import { Lock } from "lucide-react";
import TimelineWave from "@/components/studio/TimelineWave";
import { clipEnd } from "@/lib/studioTracks";

/**
 * One piece of audio on the timeline. It is dragged with a finger, and while it is being dragged only
 * the block moves — the song itself is changed once, when the finger comes off, so a long drag is one
 * change and not a hundred.
 */
export default function TimelineClip({ clip, track, buffer, selected, pxPerSec, snap, onSelect, onMove }) {
  const [shift, setShift] = useState(0);
  const drag = useRef({ active: false, from: 0, moved: false, shift: 0 });

  const width = Math.max(14, (Number(clip.duration) || 0.2) * pxPerSec);
  const left = (Number(clip.start) || 0) * pxPerSec;

  const down = (event) => {
    event.stopPropagation();
    drag.current = { active: true, from: event.clientX, moved: false, shift: 0 };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch (err) {
      // a phone that will not capture the pointer still drags
    }
  };

  const move = (event) => {
    if (!drag.current.active) return;
    const dx = event.clientX - drag.current.from;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    drag.current.shift = dx;
    setShift(dx);
  };

  const up = () => {
    if (!drag.current.active) return;
    const { moved, shift: dx } = drag.current;
    drag.current.active = false;
    setShift(0);
    if (!moved) {
      onSelect(clip.id);
      return;
    }
    const next = Math.max(0, snap(clip.start + dx / pxPerSec));
    if (Math.abs(next - clip.start) > 0.001) onMove(clip.id, next);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${clip.name || track.name} — ${Math.round(clip.start)}s`}
      className={`gs-clip${selected ? " is-on" : ""}${track.locked ? " is-locked" : ""}`}
      style={{
        left: `${left}px`,
        width: `${width}px`,
        transform: shift ? `translateX(${shift}px)` : undefined,
        "--gs-clip": track.color,
      }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect(clip.id);
      }}
    >
      <span className="gs-clip-top">
        <span className="gs-clip-name">{clip.name || track.name}</span>
        {track.locked ? <Lock aria-hidden="true" /> : null}
      </span>
      {buffer ? (
        <TimelineWave
          buffer={buffer}
          sourceKey={clip.source_key}
          offset={clip.offset}
          duration={clip.duration}
          color="rgba(255,255,255,0.82)"
          height={26}
        />
      ) : (
        <span className="gs-clip-missing">{Math.round(clip.duration)}s</span>
      )}
      {clip.looping ? <span className="gs-clip-loop" aria-hidden="true" /> : null}
      {clipEnd(clip) > 0 && clip.fade_in > 0 ? <span className="gs-clip-fade" style={{ width: `${clip.fade_in * pxPerSec}px` }} aria-hidden="true" /> : null}
    </div>
  );
}