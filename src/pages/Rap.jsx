import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Coins } from "lucide-react";
import useRapStudio from "@/hooks/useRapStudio";
import TypingDots from "@/components/voice/TypingDots";
import RapControls from "@/components/rap/RapControls";
import RapPlan from "@/components/rap/RapPlan";
import RapIdeas from "@/components/rap/RapIdeas";
import RapLyrics from "@/components/rap/RapLyrics";
import RapPlayer from "@/components/rap/RapPlayer";
import RapDownloads from "@/components/rap/RapDownloads";
import RapHistory from "@/components/rap/RapHistory";
import RapSong from "@/components/rap/RapSong";
import RapSimilar from "@/components/rap/RapSimilar";
import SavedBeats from "@/components/rap/SavedBeats";
import { RAP_COST } from "@/lib/coins";
import "@/rap-studio.css";

const BUSY_LABEL = {
  plan: "Base44 AI inapanga maneno na mawazo…",
  write: "Base44 AI inaandika wazo lako mistari kwa mistari…",
  voice: "ElevenLabs inaimba mistari yako…",
  video: "Video inatengenezwa…",
  read: "Wimbo wako unapimwa…",
  strip: "Sauti inatolewa katikati ya mchanganyiko…",
  beat: "Base44 AI inatengeneza beat kama huo…",
};

export default function Rap() {
  const navigate = useNavigate();
  const studio = useRapStudio();
  const { settings, lines, take, busy, error, beat } = studio;
  const ready = !!studio.user;

  return (
    <div className="rap-screen">
      <header className="rap-head">
        <div>
          <span className="rap-eyebrow">Rap Studio</span>
          <h1 className="rap-title">Ebembe Rap</h1>
        </div>
        <button type="button" className="account-icon" aria-label="Rudi" onClick={() => navigate(-1)}>
          <ArrowLeft />
        </button>
      </header>

      <RapControls
        settings={settings}
        words={studio.words?.length ?? null}
        beatName={beat?.name || ""}
        busy={!!busy || !ready}
        onChange={studio.setSettings}
        onBeatFile={studio.setBeatFile}
      />

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

      {busy ? (
        <div className="rap-busy">
          <TypingDots />
          <span>{BUSY_LABEL[busy] || "Inafanya kazi…"}</span>
        </div>
      ) : null}

      {error ? <p className="rap-note">{error}</p> : null}

      {studio.shortOnCoins ? (
        <button type="button" className="rap-cta rap-cta-ghost" onClick={() => navigate("/markets")}>
          <Coins className="mr-2 inline h-4 w-4 align-[-3px]" />
          Pata coins
        </button>
      ) : null}

      {!studio.ideas.length && !lines.length ? (
        <p className="rap-hint">
          Chagua mipangilio, kisha omba mawazo — Base44 AI hupanga maneno ya Kibembe
          yaliyothibitishwa kwanza, kisha hutoa mawazo matatu ya rap; chagua moja, mistari
          yake ichukuliwe na ElevenLabs.
        </p>
      ) : null}

      <RapPlan plan={studio.plan} />

      {studio.ideas.length ? (
        <RapIdeas
          ideas={studio.ideas}
          picked={studio.picked}
          busy={!!busy}
          onPick={studio.writeIdea}
        />
      ) : null}

      <button
        type="button"
        className="rap-cta rap-cta-ghost"
        onClick={studio.planIdeas}
        disabled={!!busy || !ready || !studio.words?.length}
      >
        {studio.ideas.length ? "Tunga mawazo mapya" : "Tunga mawazo"}
      </button>

      {lines.length ? (
        <RapLyrics
          lines={lines}
          wordsUsed={studio.wordsUsed}
          words={studio.words || []}
          onEdit={studio.editLine}
          onLock={studio.toggleLock}
        />
      ) : null}

      {lines.length ? (
        <button type="button" className="rap-cta" onClick={studio.makeVoice} disabled={!!busy}>
          Tengeneza sauti · coins {RAP_COST}
        </button>
      ) : null}

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
  );
}