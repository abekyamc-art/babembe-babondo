import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

/**
 * The head of one lane: what the lane is called, and everything that is done to the lane itself
 * rather than to its clip — silenced, put forward on its own, turned up or down, or folded away.
 * A lane that holds no track of its own keeps its name and a line saying what it is waiting for.
 */
export default function TrackHead({ name, hint, track, busy, onPatch, onFold }) {
  const off = !!busy;

  return (
    <div className="rap-th">
      <div className="rap-th-top">
        <span className="rap-th-name">{name}</span>

        {track ? (
          <div className="rap-th-tools">
            <button
              type="button"
              className={`rap-mini rap-th-flag ${track.muted ? "is-on" : ""}`}
              aria-pressed={!!track.muted}
              aria-label={track.muted ? `Fungua sauti ya ${name}` : `Nyamazisha ${name}`}
              title={track.muted ? "Fungua sauti" : "Nyamazisha (mute)"}
              onClick={() => onPatch({ muted: !track.muted })}
              disabled={off}
            >
              M
            </button>

            <button
              type="button"
              className={`rap-mini rap-th-flag ${track.solo ? "is-on" : ""}`}
              aria-pressed={!!track.solo}
              aria-label={track.solo ? `Ondoa ${name} kwenye solo` : `Sikiliza ${name} peke yake`}
              title={track.solo ? "Ondoa solo" : "Solo"}
              onClick={() => onPatch({ solo: !track.solo })}
              disabled={off}
            >
              S
            </button>

            <button
              type="button"
              className="rap-fold"
              aria-label={track.collapsed ? `Fungua lane ya ${name}` : `Funga lane ya ${name}`}
              aria-pressed={!!track.collapsed}
              onClick={() => onFold(track.id)}
              disabled={off}
            >
              {track.collapsed ? <ChevronDown /> : <ChevronUp />}
            </button>
          </div>
        ) : null}
      </div>

      {track ? (
        <input
          type="range"
          className="rap-slider rap-th-vol"
          min="0"
          max="1.5"
          step="0.05"
          value={track.volume}
          aria-label={`Volume ya ${name}`}
          onChange={(event) => onPatch({ volume: Number(event.target.value) })}
          disabled={off}
        />
      ) : (
        <span className="rap-th-hint">{hint}</span>
      )}
    </div>
  );
}