import React, { useRef } from "react";
import { Upload } from "lucide-react";
import { BEAT_OPTIONS, FLOW_OPTIONS, VOICE_OPTIONS, flowOf } from "@/lib/rapBeat";
import { LANGUAGE_OPTIONS, languageOf } from "@/lib/rapLanguage";
import StudioPills from "@/components/rap/StudioPills";

/** What the studio raps with: the voice, the language, the kind of rap and the beat — the four
 *  choices that colour everything the studio writes, kept in the column they are set from. */
export default function RapControls({ settings, beatName, onChange, onBeatFile, busy }) {
  const fileRef = useRef(null);
  const pick = (key, value) => onChange({ ...settings, [key]: value });

  // the kind of rap carries its own tempo, so the beat and the take follow it
  const pickFlow = (id) => onChange({ ...settings, flow: id, bpm: flowOf(id).bpm });

  const pickBeat = (id) => {
    if (id === "mine") {
      fileRef.current?.click();
      return;
    }
    pick("beat", id);
  };

  return (
    <section className="rap-card">
      <div className="rap-group">
        <span className="rap-label">Sauti</span>
        <StudioPills
          options={VOICE_OPTIONS}
          value={settings.voice}
          busy={busy}
          onPick={(id) => pick("voice", id)}
        />
      </div>

      <div className="rap-group">
        <span className="rap-label">Lugha</span>
        <StudioPills
          options={LANGUAGE_OPTIONS}
          value={settings.language}
          busy={busy}
          onPick={(id) => pick("language", id)}
        />
        <p className="rap-hint">{languageOf(settings.language).hint}</p>
      </div>

      <div className="rap-group">
        <span className="rap-label">Mtindo wa rap</span>
        <StudioPills options={FLOW_OPTIONS} value={settings.flow} busy={busy} onPick={pickFlow} />
        <p className="rap-hint">{flowOf(settings.flow).hint}</p>
      </div>

      <div className="rap-group">
        <span className="rap-label">Beat</span>
        <StudioPills options={BEAT_OPTIONS} value={settings.beat} busy={busy} onPick={pickBeat} />
        {beatName ? (
          <p className="rap-hint">
            <Upload className="mr-1 inline h-3 w-3 align-[-2px]" />
            {beatName}
          </p>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="rap-hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onBeatFile(file);
          }}
        />
      </div>
    </section>
  );
}