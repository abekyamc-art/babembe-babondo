import React, { useRef } from "react";
import { Upload } from "lucide-react";
import { BEAT_OPTIONS, FLOW_OPTIONS, LENGTHS, TEMPOS, VOICE_OPTIONS, flowOf } from "@/lib/rapBeat";

function Pills({ options, value, onPick, busy }) {
  return (
    <div className="rap-pills">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          disabled={busy}
          onClick={() => onPick(option.id)}
          className={`rap-pill ${value === option.id ? "is-active" : ""}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function RapControls({ settings, words, beatName, onChange, onBeatFile, busy }) {
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
        <Pills options={VOICE_OPTIONS} value={settings.voice} busy={busy} onPick={(id) => pick("voice", id)} />
      </div>

      <div className="rap-group">
        <span className="rap-label">Mtindo wa rap</span>
        <Pills options={FLOW_OPTIONS} value={settings.flow} busy={busy} onPick={pickFlow} />
        <p className="rap-hint">{flowOf(settings.flow).hint}</p>
      </div>

      <div className="rap-group">
        <span className="rap-label">Beat</span>
        <Pills options={BEAT_OPTIONS} value={settings.beat} busy={busy} onPick={pickBeat} />
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

      <div className="rap-group">
        <span className="rap-label">Mwendo (BPM)</span>
        <Pills
          options={TEMPOS.map((bpm) => ({ id: bpm, label: String(bpm) }))}
          value={settings.bpm}
          busy={busy}
          onPick={(value) => pick("bpm", Number(value))}
        />
      </div>

      <div className="rap-group">
        <span className="rap-label">Urefu (bars)</span>
        <Pills
          options={LENGTHS.map((bars) => ({ id: bars, label: `${bars} bars` }))}
          value={settings.bars}
          busy={busy}
          onPick={(value) => pick("bars", Number(value))}
        />
      </div>

      <div className="rap-group">
        <span className="rap-label">Mada</span>
        <input
          className="rap-input"
          value={settings.topic}
          placeholder="Mfano: maisha ya mjini, safari, shukrani"
          onChange={(event) => pick("topic", event.target.value)}
        />
        <p className="rap-hint">
          {words ? `Maneno ${words} yaliyothibitishwa yanapatikana kwa rap.` : "Maneno yanapakiwa…"}
        </p>
      </div>
    </section>
  );
}