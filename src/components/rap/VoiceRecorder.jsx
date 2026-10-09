import React from "react";
import { Download, Mic, Save, Square } from "lucide-react";
import { timeLabel } from "@/lib/rapBeat";

/**
 * The person's own voice: they perform the song into the microphone over the beat they chose, and
 * what they sang is what is kept. Nothing here is sung for them.
 */
export default function VoiceRecorder({
  recording,
  seconds,
  take,
  busy,
  kept,
  onStart,
  onStop,
  onDownload,
  onKeep,
}) {
  const working = busy === "mix" ? "Rekodi inasomwa…" : busy === "keep" ? "Inahifadhiwa…" : "";

  return (
    <section className="rap-card">
      <div className="rap-card-head">
        <span className="rap-label">Rekodi sauti yako</span>
        <span className="rap-hint">Beat uliyochagua juu</span>
      </div>

      <div className={`rap-rec ${recording ? "is-live" : ""}`}>
        <button
          type="button"
          className={`rap-tool ${recording ? "rap-tool-live" : ""}`}
          onClick={recording ? onStop : onStart}
          disabled={!recording && !!busy}
          aria-label={recording ? "Simamisha kurekodi" : "Anza kurekodi"}
        >
          {recording ? <Square /> : <Mic />}
        </button>
        <span className="rap-rec-time">
          {recording ? timeLabel(seconds) : take ? timeLabel(take.seconds) : "Sekunde 0"}
        </span>
        {recording ? <span className="rap-rec-dot" /> : null}
      </div>

      <p className="rap-hint">
        {recording
          ? "Inarekodi… imba mistari yako juu ya beat, kisha gusa kitufe kusimamisha."
          : working ||
            "Gusa kipaza sauti, kisha imba wimbo wako. Rekodi inasimama yenyewe mwisho wa urefu uliochagua juu."}
      </p>

      {take ? (
        <>
          <button type="button" className="rap-dl-row" onClick={onDownload} disabled={!!busy}>
            <span className="rap-dl-label">
              <Download className="h-4 w-4" />
              Rekodi yako (.wav)
            </span>
            <span className="rap-hint">Sauti yako juu ya beat</span>
          </button>

          <button type="button" className="rap-dl-row" onClick={onKeep} disabled={!!busy || kept}>
            <span className="rap-dl-label">
              <Save className="h-4 w-4" />
              Hifadhi kwenye takes zako
            </span>
            <span className="rap-hint">{kept ? "Imehifadhiwa" : "Inaonekana kwenye takes zako"}</span>
          </button>
        </>
      ) : null}
    </section>
  );
}