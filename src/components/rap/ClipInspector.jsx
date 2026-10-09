import React from "react";
import { ChevronDown, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, ChevronUp, Trash2, X } from "lucide-react";
import { MAX_START, sourceOf, trackLength } from "@/lib/voiceTracks";

/**
 * The piece that was taken hold of on the timeline, and everything that can be done to it where it
 * stands: carried front or back by hand or by a nudge, laid down anywhere along the line, cut at
 * either end, turned up or down, folded away with its lane, or thrown out of the session.
 */
export default function ClipInspector({ track, busy, onStart, onNudge, onPatch, onRemove, onFold, onClose }) {
  if (!track) return null;

  const length = Math.max(0.1, sourceOf(track).duration);
  const start = Math.max(0, Number(track.start || 0));
  const off = !!busy;

  return (
    <div className="rap-clip-tools">
      <div className="rap-card-head">
        <span className="rap-label">Kipande · {track.name}</span>
        <div className="rap-track-tools">
          <button
            type="button"
            className="rap-mini"
            aria-label="Funga vidhibiti vya kipande"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="rap-arrange">
        <span className="rap-label">Sogeza nyuma / mbele</span>
        <div className="rap-arrange-row">
          <button
            type="button"
            className="rap-mini"
            aria-label="Nyuma sekunde moja"
            onClick={() => onNudge(-1)}
            disabled={off}
          >
            <ChevronFirst className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rap-mini"
            aria-label="Nyuma kwa sekunde moja ya kumi"
            onClick={() => onNudge(-0.1)}
            disabled={off}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="rap-value">{start.toFixed(1)}s</span>
          <button
            type="button"
            className="rap-mini"
            aria-label="Mbele kwa sekunde moja ya kumi"
            onClick={() => onNudge(0.1)}
            disabled={off}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rap-mini"
            aria-label="Mbele sekunde moja"
            onClick={() => onNudge(1)}
            disabled={off}
          >
            <ChevronLast className="h-3.5 w-3.5" />
          </button>
        </div>

        <label className="rap-tune">
          <span className="rap-label">Inaanza kwenye timeline</span>
          <input
            className="rap-slider"
            type="range"
            min="0"
            max={MAX_START}
            step="0.1"
            value={start}
            onChange={(event) => onStart(track.id, Number(event.target.value))}
            disabled={off}
          />
          <span className="rap-value">{start.toFixed(1)}s</span>
        </label>
      </div>

      <div className="rap-track-grid">
        <label className="rap-tune">
          <span className="rap-label">Kata mwanzo</span>
          <input
            className="rap-slider"
            type="range"
            min="0"
            max={length}
            step="0.05"
            value={track.trimStart}
            onChange={(event) =>
              onPatch({
                trimStart: Math.min(Number(event.target.value), (track.trimEnd ?? length) - 0.1),
              })
            }
            disabled={off}
          />
          <span className="rap-value">{Number(track.trimStart || 0).toFixed(1)}s</span>
        </label>

        <label className="rap-tune">
          <span className="rap-label">Kata mwisho</span>
          <input
            className="rap-slider"
            type="range"
            min="0"
            max={length}
            step="0.05"
            value={track.trimEnd ?? length}
            onChange={(event) =>
              onPatch({
                trimEnd: Math.max(Number(event.target.value), Number(track.trimStart || 0) + 0.1),
              })
            }
            disabled={off}
          />
          <span className="rap-value">{Number(track.trimEnd ?? length).toFixed(1)}s</span>
        </label>

        <label className="rap-tune">
          <span className="rap-label">Volume</span>
          <input
            className="rap-slider"
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={track.volume}
            onChange={(event) => onPatch({ volume: Number(event.target.value) })}
            disabled={off}
          />
          <span className="rap-value">{Math.round((track.volume || 0) * 100)}%</span>
        </label>

        <div className="rap-tune">
          <span className="rap-label">Iliyobaki baada ya kukata</span>
          <span className="rap-value">{trackLength(track).toFixed(1)}s</span>
        </div>
      </div>

      <div className="rap-mix-tools">
        <button type="button" className="rap-mini" onClick={() => onFold(track.id)} disabled={off}>
          {track.collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          {track.collapsed ? "Fungua lane" : "Funga lane"}
        </button>

        <button
          type="button"
          className="rap-mini"
          aria-label={`Ondoa ${track.name}`}
          onClick={() => onRemove(track.id)}
          disabled={off}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Ondoa
        </button>
      </div>
    </div>
  );
}