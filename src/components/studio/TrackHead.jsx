import React from "react";
import { Circle, Lock, Mic, Mic2, Music, SlidersHorizontal, Unlock, Volume2, Waves } from "lucide-react";
import { KIND_NAMES } from "@/lib/studioTracks";
import { useStudioText } from "@/components/studio/StudioLangProvider";

const KIND_ICON = {
  beat: Music,
  vocal: Mic,
  adlib: Mic2,
  harmony: Waves,
  instrument: Music,
  drums: Volume2,
  import: Music,
};

/**
 * The head of a track: what it is called, which colour it carries, whether it is armed to record, and
 * the four switches an artist reaches for with a thumb. Everything finer — the input, the level, the
 * place in the stereo field — stands in the mixer and in the track's own sheet.
 */
export default function TrackHead({ track, selected, level, onToggle, onOpen, onFx, onSelect }) {
  const { t, pick } = useStudioText();
  const Icon = KIND_ICON[track.kind] || Mic;

  return (
    <div className={`gs-head${selected ? " is-on" : ""}`} style={{ "--gs-track": track.color }}>
      <button type="button" className="gs-head-name" onClick={onOpen}>
        <Icon aria-hidden="true" />
        <span className="gs-head-title">{track.name}</span>
        <span className="gs-head-kind">{pick(KIND_NAMES[track.kind])}</span>
      </button>

      <div className="gs-head-tools">
        <button
          type="button"
          className={`gs-mini is-arm${track.armed ? " is-on" : ""}`}
          aria-label={t("armTrack")}
          aria-pressed={!!track.armed}
          onClick={() => onToggle("armed", !track.armed)}
        >
          <Circle aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`gs-mini${track.muted ? " is-on" : ""}`}
          aria-label={t("mute")}
          aria-pressed={!!track.muted}
          onClick={() => onToggle("muted", !track.muted)}
        >
          M
        </button>
        <button
          type="button"
          className={`gs-mini is-solo${track.soloed ? " is-on" : ""}`}
          aria-label={t("solo")}
          aria-pressed={!!track.soloed}
          onClick={() => onToggle("soloed", !track.soloed)}
        >
          S
        </button>
        <button
          type="button"
          className={`gs-mini${track.locked ? " is-on" : ""}`}
          aria-label={track.locked ? t("unlock") : t("lock")}
          aria-pressed={!!track.locked}
          onClick={() => onToggle("locked", !track.locked)}
        >
          {track.locked ? <Lock aria-hidden="true" /> : <Unlock aria-hidden="true" />}
        </button>
        <button type="button" className="gs-mini" aria-label={t("fx")} onClick={onFx}>
          <SlidersHorizontal aria-hidden="true" />
        </button>
      </div>

      <button type="button" className="gs-head-meter" onClick={onSelect} aria-label={track.name}>
        <span className="gs-head-meter-fill" style={{ width: `${Math.min(100, Math.round(level * 140))}%` }} />
      </button>
    </div>
  );
}