import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Coins } from "lucide-react";
import useRapStudio from "@/hooks/useRapStudio";
import useSongwriter from "@/hooks/useSongwriter";
import TypingDots from "@/components/voice/TypingDots";
import RapControls from "@/components/rap/RapControls";
import RapTempo from "@/components/rap/RapTempo";
import StudioTimeline from "@/components/rap/StudioTimeline";
import RapGenerate from "@/components/rap/RapGenerate";
import RapSteps from "@/components/rap/RapSteps";
import RapLyrics from "@/components/rap/RapLyrics";
import RapMicBar from "@/components/rap/RapMicBar";
import ClipInspector from "@/components/rap/ClipInspector";
import StudioAmbience from "@/components/rap/StudioAmbience";
import StudioDock from "@/components/rap/StudioDock";
import useVoiceTracks from "@/hooks/useVoiceTracks";
import useBeatMaker from "@/hooks/useBeatMaker";
import { Image } from "@/components/ui/image";
import "@/rap-studio.css";
import "@/rap-voice.css";

// the room the whole session stands in, laid across the head of the page
const HERO = "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/30575228d_generated_fa7f6bd9.jpg";

const BUSY_LABEL = {
  plan: "Base44 AI inapanga maneno…",
  write: "Base44 AI inaandika mistari…",
  video: "Video inatengenezwa…",
  read: "Wimbo wako unapimwa…",
  stems: "ElevenLabs inatenganisha sauti na beat…",
  strip: "Sauti inatolewa kwenye simu…",
  beat: "Base44 AI inatengeneza beat kama huo…",
};

export default function Rap() {
  const navigate = useNavigate();
  const studio = useRapStudio();
  // the songwriter: a whole song written out from one request, and the person's own voice on the beat
  const songwriter = useSongwriter({
    settings: studio.settings,
    beat: studio.beat,
    user: studio.user,
    onKeep: studio.keepRecording,
  });
  const { settings, lines, take, busy, error, beat } = studio;
  const ready = !!studio.user;
  // which of the studio's own sections is open under the timeline
  const [tab, setTab] = useState("song");
  const title = settings.topic?.trim() || lines[0]?.ebembe?.slice(0, 40) || "Take yangu";

  // the studio's own voice tracks — recorded on the spot, brought in as a file, or sung by a voice
  // the person made from their own clip — and the beat built by hand in the grid
  const voiceTracks = useVoiceTracks({
    settings,
    beat,
    title,
    onKeepMix: ({ audio_url, seconds }) =>
      studio.keepRecording({
        title,
        language: settings.language,
        lines,
        wordsUsed: studio.wordsUsed,
        seconds,
        audio_url,
      }),
  });

  // the piece that was taken hold of on the timeline, and everything that can be done to it
  const selectedTrack = voiceTracks.tracks.find((track) => track.id === voiceTracks.selectedId) || null;

  const beatMaker = useBeatMaker({
    bpm: settings.bpm,
    onUse: ({ bytes, name, bpm, style }) => studio.useMadeBeat(bytes, { name, bpm, style }),
  });
  // a generation run brings its own steps; every other job keeps the studio's running line
  const running = studio.steps.some((step) => step.state === "running");
  // the running line names the step the one tap is on: the words, the bars, then the voice
  const busyLabel =
    busy === "voice"
      ? settings.voice === "sing"
        ? "ElevenLabs inaimba mistari yako…"
        : "Sauti yake mwenyewe inasoma mistari yako…"
      : BUSY_LABEL[busy];

  // what the strip's bar is showing: the recording's own clock while a take is being performed, how
  // far a run has come while the studio is working, and nothing at all the rest of the time
  const done = studio.steps.filter((step) => step.state === "done").length;
  const progress = songwriter.recording
    ? Math.min(100, (songwriter.seconds / Math.max(1, settings.seconds)) * 100)
    : running && studio.steps.length
      ? Math.round((done / studio.steps.length) * 100)
      : null;

  return (
    <div className="rap-screen">
      <Image className="rap-hero" src={HERO} alt="Studio ya kurekodi yenye mwanga" fittingType="fill" />
      <div className="rap-scrim" aria-hidden="true" />

      <div className="rap-in">
        <div className="rap-head">
          <div>
            <span className="rap-eyebrow">Rap Studio</span>
            <h1 className="rap-title">Ebembe Rap</h1>
          </div>
          <button type="button" className="rap-back" aria-label="Rudi" onClick={() => navigate(-1)}>
            <ArrowLeft />
          </button>
        </div>

        <div className="rap-strip">
          <RapGenerate
            language={settings.language}
            hasWords={!!studio.words?.length}
            hasLines={!!lines.length}
            busy={busy}
            ready={ready}
            onGenerate={studio.generateRap}
          />
          <div className={`rap-bar ${progress === null ? "is-idle" : ""}`}>
            <div
              className="rap-bar-fill"
              style={progress === null ? undefined : { width: `${progress}%` }}
            />
          </div>
          {studio.shortOnCoins ? (
            <button type="button" className="rap-cta rap-cta-ghost" onClick={() => navigate("/markets")}>
              <Coins className="mr-2 inline h-4 w-4 align-[-3px]" />
              Pata coins
            </button>
          ) : null}
        </div>

        {busy && !running ? (
          <div className="rap-busy">
            <TypingDots />
            <span>{busyLabel || "Inafanya kazi…"}</span>
          </div>
        ) : null}

        {error ? <p className="rap-note">{error}</p> : null}

        <div className="rap-grid">
          <RapControls
            settings={settings}
            beatName={beat?.name || ""}
            busy={!!busy || !ready}
            onChange={studio.setSettings}
            onBeatFile={studio.setBeatFile}
          />

          <section className="rap-timeline">
            <div className="rap-tl-head">
              <span className="rap-label">Mwendo (BPM)</span>
              <RapTempo
                bpm={settings.bpm}
                busy={!!busy || !ready}
                onPick={(bpm) => studio.setSettings({ ...settings, bpm })}
              />
              <RapMicBar studio={voiceTracks} off={!ready || !!voiceTracks.busy} showCount />
            </div>

            <StudioTimeline
              beat={beat}
              savedBeats={studio.savedBeats}
              lines={lines}
              take={take}
              recording={songwriter.recording}
              seconds={songwriter.seconds}
              tracks={voiceTracks.tracks}
              voiceTools={<RapMicBar studio={voiceTracks} off={!ready || !!voiceTracks.busy} />}
              selectedId={voiceTracks.selectedId}
              onSelect={voiceTracks.select}
              onStart={voiceTracks.setStart}
              onFold={voiceTracks.toggleCollapsed}
              inspector={
                <ClipInspector
                  track={selectedTrack}
                  busy={voiceTracks.busy}
                  onStart={voiceTracks.setStart}
                  onNudge={(delta) => voiceTracks.nudge(selectedTrack.id, delta)}
                  onPatch={(changes) => voiceTracks.patch(selectedTrack.id, changes)}
                  onRemove={voiceTracks.remove}
                  onFold={voiceTracks.toggleCollapsed}
                  onClose={() => voiceTracks.select(null)}
                />
              }
            />

            <StudioAmbience
              value={voiceTracks.ambience}
              busy={!!voiceTracks.busy}
              onChange={voiceTracks.setAmbience}
            />

            <RapSteps
              steps={studio.steps}
              startedAt={studio.runStartedAt}
              endedAt={studio.runEndedAt}
              wordCount={studio.words?.length || 0}
            />

            {lines.length ? (
              <RapLyrics
                lines={lines}
                wordsUsed={studio.wordsUsed}
                words={studio.words || []}
                onEdit={studio.editLine}
                onLock={studio.toggleLock}
              />
            ) : null}
          </section>
        </div>

        <StudioDock
          studio={studio}
          songwriter={songwriter}
          voiceTracks={voiceTracks}
          beatMaker={beatMaker}
          ready={ready}
          tab={tab}
          onTab={setTab}
        />
      </div>
    </div>
  );
}