import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Coins } from "lucide-react";
import useRapStudio from "@/hooks/useRapStudio";
import TypingDots from "@/components/voice/TypingDots";
import RapControls from "@/components/rap/RapControls";
import RapLyrics from "@/components/rap/RapLyrics";
import RapPlayer from "@/components/rap/RapPlayer";
import RapDownloads from "@/components/rap/RapDownloads";
import RapHistory from "@/components/rap/RapHistory";
import { RAP_COST } from "@/lib/coins";

const BUSY_LABEL = {
  compose: "Base44 AI inatunga mistari…",
  voice: "Sauti ya kuimba inarusha mistari…",
  video: "Video inatengenezwa…",
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

      {lines.length ? (
        <RapLyrics
          lines={lines}
          wordsUsed={studio.wordsUsed}
          words={studio.words || []}
          onEdit={studio.editLine}
          onLock={studio.toggleLock}
        />
      ) : (
        <p className="rap-hint">
          Chagua mipangilio, kisha tunga mistari — Base44 AI hutunga rap kwa maneno ya Kibembe
          yaliyothibitishwa pekee, kila mstari na tafsiri yake ya Kiswahili.
        </p>
      )}

      <button
        type="button"
        className="rap-cta rap-cta-ghost"
        onClick={studio.compose}
        disabled={!!busy || !ready || !studio.words?.length}
      >
        {lines.length ? "Tunga upya mistari" : "Tunga mistari"}
      </button>

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
    </div>
  );
}