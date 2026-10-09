import React from "react";
import Meter from "@/components/studio/Meter";
import { useStudioText } from "@/components/studio/StudioLangProvider";

/**
 * The mixer: a strip for every track, a strip for each of the two buses, and the master at the end.
 * Every level, every place across the stereo field and every quiet switch on the timeline is the very
 * same setting shown here — there is one mix, seen from two sides.
 */
export default function MixerPanel({ project, levels, selectedTrack, onSelectTrack, onPatchTrack, onPatchBus, onPatchMaster, onQuickMix, onQuickMaster }) {
  const { t } = useStudioText();
  const tracks = project?.tracks || [];
  const master = project?.master || {};
  const buses = project?.buses || {};
  const masterLevel = levels?.master || { rms: 0, peak: 0 };

  return (
    <section className="gs-panel">
      <div className="gs-panel-head">
        <span className="gs-label">{t("mixer")}</span>
        <div className="gs-chips">
          <button type="button" className="gs-chip is-tiny" onClick={onQuickMix}>
            {t("quickMix")}
          </button>
          <button type="button" className="gs-chip is-tiny" onClick={onQuickMaster}>
            {t("quickMaster")}
          </button>
        </div>
      </div>

      <div className="gs-strips">
        {tracks.map((track) => (
          <div key={track.id} className={`gs-strip${selectedTrack === track.id ? " is-on" : ""}`} style={{ "--gs-track": track.color }}>
            <button type="button" className="gs-strip-name" onClick={() => onSelectTrack(track.id)}>
              {track.name}
            </button>

            <div className="gs-fader-wrap">
              <input
                className="gs-fader"
                type="range"
                min="0"
                max="1.5"
                step="0.01"
                value={track.volume ?? 1}
                aria-label={`${track.name} — ${t("volume")}`}
                onChange={(event) => onPatchTrack(track.id, { volume: Number(event.target.value) })}
              />
              <Meter vertical rms={levels?.tracks?.[track.id]?.rms || 0} peak={levels?.tracks?.[track.id]?.peak || 0} />
            </div>

            <span className="gs-strip-val">{Math.round((track.volume ?? 1) * 100)}</span>

            <input
              className="gs-range is-tiny"
              type="range"
              min="-1"
              max="1"
              step="0.02"
              value={track.pan ?? 0}
              aria-label={`${track.name} — ${t("pan")}`}
              onChange={(event) => onPatchTrack(track.id, { pan: Number(event.target.value) })}
            />

            <div className="gs-strip-btns">
              <button
                type="button"
                className={`gs-mini${track.muted ? " is-on" : ""}`}
                onClick={() => onPatchTrack(track.id, { muted: !track.muted })}
                aria-label={t("mute")}
              >
                M
              </button>
              <button
                type="button"
                className={`gs-mini is-solo${track.soloed ? " is-on" : ""}`}
                onClick={() => onPatchTrack(track.id, { soloed: !track.soloed })}
                aria-label={t("solo")}
              >
                S
              </button>
            </div>
          </div>
        ))}

        {["vocal", "music"].map((key) => (
          <div key={key} className="gs-strip is-bus">
            <span className="gs-strip-name">{key === "vocal" ? t("vocalBus") : t("musicBus")}</span>
            <div className="gs-fader-wrap">
              <input
                className="gs-fader"
                type="range"
                min="0"
                max="1.5"
                step="0.01"
                value={buses?.[key]?.volume ?? 1}
                aria-label={key === "vocal" ? t("vocalBus") : t("musicBus")}
                onChange={(event) => onPatchBus(key, { volume: Number(event.target.value) })}
              />
            </div>
            <span className="gs-strip-val">{Math.round((buses?.[key]?.volume ?? 1) * 100)}</span>
            <div className="gs-strip-btns">
              <button
                type="button"
                className={`gs-mini${buses?.[key]?.muted ? " is-on" : ""}`}
                onClick={() => onPatchBus(key, { muted: !buses?.[key]?.muted })}
                aria-label={t("mute")}
              >
                M
              </button>
            </div>
          </div>
        ))}

        <div className="gs-strip is-master">
          <span className="gs-strip-name">{t("master")}</span>
          <div className="gs-fader-wrap">
            <input
              className="gs-fader"
              type="range"
              min="0"
              max="1.5"
              step="0.01"
              value={master.volume ?? 1}
              aria-label={t("master")}
              onChange={(event) => onPatchMaster({ volume: Number(event.target.value) })}
            />
            <Meter vertical rms={masterLevel.rms} peak={masterLevel.peak} />
          </div>
          <span className="gs-strip-val">{Math.round((master.volume ?? 1) * 100)}</span>

          <div className="gs-two is-tight">
            <input
              className="gs-range is-tiny"
              type="range"
              min="-6"
              max="6"
              step="0.5"
              value={master.eq_low ?? 0}
              aria-label={`${t("master")} low`}
              onChange={(event) => onPatchMaster({ eq_low: Number(event.target.value) })}
            />
            <input
              className="gs-range is-tiny"
              type="range"
              min="-6"
              max="6"
              step="0.5"
              value={master.eq_high ?? 0}
              aria-label={`${t("master")} high`}
              onChange={(event) => onPatchMaster({ eq_high: Number(event.target.value) })}
            />
          </div>

          <div className="gs-strip-btns">
            <button
              type="button"
              className={`gs-mini${master.comp ? " is-on" : ""}`}
              onClick={() => onPatchMaster({ comp: !master.comp })}
            >
              C
            </button>
            <button
              type="button"
              className={`gs-mini${master.limiter !== false ? " is-on" : ""}`}
              onClick={() => onPatchMaster({ limiter: master.limiter === false })}
            >
              L
            </button>
          </div>
        </div>
      </div>

      <p className="gs-note is-quiet">
        {masterLevel.peak >= 0.99 ? `${t("peak")}: ${t("clipping")} · ` : ""}
        {t("busesNote")} {t("sendsNote")}
      </p>
    </section>
  );
}