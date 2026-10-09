import React, { useState } from "react";
import { ChevronDown, ChevronUp, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { useStudioText } from "@/components/studio/StudioLangProvider";
import { FX_BY_ID, FX_LIST, FX_PRESETS } from "@/lib/studioEffects";

/**
 * The effects on one track: the presets an artist reaches for first, one strength control over the
 * whole chain, and then every slot in the order it is heard — reorderable, bypassable, and shapable
 * under one fold. Effects the phone's own engine cannot run yet keep their place and say so.
 */
export default function EffectsPanel({ track, tracks = [], onSelectTrack, onApplyPreset, onAddFx, onPatchFx, onMoveFx, onRemoveFx, onStrength }) {
  const { t } = useStudioText();
  const [openId, setOpenId] = useState("");
  const chain = track?.fx || [];

  if (!track) {
    return (
      <section className="gs-panel">
        <div className="gs-panel-head">
          <span className="gs-label">{t("effects")}</span>
        </div>
        <p className="gs-note">{t("noTrack")}</p>
        <div className="gs-chips">
          {tracks.map((one) => (
            <button key={one.id} type="button" className="gs-chip" onClick={() => onSelectTrack(one.id)}>
              {one.name}
            </button>
          ))}
        </div>
      </section>
    );
  }

  const strength = chain.length ? Math.round((chain[0].amount ?? 1) * 100) : 100;

  return (
    <section className="gs-panel">
      <div className="gs-panel-head">
        <span className="gs-label" style={{ "--gs-track": track.color }}>
          <SlidersHorizontal aria-hidden="true" /> {track.name}
        </span>
        <span className="gs-chip is-tiny">{chain.length}</span>
      </div>

      <div className="gs-chips">
        {tracks.map((one) => (
          <button
            key={one.id}
            type="button"
            className={`gs-chip is-tiny${one.id === track.id ? " is-on" : ""}`}
            onClick={() => onSelectTrack(one.id)}
          >
            {one.name}
          </button>
        ))}
      </div>

      <div className="gs-field">
        <span className="gs-label">{t("presets")}</span>
        <div className="gs-chips">
          {FX_PRESETS.map((preset) => (
            <button key={preset.id} type="button" className="gs-chip" onClick={() => onApplyPreset(preset.id)}>
              {t(preset.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="gs-field">
        <span className="gs-label">
          {t("strength")} · {strength}%
        </span>
        <input
          className="gs-range"
          type="range"
          min="0"
          max="1.5"
          step="0.05"
          value={chain[0]?.amount ?? 1}
          onChange={(event) => onStrength(Number(event.target.value))}
        />
      </div>

      <div className="gs-field">
        <span className="gs-label">{t("chain")}</span>
        <ul className="gs-chain">
          {chain.map((slot, index) => {
            const info = FX_BY_ID[slot.type];
            const native = !!info?.native;
            return (
              <li key={slot.id} className={`gs-slot${slot.on === false || slot.bypass ? " is-off" : ""}`}>
                <div className="gs-slot-head">
                  <button
                    type="button"
                    className={`gs-mini${slot.on !== false && !slot.bypass ? " is-on" : ""}`}
                    onClick={() => onPatchFx(slot.id, { on: slot.on === false })}
                    aria-label={t("on")}
                  >
                    {index + 1}
                  </button>
                  <span className="gs-slot-name">{info?.label || slot.type}</span>
                  {native ? <span className="gs-chip is-tiny is-native">{t("needsNative")}</span> : null}
                  <button type="button" className="gs-icon is-sm" onClick={() => onMoveFx(slot.id, -1)} aria-label={t("moveUp")}>
                    <ChevronUp />
                  </button>
                  <button type="button" className="gs-icon is-sm" onClick={() => onMoveFx(slot.id, 1)} aria-label={t("moveDown")}>
                    <ChevronDown />
                  </button>
                  <button type="button" className="gs-icon is-sm is-danger" onClick={() => onRemoveFx(slot.id)} aria-label={t("remove")}>
                    <Trash2 />
                  </button>
                </div>

                <div className="gs-slot-tools">
                  <button type="button" className={`gs-chip is-tiny${slot.bypass ? " is-on" : ""}`} onClick={() => onPatchFx(slot.id, { bypass: !slot.bypass })}>
                    {t("bypass")}
                  </button>
                  {info?.insert ? null : (
                    <span className="gs-wet">
                      <span className="gs-label">{t("wetDry")}</span>
                      <input
                        className="gs-range is-tiny"
                        type="range"
                        min="0"
                        max="1"
                        step="0.02"
                        value={slot.wet ?? 0.3}
                        onChange={(event) => onPatchFx(slot.id, { wet: Number(event.target.value) })}
                      />
                    </span>
                  )}
                  <button type="button" className="gs-chip is-tiny" onClick={() => setOpenId(openId === slot.id ? "" : slot.id)}>
                    {t("advanced")}
                  </button>
                </div>

                {openId === slot.id ? (
                  <div className="gs-params">
                    {(info?.params || []).map((param) => (
                      <label key={param.key} className="gs-param">
                        <span className="gs-label">
                          {param.key} · {Math.round((slot.params?.[param.key] ?? param.def) * 100) / 100}
                          {param.unit}
                        </span>
                        <input
                          className="gs-range is-tiny"
                          type="range"
                          min={param.min}
                          max={param.max}
                          step={param.step}
                          value={slot.params?.[param.key] ?? param.def}
                          onChange={(event) =>
                            onPatchFx(slot.id, { params: { ...(slot.params || {}), [param.key]: Number(event.target.value) } })
                          }
                        />
                      </label>
                    ))}
                    {native ? <p className="gs-note is-quiet">{t("nativeNote")}</p> : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="gs-field">
        <span className="gs-label">{t("addEffect")}</span>
        <div className="gs-chips">
          {FX_LIST.map((one) => (
            <button key={one.id} type="button" className="gs-chip is-tiny" onClick={() => onAddFx(one.id)}>
              <Plus aria-hidden="true" /> {one.label}
            </button>
          ))}
        </div>
      </div>

      <p className="gs-note is-quiet">{t("nativeNote")}</p>
    </section>
  );
}