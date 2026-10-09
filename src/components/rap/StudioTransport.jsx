import React from "react";
import { Pause, Play, Square } from "lucide-react";
import { timeLabel } from "@/lib/rapBeat";

/**
 * The transport: one place where the session is played, held and stopped, saying at every moment
 * where the mix stands. Play carries on from wherever it was paused, and stop takes the playhead
 * back to the head of the line — nothing about the mix is rebuilt to do either.
 */
export default function StudioTransport({ playing, position, length, busy, off, hasTracks, onPlay, onPause, onStop }) {
  const paused = !playing && position > 0.05;
  const state = playing ? "playing" : paused ? "paused" : "stopped";
  const word = playing ? "Inapiga" : paused ? "Imesimamishwa · play kuendelea" : "Imesimama";

  return (
    <div className="rap-tp">
      <button
        type="button"
        className={`rap-tp-btn is-play ${playing ? "is-on" : ""}`}
        aria-label={playing ? "Sitisha kwa muda" : "Piga mchanganyiko"}
        title={playing ? "Pause" : "Play"}
        onClick={playing ? onPause : onPlay}
        disabled={off || busy || (!hasTracks && !playing)}
      >
        {playing ? <Pause /> : <Play />}
      </button>

      <button
        type="button"
        className="rap-tp-btn"
        aria-label="Simamisha na rudi mwanzo"
        title="Stop"
        onClick={onStop}
        disabled={off || (!playing && position <= 0)}
      >
        <Square />
      </button>

      <span className={`rap-tp-state is-${state}`}>{word}</span>
      <span className="rap-tp-read">
        {timeLabel(position)} / {timeLabel(length)}
      </span>
    </div>
  );
}