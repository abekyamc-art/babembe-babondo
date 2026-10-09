import React from "react";
import { Mic, Plus, Square } from "lucide-react";
import { timeLabel } from "@/lib/rapBeat";

/**
 * The studio's own microphone, standing right where the work is: one tap records your voice, the
 * same tap stops it, and the plus lays another voice on top — every recording keeps its own lane.
 * It stands beside the timeline's title and again inside the voice lane itself.
 */
export default function RapMicBar({ studio, off, showCount = false }) {
  const live = studio.recording;

  return (
    <div className="rap-mic">
      <button
        type="button"
        className={`rap-mic-btn ${live ? "is-live" : ""}`}
        aria-label={live ? "Simamisha rekodi" : "Rekodi sauti yako"}
        title={live ? "Simamisha rekodi" : "Rekodi sauti yako"}
        onClick={live ? studio.stopRecording : studio.startRecording}
        disabled={!live && off}
      >
        {live ? <Square /> : <Mic />}
      </button>

      <button
        type="button"
        className="rap-mic-btn"
        aria-label="Ongeza sauti mpya"
        title="Ongeza sauti mpya"
        onClick={studio.startRecording}
        disabled={live || off}
      >
        <Plus />
      </button>

      {live ? <span className="rap-mic-time">{timeLabel(studio.seconds)}</span> : null}
      {!live && showCount ? (
        <span className="rap-mic-count">
          {studio.tracks.length}/{studio.max}
        </span>
      ) : null}
    </div>
  );
}