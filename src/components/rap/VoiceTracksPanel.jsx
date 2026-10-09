import React, { useState } from "react";
import { Disc3, Download, Save, Trash2 } from "lucide-react";
import StudioPills from "@/components/rap/StudioPills";
import VoiceTrackRow from "@/components/rap/VoiceTrackRow";
import { MODES, ROOTS, rootOf } from "@/lib/pitchShift";

/**
 * The studio's voice tracks: a lane for every voice, added with one tap, recorded on the spot or
 * brought in as a file, each one cut, turned up or down and moved into the key. What the lanes hold
 * is heard together over the beat, and kept as one take.
 */
export default function VoiceTracksPanel({ studio, ready }) {
  const [root, setRoot] = useState("a");
  const [mode, setMode] = useState("minor");
  const pc = rootOf(root).pc;
  const off = !ready || !!studio.busy;

  return (
    <section className="rap-card">
      <div className="rap-card-head">
        <span className="rap-label">Sauti zangu</span>
        <span className="rap-chip">
          {studio.tracks.length}/{studio.max}
        </span>
      </div>

      <div className="rap-key">
        <span className="rap-label">Key ya autotune</span>
        <StudioPills options={ROOTS} value={root} busy={off} onPick={setRoot} />
        <StudioPills options={MODES} value={mode} busy={off} onPick={setMode} />
      </div>

      {studio.tracks.length ? (
        <ul className="rap-tracks">
          {studio.tracks.map((track) => (
            <VoiceTrackRow
              key={track.id}
              track={track}
              busy={studio.busy}
              onPatch={(changes) => studio.patch(track.id, changes)}
              onPitch={studio.setPitch}
              onAuto={(id) => studio.autoTune(id, pc, mode)}
              onRemove={studio.remove}
            />
          ))}
        </ul>
      ) : (
        <p className="rap-hint">
          Bado hakuna sauti. Kwenye paneli ya “Ongeza” chagua Sauti 1 kurekodi au kupakia faili la sauti
          — unaweza kuongeza hadi {studio.max}.
        </p>
      )}

      <div className="rap-mix-tools">
        <button
          type="button"
          className="rap-cta rap-cta-ghost"
          onClick={studio.saveMix}
          disabled={off || !studio.tracks.length}
        >
          <Save className="mr-2 inline h-4 w-4 align-[-3px]" />
          Hifadhi kama take
        </button>

        <button
          type="button"
          className="rap-dl-row rap-dl-inline"
          onClick={studio.downloadMix}
          disabled={off || !studio.tracks.length}
        >
          <span className="rap-dl-label">
            <Download className="h-4 w-4" />
            Pakua (.wav)
          </span>
        </button>

        {studio.tracks.length ? (
          <button type="button" className="rap-dl-row rap-dl-inline" onClick={studio.clearTracks} disabled={off}>
            <span className="rap-dl-label">
              <Trash2 className="h-4 w-4" />
              Ondoa zote
            </span>
          </button>
        ) : null}
      </div>

      {studio.note ? <p className="rap-hint">{studio.note}</p> : null}
      {studio.error ? <p className="rap-note">{studio.error}</p> : null}

      <p className="rap-hint">
        <Disc3 className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
        Kila sauti inakaa kwenye lane yake, ikakatwa na kusawazishwa kabla ya kupigwa juu ya beat.
        Kitufe cha play kilicho juu ya timeline kinapiga mchanganyiko wako — unaweza kuusimamisha na
        kuendelea pale ulipoachia.
      </p>
    </section>
  );
}