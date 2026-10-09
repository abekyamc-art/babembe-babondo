import React from "react";
import { ArrowLeft, ArrowRight, Copy, Repeat, Scissors, Trash2 } from "lucide-react";
import StudioSheet from "@/components/studio/StudioSheet";
import { useStudioText } from "@/components/studio/StudioLangProvider";
import { formatClock } from "@/lib/studioTracks";

/**
 * One clip, everything that can be done to it: cut, trimmed, moved, copied, faded, lifted — and never
 * a single change to the recording the clip plays.
 */
export default function ClipInspector({ clip, track, snap, position, onClose, onPatch, onSplit, onDuplicate, onDelete }) {
  const { t } = useStudioText();
  if (!clip || !track) return null;

  const step = snap ? snap(1) : 0.1;
  const nudge = (field, delta) => onPatch({ [field]: Math.max(0, (clip[field] || 0) + delta) });

  return (
    <StudioSheet open title={clip.name || track.name} onClose={onClose} tall>
      <p className="gs-note">
        {track.name} · {t("startAt")} {formatClock(clip.start)} · {t("clipLength")} {formatClock(clip.duration)}
      </p>

      <div className="gs-field">
        <span className="gs-label">{t("name")}</span>
        <input className="gs-input" value={clip.name || ""} placeholder={track.name} onChange={(event) => onPatch({ name: event.target.value })} />
      </div>

      <div className="gs-field">
        <span className="gs-label">{t("startAt")}</span>
        <div className="gs-nudge">
          <button type="button" className="gs-btn" onClick={() => onPatch({ start: Math.max(0, clip.start - step) })}>
            <ArrowLeft aria-hidden="true" /> {t("nudgeLeft")}
          </button>
          <button type="button" className="gs-btn" onClick={() => onPatch({ start: clip.start + step })}>
            {t("nudgeRight")} <ArrowRight aria-hidden="true" />
          </button>
          <button type="button" className="gs-btn" onClick={() => onPatch({ start: Math.max(0, snap ? snap(position) : position) })}>
            {formatClock(position)}
          </button>
        </div>
      </div>

      <div className="gs-two">
        <div className="gs-field">
          <span className="gs-label">{t("trimStart")}</span>
          <div className="gs-nudge">
            <button type="button" className="gs-btn" onClick={() => onPatch({ offset: Math.max(0, clip.offset - step), duration: clip.duration + step, start: clip.start + step })}>
              <ArrowLeft aria-hidden="true" />
            </button>
            <button type="button" className="gs-btn" onClick={() => onPatch({ offset: clip.offset + step, duration: Math.max(0.1, clip.duration - step), start: clip.start - step })}>
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="gs-field">
          <span className="gs-label">{t("trimEnd")}</span>
          <div className="gs-nudge">
            <button type="button" className="gs-btn" onClick={() => onPatch({ duration: Math.max(0.1, clip.duration - step) })}>
              <ArrowLeft aria-hidden="true" />
            </button>
            <button type="button" className="gs-btn" onClick={() => onPatch({ duration: clip.duration + step })}>
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="gs-two">
        <div className="gs-field">
          <span className="gs-label">{t("fadeIn")}</span>
          <input
            className="gs-range"
            type="range"
            min="0"
            max={Math.max(0.2, clip.duration / 2)}
            step="0.05"
            value={clip.fade_in || 0}
            onChange={(event) => onPatch({ fade_in: Number(event.target.value) })}
          />
        </div>
        <div className="gs-field">
          <span className="gs-label">{t("fadeOut")}</span>
          <input
            className="gs-range"
            type="range"
            min="0"
            max={Math.max(0.2, clip.duration / 2)}
            step="0.05"
            value={clip.fade_out || 0}
            onChange={(event) => onPatch({ fade_out: Number(event.target.value) })}
          />
        </div>
      </div>

      <div className="gs-field">
        <span className="gs-label">
          {t("gain")} · {Math.round((clip.gain ?? 1) * 100)}%
        </span>
        <input
          className="gs-range"
          type="range"
          min="0"
          max="2"
          step="0.02"
          value={clip.gain ?? 1}
          onChange={(event) => onPatch({ gain: Number(event.target.value) })}
        />
      </div>

      <div className="gs-row-actions">
        <button type="button" className="gs-btn" onClick={onSplit}>
          <Scissors aria-hidden="true" /> {t("splitAtPlayhead")}
        </button>
        <button type="button" className="gs-btn" onClick={onDuplicate}>
          <Copy aria-hidden="true" /> {t("duplicate")}
        </button>
        <button
          type="button"
          className={`gs-btn${clip.looping ? " is-primary" : ""}`}
          onClick={() => onPatch({ looping: !clip.looping })}
        >
          <Repeat aria-hidden="true" /> {t("loopClip")}
        </button>
        <button type="button" className="gs-btn is-danger" onClick={onDelete}>
          <Trash2 aria-hidden="true" /> {t("deleteClip")}
        </button>
      </div>

      <p className="gs-note is-quiet">{t("cutNote")}</p>
    </StudioSheet>
  );
}

// the nudges above stay inside the timeline: nothing here ever writes over the recording itself
export function nudgeClip(clip, field, delta) {
  return { ...clip, [field]: Math.max(0, (Number(clip[field]) || 0) + delta) };
}