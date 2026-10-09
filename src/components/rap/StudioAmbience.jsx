import React from "react";
import { Waves } from "lucide-react";

/**
 * The room the whole session is heard in: one echo and one soft tail, laid over everything at once —
 * the voices, the beat, and the mix that is played while you work, kept as a take, and downloaded.
 * Turning it right down leaves the mix exactly as it was recorded, dry in a dead room.
 */
export default function StudioAmbience({ value, busy, onChange }) {
  return (
    <div className="rap-room">
      <span className="rap-label">
        <Waves className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
        Ukumbi wa studio · echo
      </span>
      <input
        className="rap-slider rap-slider-room"
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={!!busy}
        aria-label="Echo ya studio"
      />
      <span className="rap-value">{Math.round(value * 100)}%</span>
      <span className="rap-hint">
        {value === 0
          ? "Bila echo — sauti kavu, kama ilivyorekodiwa."
          : "Echo inawekwa juu ya mchanganyiko wote — sauti, beat, na take inayohifadhiwa."}
      </span>
    </div>
  );
}