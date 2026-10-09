import React from "react";
import { ListMusic, Music2, Plus, SlidersHorizontal } from "lucide-react";
import RapSessionPanel from "@/components/rap/RapSessionPanel";
import RapPlayer from "@/components/rap/RapPlayer";
import RapDownloads from "@/components/rap/RapDownloads";
import RapHistory from "@/components/rap/RapHistory";
import RapSong from "@/components/rap/RapSong";
import RapSimilar from "@/components/rap/RapSimilar";
import SongwriterPanel from "@/components/rap/SongwriterPanel";
import RapControls from "@/components/rap/RapControls";
import AddTrackPanel from "@/components/rap/AddTrackPanel";
import VoiceTracksPanel from "@/components/rap/VoiceTracksPanel";
import ClonedVoicePanel from "@/components/rap/ClonedVoicePanel";
import { RAP_COST } from "@/lib/coins";
import { flowOf } from "@/lib/rapBeat";

/** The studio's own sections, one icon each, so nothing waits below the timeline. The first one
 *  stands first and opens by itself. */
export const STUDIO_TABS = [
  { id: "song", label: "Wimbo", Icon: Music2 },
  { id: "add", label: "Ongeza", Icon: Plus },
  { id: "takes", label: "Take", Icon: ListMusic },
  { id: "settings", label: "Mipangilio", Icon: SlidersHorizontal },
];

/**
 * Everything the studio makes, kept in one place under the timeline and reached from a row of
 * icons. Every section stays standing where it is, so work in progress — a lane being shaped, a
 * beat being built, a take being played — is never thrown away by switching to another one.
 */
export default function StudioDock({ studio, songwriter, voiceTracks, beatMaker, ready, tab, onTab }) {
  const { settings, lines, take, busy, beat } = studio;
  const working = !!busy || !ready;

  const panes = {
    song: (
      <div className="rap-dock-grid">
        <div className="rap-col">
          <SongwriterPanel songwriter={songwriter} ready={ready} />
        </div>

        <div className="rap-col">
          <RapSong
            song={studio.song}
            beat={beat}
            note={studio.beatNote}
            busy={working}
            onSend={studio.sendSong}
            onBeatOnly={studio.makeBeatOnly}
          />

          <RapSimilar
            style={studio.beatStyle}
            bpm={studio.song?.confident ? studio.song.bpm : settings.bpm}
            busy={working}
            onStyle={studio.setBeatStyle}
            onBuild={studio.makeSimilarBeat}
          />
        </div>
      </div>
    ),

    add: (
      <div className="rap-dock-grid">
        <div className="rap-col">
          <AddTrackPanel
            studio={studio}
            voiceTracks={voiceTracks}
            beatMaker={beatMaker}
            ready={ready}
          />
        </div>

        <div className="rap-col">
          <VoiceTracksPanel studio={voiceTracks} ready={ready} />

          <ClonedVoicePanel
            busy={working}
            ready={ready}
            lines={lines}
            language={settings.language}
            speed={flowOf(settings.flow)?.speed || 1}
            onAddSung={voiceTracks.addSung}
          />
        </div>
      </div>
    ),

    takes: (
      <div className="rap-dock-grid">
        <div className="rap-col">
          {lines.length && !take ? (
            <button type="button" className="rap-cta" onClick={studio.makeVoice} disabled={!!busy}>
              Jaribu sauti tena · coins {RAP_COST}
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
          ) : (
            <p className="rap-hint">
              Take yako, na kila kitu unachoweza kufanya nayo, kitaonekana hapa.
            </p>
          )}
        </div>

        <div className="rap-col">
          <RapHistory takes={studio.takes} onReuse={studio.reuse} />
        </div>
      </div>
    ),

    settings: (
      <div className="rap-dock-one">
        <RapControls
          settings={settings}
          beatName={beat?.name || ""}
          busy={working}
          onChange={studio.setSettings}
          onBeatFile={studio.setBeatFile}
        />

        <RapSessionPanel
          settings={settings}
          words={studio.words?.length ?? null}
          busy={working}
          onChange={studio.setSettings}
        />
      </div>
    ),
  };

  return (
    <section className="rap-dock">
      <div className="rap-dock-bar" role="tablist" aria-label="Sehemu za studio">
        {STUDIO_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-label={label}
            className={`rap-dock-tab ${tab === id ? "is-active" : ""}`}
            onClick={() => onTab(id)}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {STUDIO_TABS.map(({ id, label }) => (
        <div key={id} className="rap-dock-pane" role="tabpanel" aria-label={label} hidden={tab !== id}>
          {panes[id]}
        </div>
      ))}
    </section>
  );
}