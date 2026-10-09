import React from "react";
import { Circle, SlidersHorizontal, Trash2 } from "lucide-react";
import StudioSheet from "@/components/studio/StudioSheet";
import { useStudioText } from "@/components/studio/StudioLangProvider";
import { KIND_NAMES, TRACK_COLORS, TRACK_KINDS } from "@/lib/studioTracks";

const INPUTS = ["mic", "usb", "bluetooth", "file", "none"];

/**
 * One track, everything about it: what it is called, what it carries, where its sound comes from, how
 * loud and where it stands — and the way to its effects.
 */
export default function TrackSheet({ open, track, onClose, onPatch, onOpenFx, onDelete }) {
  const { t, pick } = useStudioText();
  if (!track) return null;

  return (
    <StudioSheet open={open} onClose={onClose} title={track.name}>
      <label className="gs-field">
        <span className="gs-label">{t("trackName")}</span>
        <input className="gs-input" value={track.name} onChange={(event) => onPatch({ name: event.target.value })} />
      </label>

      <div className="gs-field">
        <span className="gs-label">{t("addTrack")}</span>
        <div className="gs-chips">
          {TRACK_KINDS.map((kind) => (
            <button
              key={kind.id}
              type="button"
              className={`gs-chip${kind.id === track.kind ? " is-on" : ""}`}
              style={{ "--gs-track": kind.color }}
              onClick={() => onPatch({ kind: kind.id })}
            >
              {pick(KIND_NAMES[kind.id])}
            </button>
          ))}
        </div>
      </div>

      <div className="gs-field">
        <span className="gs-label">{t("input")}</span>
        <div className="gs-chips">
          {INPUTS.map((one) => (
            <button
              key={one}
              type="button"
              className={`gs-chip${one === (track.input || "mic") ? " is-on" : ""}`}
              onClick={() => onPatch({ input: one })}
            >
              {t(`input${one.charAt(0).toUpperCase()}${one.slice(1)}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="gs-field">
        <span className="gs-label">{t("volume")}</span>
        <input
          className="gs-range"
          type="range"
          min="0"
          max="1.5"
          step="0.01"
          value={track.volume ?? 1}
          onChange={(event) => onPatch({ volume: Number(event.target.value) })}
        />
      </div>

      <div className="gs-field">
        <span className="gs-label">{t("pan")}</span>
        <input
          className="gs-range"
          type="range"
          min="-1"
          max="1"
          step="0.02"
          value={track.pan ?? 0}
          onChange={(event) => onPatch({ pan: Number(event.target.value) })}
        />
      </div>

      <div className="gs-field">
        <span className="gs-label">{t("pan")} · {t("settings")}</span>
        <div className="gs-chips">
          {TRACK_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`gs-swatch${color === track.color ? " is-on" : ""}`}
              style={{ background: color }}
              aria-label={color}
              onClick={() => onPatch({ color })}
            />
          ))}
        </div>
      </div>

      <div className="gs-row-actions">
        <button
          type="button"
          className={`gs-btn${track.armed ? " is-primary" : ""}`}
          onClick={() => onPatch({ armed: !track.armed })}
        >
          <Circle aria-hidden="true" /> {t("armTrack")}
        </button>
        <button type="button" className="gs-btn" onClick={onOpenFx}>
          <SlidersHorizontal aria-hidden="true" /> {t("fx")}
        </button>
        <button type="button" className="gs-btn is-danger" onClick={onDelete}>
          <Trash2 aria-hidden="true" /> {t("delete")}
        </button>
      </div>
    </StudioSheet>
  );
}