import React, { useMemo } from "react";
import { Mic, Music2, Trash2, Upload, Wand2 } from "lucide-react";
import { peaks, sourceOf, trackLength } from "@/lib/voiceTracks";

const KIND = { record: "Rekodi", import: "Faili", clone: "Iliyoimbwa" };
const ICON = { record: Mic, import: Upload, clone: Music2 };

/** One lane of the studio's voice tracks: what it holds, where it stands, how loud it is, how much
 *  of it is left after the cut, and the pitch it was moved to. */
export default function VoiceTrackRow({ track, busy, onPatch, onPitch, onAuto, onRemove }) {
  const source = sourceOf(track);
  const bars = useMemo(() => peaks(source, 56), [source]);
  const length = Math.max(0.1, source.duration);
  const Icon = ICON[track.kind] || Mic;

  return (
    <li className="rap-track">
      <div className="rap-track-head">
        <span className="rap-track-name">
          <Icon className="h-3.5 w-3.5" />
          {track.name}
        </span>
        <span className="rap-chip">{KIND[track.kind] || "Sauti"}</span>
        <span className="rap-hint">{trackLength(track).toFixed(1)}s</span>
        <div className="rap-track-tools">
          <button
            type="button"
            className={`rap-mini ${track.muted ? "is-on" : ""}`}
            aria-label="Nyamazisha"
            onClick={() => onPatch({ muted: !track.muted })}
            disabled={!!busy}
          >
            M
          </button>
          <button
            type="button"
            className={`rap-mini ${track.solo ? "is-on" : ""}`}
            aria-label="Sikiliza hii pekee"
            onClick={() => onPatch({ solo: !track.solo })}
            disabled={!!busy}
          >
            S
          </button>
          <button
            type="button"
            className="rap-tool rap-tool-sm"
            aria-label="Ondoa sauti hii"
            onClick={() => onRemove(track.id)}
            disabled={!!busy}
          >
            <Trash2 />
          </button>
        </div>
      </div>

      <div className="rap-wave">
        {bars.map((height, index) => (
          <i key={index} style={{ height: `${Math.round(height * 100)}%` }} />
        ))}
      </div>

      <div className="rap-track-grid">
        <label className="rap-tune">
          <span className="rap-label">Anza</span>
          <input
            className="rap-slider"
            type="range"
            min="0"
            max="8"
            step="0.1"
            value={track.start}
            onChange={(event) => onPatch({ start: Number(event.target.value) })}
            disabled={!!busy}
          />
          <span className="rap-value">{Number(track.start || 0).toFixed(1)}s</span>
        </label>

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
            disabled={!!busy}
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
            disabled={!!busy}
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
            disabled={!!busy}
          />
          <span className="rap-value">{Math.round((track.volume || 0) * 100)}%</span>
        </label>
      </div>

      <div className="rap-pitch">
        <span className="rap-label">Pitch</span>
        <button
          type="button"
          className="rap-mini"
          aria-label="Punguza"
          onClick={() => onPitch(track.id, track.semitones - 1)}
          disabled={!!busy}
        >
          −
        </button>
        <span className="rap-value">
          {track.semitones > 0 ? `+${track.semitones}` : track.semitones} st
        </span>
        <button
          type="button"
          className="rap-mini"
          aria-label="Ongeza"
          onClick={() => onPitch(track.id, track.semitones + 1)}
          disabled={!!busy}
        >
          +
        </button>
        <button
          type="button"
          className="rap-mini rap-mini-wide"
          onClick={() => onPitch(track.id, 0)}
          disabled={!!busy}
        >
          Sawa
        </button>
        <button
          type="button"
          className={`rap-mini rap-mini-wide ${track.tuned ? "is-on" : ""}`}
          onClick={() => onAuto(track.id)}
          disabled={!!busy}
        >
          <Wand2 className="h-3.5 w-3.5" />
          Otomatiki
        </button>
      </div>
    </li>
  );
}