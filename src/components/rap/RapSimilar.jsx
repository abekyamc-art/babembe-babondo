import React from "react";
import { Wand2 } from "lucide-react";
import { BEAT_STYLES } from "@/lib/rapBeat";

/** Base44 AI's own beat engine laying down a similar beat: at the tempo the song was
 *  measured at, in the style the person picks, and kept for later takes. */
export default function RapSimilar({ style, bpm, busy, onStyle, onBuild }) {
  return (
    <section className="rap-card">
      <div className="rap-card-head">
        <span className="rap-label">Beat kama huu</span>
        <span className="rap-hint">{bpm} BPM</span>
      </div>

      <p className="rap-hint">
        Base44 AI hupima mwendo wa wimbo wako, kisha hujitengenezea beat kama huo kwa injini
        yake yenyewe.
      </p>

      <div className="rap-pills">
        {BEAT_STYLES.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`rap-pill ${style === option.id ? "is-active" : ""}`}
            disabled={busy}
            onClick={() => onStyle(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <button type="button" className="rap-cta rap-cta-ghost" disabled={busy} onClick={onBuild}>
        <Wand2 className="mr-2 inline h-4 w-4 align-[-3px]" />
        Beat kama huu
      </button>
    </section>
  );
}