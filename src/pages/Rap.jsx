import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Coins } from "lucide-react";
import useRapStudio from "@/hooks/useRapStudio";
import useSongwriter from "@/hooks/useSongwriter";
import TypingDots from "@/components/voice/TypingDots";
import RapControls from "@/components/rap/RapControls";
import RapTempo from "@/components/rap/RapTempo";
import RapSessionPanel from "@/components/rap/RapSessionPanel";
import StudioTimeline from "@/components/rap/StudioTimeline";
import RapGenerate from "@/components/rap/RapGenerate";
import RapSteps from "@/components/rap/RapSteps";
import RapLyrics from "@/components/rap/RapLyrics";
import RapPlayer from "@/components/rap/RapPlayer";
import RapDownloads from "@/components/rap/RapDownloads";
import RapHistory from "@/components/rap/RapHistory";
import RapSong from "@/components/rap/RapSong";
import RapSimilar from "@/components/rap/RapSimilar";
import SavedBeats from "@/components/rap/SavedBeats";
import SongwriterPanel from "@/components/rap/SongwriterPanel";
import { Image } from "@/components/ui/image";
import { RAP_COST } from "@/lib/coins";
import "@/rap-studio.css";

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
            </div>

            <StudioTimeline
              beat={beat}
              savedBeats={studio.savedBeats}
              lines={lines}
              take={take}
              recording={songwriter.recording}
              seconds={songwriter.seconds}
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

          <div className="rap-panel">
            <RapSessionPanel
              settings={settings}
              words={studio.words?.length ?? null}
              busy={!!busy || !ready}
              onChange={studio.setSettings}
            />

            <SongwriterPanel songwriter={songwriter} ready={ready} />
          </div>
        </div>

        <div className="rap-lower">
          <div className="rap-col">
            <RapSong
              song={studio.song}
              beat={beat}
              note={studio.beatNote}
              busy={!!busy || !ready}
              onSend={studio.sendSong}
              onBeatOnly={studio.makeBeatOnly}
            />

            <RapSimilar
              style={studio.beatStyle}
              bpm={studio.song?.confident ? studio.song.bpm : settings.bpm}
              busy={!!busy || !ready}
              onStyle={studio.setBeatStyle}
              onBuild={studio.makeSimilarBeat}
            />

            {lines.length && !take ? (
              <button type="button" className="rap-cta" onClick={studio.makeVoice} disabled={!!busy}>
                Jaribu sauti tena · coins {RAP_COST}
              </button>
            ) : null}
          </div>

          <div className="rap-col">
            {take ? (
              <>
                <RapPlayer
                  buffer={take.buffer}
                  lines={lines}
                  kind={take.kind}
                  busy={!!busy}
                  onReTake={studio.makeVoice}
                />
                <RapDownloads
                  onAudio={studio.downloadAudio}
                  onMp3={studio.downloadMp3}
                  onVideo={studio.makeVideo}
                  onLyrics={studio.downloadLyrics}
                  mp3={!!take.mp3Url}
                  busyVideo={busy === "video"}
                />
              </>
            ) : null}

            <RapHistory takes={studio.takes} onReuse={studio.reuse} />

            <SavedBeats
              beats={studio.savedBeats}
              activeUri={beat?.file_uri || ""}
              busy={!!busy || !ready}
              onUse={studio.useSavedBeat}
              onRemove={studio.removeSavedBeat}
              loadBytes={studio.beatBytesOf}
            />
          </div>
        </div>
      </div>
    </div>
  );
}