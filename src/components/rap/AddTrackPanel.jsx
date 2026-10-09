import React, { useEffect, useRef, useState } from "react";
import {
  Drum,
  FileAudio,
  LayoutGrid,
  ListMusic,
  Mic2,
  Plus,
  Sparkles,
  Square,
  Upload,
} from "lucide-react";
import BeatMaker from "@/components/rap/BeatMaker";
import SavedBeats from "@/components/rap/SavedBeats";
import { NO_MIC, clipToBuffer, startClipRecording } from "@/lib/clipRecorder";
import { wavBlob } from "@/lib/rapAudio";
import { nameForTrack } from "@/lib/voiceTracks";
import { timeLabel } from "@/lib/rapBeat";

/** The slots the one panel holds: the beat, the first two voices, and as many more as it takes. */
const SLOTS = [
  { id: "beat", label: "Beat", Icon: Drum },
  { id: "one", label: "Sauti 1", Icon: Mic2 },
  { id: "two", label: "Sauti 2", Icon: Mic2 },
  { id: "more", label: "+ Zaidi", Icon: Plus },
];

const ICON = "mr-2 inline h-4 w-4 align-[-3px]";

/**
 * The one panel everything is added from. The beat is brought in from the phone, recorded on the
 * spot as a sound of the person's own, built by Base44 AI, kept from the beats they already have, or
 * laid out by hand in the grid — and the voices follow one after another, lane by lane, until the
 * studio is full.
 */
export default function AddTrackPanel({ studio, voiceTracks, beatMaker, ready }) {
  const [slot, setSlot] = useState("beat");
  // which of the beat's own tools is open under its buttons
  const [tool, setTool] = useState("");
  // the mic open for a sound of the person's own, and the one keeping what it caught
  const [ke, setKe] = useState(false);
  const [keSeconds, setKeSeconds] = useState(0);
  const [keBusy, setKeBusy] = useState(false);
  const [error, setError] = useState("");
  const keRef = useRef(null);
  const keTimer = useRef(0);
  const beatFileRef = useRef(null);
  const voiceFileRef = useRef(null);

  const working = !!studio.busy || !ready;
  const full = voiceTracks.tracks.length >= voiceTracks.max;
  const voiceOff = !ready || !!voiceTracks.busy || full;
  const nextName = nameForTrack(voiceTracks.tracks.length + 1);

  // the mic and its clock are never left running once the panel is gone
  useEffect(
    () => () => {
      if (keTimer.current) clearInterval(keTimer.current);
      keRef.current?.cancel();
    },
    []
  );

  /** The sound of the person's own, caught on the spot and set as the beat. */
  const startKe = async () => {
    if (ke || keBusy || working) return;
    setError("");
    try {
      keRef.current = await startClipRecording();
    } catch (err) {
      setError(NO_MIC);
      return;
    }
    setKe(true);
    setKeSeconds(0);
    const at = Date.now();
    keTimer.current = window.setInterval(() => setKeSeconds((Date.now() - at) / 1000), 200);
  };

  const stopKe = async () => {
    if (keTimer.current) clearInterval(keTimer.current);
    keTimer.current = 0;
    const mic = keRef.current;
    keRef.current = null;
    setKe(false);
    if (!mic) return;
    setError("");
    setKeBusy(true);
    try {
      const buffer = await clipToBuffer(await mic.stop());
      const wav = wavBlob(buffer);
      await studio.setBeatFile(new File([wav], "Ke yangu.wav", { type: "audio/wav" }));
    } catch (err) {
      setError("Ke hii haikuweza kusomwa. Jaribu tena.");
    }
    setKeBusy(false);
  };

  const pickBeat = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) studio.setBeatFile(file);
  };

  const pickVoice = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) voiceTracks.importFile(file);
  };

  return (
    <section className="rap-card">
      <div className="rap-card-head">
        <span className="rap-label">Ongeza kwenye timeline</span>
        <span className="rap-chip">
          {voiceTracks.tracks.length}/{voiceTracks.max} sauti
        </span>
      </div>

      <div className="rap-pills">
        {SLOTS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`rap-pill ${slot === id ? "is-active" : ""}`}
            aria-pressed={slot === id}
            onClick={() => {
              setSlot(id);
              setTool("");
              setError("");
            }}
          >
            <Icon className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
            {label}
          </button>
        ))}
      </div>

      {slot === "beat" ? (
        <div className="rap-group">
          <span className="rap-label">Beat</span>

          <div className="rap-add-row">
            <button
              type="button"
              className="rap-cta rap-cta-ghost"
              onClick={() => beatFileRef.current?.click()}
              disabled={working}
            >
              <Upload className={ICON} />
              Beat kutoka simu
            </button>

            <button
              type="button"
              className={`rap-cta rap-cta-ghost ${ke ? "is-live" : ""}`}
              onClick={ke ? stopKe : startKe}
              disabled={(working && !ke) || keBusy}
            >
              {ke ? <Square className={ICON} /> : <Mic2 className={ICON} />}
              {ke ? `Simamisha · ${timeLabel(keSeconds)}` : "Rekodi ke"}
            </button>

            <button
              type="button"
              className="rap-cta rap-cta-ghost"
              onClick={studio.makeSimilarBeat}
              disabled={working}
            >
              <Sparkles className={ICON} />
              Beat ya AI
            </button>

            <button
              type="button"
              className={`rap-cta rap-cta-ghost ${tool === "saved" ? "is-live" : ""}`}
              onClick={() => setTool(tool === "saved" ? "" : "saved")}
            >
              <ListMusic className={ICON} />
              Beats zangu · {studio.savedBeats.length}
            </button>

            <button
              type="button"
              className={`rap-cta rap-cta-ghost ${tool === "grid" ? "is-live" : ""}`}
              onClick={() => setTool(tool === "grid" ? "" : "grid")}
              disabled={working && tool !== "grid"}
            >
              <LayoutGrid className={ICON} />
              Jenga kwa mkono
            </button>
          </div>

          <input
            ref={beatFileRef}
            type="file"
            accept="audio/*"
            className="rap-hidden"
            onChange={pickBeat}
          />

          <p className="rap-hint">
            {studio.beat?.name
              ? `Beat inayotumika sasa: ${studio.beat.name}`
              : "Hakuna beat bado — ipakie kutoka simu, irekodi, iombe kwa AI, au ijenge kwa mkono."}
          </p>
          {studio.beatNote ? <p className="rap-hint">{studio.beatNote}</p> : null}
          {error ? <p className="rap-note">{error}</p> : null}

          {tool === "saved" ? (
            <SavedBeats
              beats={studio.savedBeats}
              activeUri={studio.beat?.file_uri || ""}
              busy={working}
              onUse={studio.useSavedBeat}
              onRemove={studio.removeSavedBeat}
              loadBytes={studio.beatBytesOf}
            />
          ) : null}

          {tool === "grid" ? (
            <BeatMaker
              maker={beatMaker}
              bpm={studio.settings.bpm}
              ready={ready}
              onBpm={(next) => studio.setSettings({ ...studio.settings, bpm: next })}
            />
          ) : null}
        </div>
      ) : (
        <div className="rap-group">
          <span className="rap-label">
            {slot === "more" ? "Sauti nyingine" : SLOTS.find((one) => one.id === slot).label}
          </span>

          <div className="rap-add-row">
            <button
              type="button"
              className={`rap-cta rap-cta-ghost ${voiceTracks.recording ? "is-live" : ""}`}
              onClick={voiceTracks.recording ? voiceTracks.stopRecording : voiceTracks.startRecording}
              disabled={!voiceTracks.recording && voiceOff}
            >
              {voiceTracks.recording ? <Square className={ICON} /> : <Mic2 className={ICON} />}
              {voiceTracks.recording
                ? `Simamisha · ${timeLabel(voiceTracks.seconds)}`
                : "Rekodi sauti"}
            </button>

            <button
              type="button"
              className="rap-cta rap-cta-ghost"
              onClick={() => voiceFileRef.current?.click()}
              disabled={voiceOff}
            >
              <FileAudio className={ICON} />
              Pakia sauti
            </button>
          </div>

          <input
            ref={voiceFileRef}
            type="file"
            accept="audio/*"
            className="rap-hidden"
            onChange={pickVoice}
          />

          <p className="rap-hint">
            {full
              ? `Studio inabeba sauti ${voiceTracks.max} pekee — ondoa moja kwenye orodha ya sauti kwanza.`
              : `Itaingia kwenye lane yake kama ${nextName}, na kuonekana kwenye timeline mara moja.`}
          </p>
        </div>
      )}
    </section>
  );
}