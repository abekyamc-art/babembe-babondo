import React from "react";
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, X } from "lucide-react";

/**
 * The clip that was taken hold of, and the buttons that move it along the line — a tenth of a
 * second or a whole one at a time, front or back — whether or not the session is playing. With no
 * clip held, the same bar says how a clip is taken hold of in the first place.
 */
export default function ClipNudge({ track, busy, onNudge, onClose }) {
  if (!track) {
    return (
      <p className="rap-nudge rap-nudge-empty">
        Gusa kipande kwenye timeline — kisha kivute kwa kidole, au tumia vitufe hapa kukisogeza mbele
        au nyuma. Kila kipande cha sauti kinasogea hata mchanganyiko umesimama.
      </p>
    );
  }

  const off = !!busy;
  const start = Math.max(0, Number(track.start || 0));

  return (
    <div className="rap-nudge">
      <span className="rap-nudge-name">{track.name}</span>

      <button
        type="button"
        className="rap-mini"
        aria-label="Nyuma sekunde moja"
        title="Nyuma 1s"
        onClick={() => onNudge(-1)}
        disabled={off}
      >
        <ChevronFirst className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className="rap-mini"
        aria-label="Nyuma sekunde moja ya kumi"
        title="Nyuma 0.1s"
        onClick={() => onNudge(-0.1)}
        disabled={off}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      <span className="rap-nudge-pos">{start.toFixed(1)}s</span>

      <button
        type="button"
        className="rap-mini"
        aria-label="Mbele kwa sekunde moja ya kumi"
        title="Mbele 0.1s"
        onClick={() => onNudge(0.1)}
        disabled={off}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className="rap-mini"
        aria-label="Mbele sekunde moja"
        title="Mbele 1s"
        onClick={() => onNudge(1)}
        disabled={off}
      >
        <ChevronLast className="h-3.5 w-3.5" />
      </button>

      <span className="rap-nudge-hint">Vuta kipande, au tumia hivi</span>

      <button
        type="button"
        className="rap-mini rap-nudge-x"
        aria-label="Ondoa kipande kwenye mkono"
        title="Acha kipande"
        onClick={onClose}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}