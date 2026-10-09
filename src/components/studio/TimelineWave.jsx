import React, { useEffect, useRef } from "react";
import { peaksFor } from "@/lib/studioEngine";

/**
 * The shape of a recording, drawn inside its clip. Only the part of the recording the clip plays is
 * drawn — the same marks are found for any clip of the same take, so a cut or a move redraws at once
 * and the sound underneath is never touched.
 */
export default function TimelineWave({ buffer, sourceKey, offset = 0, duration = 0, color = "#C7F400", height = 32 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !buffer) return;
    const width = Math.max(8, canvas.clientWidth);
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    const draw = canvas.getContext("2d");
    draw.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw.clearRect(0, 0, width, height);

    const marks = Math.max(12, Math.floor(width / 2.5));
    const all = peaksFor(sourceKey || "clip", buffer, 2400);
    const total = buffer.duration || 1;
    const from = Math.max(0, Math.min(1, offset / total));
    const to = Math.max(from, Math.min(1, (offset + duration) / total));
    const middle = height / 2;
    draw.fillStyle = color;

    for (let i = 0; i < marks; i += 1) {
      const at = from + ((to - from) * i) / marks;
      const index = Math.min(all.length - 1, Math.max(0, Math.floor(at * all.length)));
      const peak = all[index] || 0;
      const bar = Math.max(1, peak * (height - 3));
      draw.fillRect((i / marks) * width, middle - bar / 2, Math.max(1, width / marks - 0.6), bar);
    }
  }, [buffer, sourceKey, offset, duration, color, height]);

  return <canvas ref={ref} className="gs-wave" style={{ height: `${height}px` }} aria-hidden="true" />;
}