import React from "react";

/** A level, drawn: green until it is hot, amber as it approaches the top, red at the very edge. */
export default function Meter({ rms = 0, peak = 0, vertical = false, wide = false }) {
  const level = Math.min(1, Math.max(Number(rms) * 2.2, Number(peak)));
  const tone = peak >= 0.985 ? " is-hot" : level > 0.82 ? " is-warm" : "";
  const size = `${Math.round(level * 100)}%`;

  return (
    <div className={`gs-meter${vertical ? " is-v" : ""}${wide ? " is-wide" : ""}`} aria-hidden="true">
      <span className={`gs-meter-fill${tone}`} style={vertical ? { height: size } : { width: size }} />
    </div>
  );
}