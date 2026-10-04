import React, { useRef } from "react";
import { Music4, Upload } from "lucide-react";
import BeatPlay from "@/components/rap/BeatPlay";

/** The song the person sends: read on the phone, its voice lifted out of the middle of the
 *  mix so the beat is left behind — free, straight away, and with ElevenLabs nowhere near it. */
export default function RapSong({ song, beat, note, busy, onSend, onBeatOnly }) {
  const fileRef = useRef(null);

  return (
    <section className="rap-card">
      <div className="rap-card-head">
        <span className="rap-label">Wimbo wako</span>
        {song?.bpm ? <span className="rap-hint">{song.bpm} BPM</span> : null}
      </div>

      <p className="rap-hint">
        Tuma wimbo wako — ElevenLabs hutenganisha sauti na beat, kisha beat pekee linabaki
        bila sauti yoyote ndani yake. Inaweza kuchukua muda kwa wimbo mrefu.
      </p>

      <button
        type="button"
        className="rap-cta rap-cta-ghost"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="mr-2 inline h-4 w-4 align-[-3px]" />
        {song ? "Chagua wimbo mwingine" : "Chagua wimbo"}
      </button>

      {song ? (
        <p className="rap-hint">
          <Music4 className="mr-1 inline h-3 w-3 align-[-2px]" />
          {song.name}
        </p>
      ) : null}

      <button type="button" className="rap-cta" disabled={busy || !song} onClick={onBeatOnly}>
        Acha beat pekee
      </button>

      {beat?.source ? (
        <div className="rap-history-row">
          <div className="rap-history-text">
            <p className="rap-history-title">{beat.name}</p>
            <p className="rap-hint">
              {beat.source === "song" ? "Beat pekee lililotenganishwa na AI" : "Imetengenezwa na studio"}
            </p>
          </div>
          <BeatPlay bytes={beat.bytes} busy={busy} />
        </div>
      ) : null}

      {note ? <p className="rap-hint">{note}</p> : null}

      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        className="rap-hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onSend(file);
        }}
      />
    </section>
  );
}