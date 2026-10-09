import React from "react";
import { Circle, Magnet, Pause, Play, Redo2, Repeat, Square, Timer, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { useStudioText } from "@/components/studio/StudioLangProvider";
import { formatBars, formatClock, SNAP_CHOICES } from "@/lib/studioTracks";

/** The transport: the clock, the play controls, and the big red circle that starts a take. */
export default function StudioTransport({
  project,
  position = 0,
  length = 0,
  playing,
  recording,
  armed,
  saving,
  savedAt,
  snap,
  zoom,
  metro,
  countIn,
  loopOn,
  onSnap,
  onZoom,
  onMetro,
  onCountIn,
  onLoop,
  onPlay,
  onStop,
  onRecord,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onBpm,
}) {
  const { t } = useStudioText();
  const saved = savedAt ? new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <section className="gs-transport">
      <div className="gs-tr-row">
        <div className="gs-tr-pos">
          <span className="gs-tr-bars">{formatBars(position, project?.bpm, project?.time_signature)}</span>
          <span className="gs-tr-clock">
            {formatClock(position)} / {formatClock(length)}
          </span>
        </div>

        <div className="gs-tr-bpm">
          <button type="button" className="gs-icon is-sm" onClick={() => onBpm(Math.max(40, (project?.bpm || 90) - 1))} aria-label="-">
            −
          </button>
          <span>{project?.bpm || 90}</span>
          <button type="button" className="gs-icon is-sm" onClick={() => onBpm(Math.min(240, (project?.bpm || 90) + 1))} aria-label="+">
            +
          </button>
        </div>

        <div className="gs-tr-tools">
          <button type="button" className="gs-icon is-sm" onClick={onUndo} disabled={!canUndo} aria-label="undo">
            <Undo2 />
          </button>
          <button type="button" className="gs-icon is-sm" onClick={onRedo} disabled={!canRedo} aria-label="redo">
            <Redo2 />
          </button>
        </div>
      </div>

      <div className="gs-tr-row is-main">
        <button type="button" className="gs-tr-play" onClick={playing ? onStop : onPlay} aria-label={playing ? t("pause") : t("play")}>
          {playing ? <Pause /> : <Play />}
        </button>
        <button type="button" className="gs-tr-stop" onClick={onStop} aria-label={t("stop")}>
          <Square />
        </button>
        <button
          type="button"
          className={`gs-tr-rec${recording ? " is-live" : ""}`}
          onClick={onRecord}
          disabled={!armed && !recording}
          aria-label={recording ? t("stopRecord") : t("record")}
        >
          <Circle />
        </button>
        <span className="gs-tr-state">
          {recording ? t("recording") : saving ? t("saving") : saved ? `${t("lastSaved")} ${saved}` : ""}
        </span>
      </div>

      <div className="gs-tr-row is-toggles">
        <button type="button" className={`gs-chip is-tiny${metro ? " is-on" : ""}`} onClick={onMetro} aria-pressed={!!metro}>
          <Timer aria-hidden="true" /> {t("metronome")}
        </button>
        <button type="button" className={`gs-chip is-tiny${countIn ? " is-on" : ""}`} onClick={() => onCountIn(countIn ? 0 : 1)} aria-pressed={!!countIn}>
          {t("countIn")} {countIn || 0}
        </button>
        <button type="button" className={`gs-chip is-tiny${loopOn ? " is-on" : ""}`} onClick={onLoop} aria-pressed={!!loopOn}>
          <Repeat aria-hidden="true" /> {t("loop")}
        </button>
        <button type="button" className={`gs-chip is-tiny${snap ? " is-on" : ""}`} onClick={() => onSnap(snap ? "" : "beat")} aria-pressed={!!snap}>
          <Magnet aria-hidden="true" /> {snap ? t("snap") : t("off")}
        </button>
        {snap ? (
          <span className="gs-seg">
            {SNAP_CHOICES.map((one) => (
              <button
                key={one.id}
                type="button"
                className={`gs-seg-item${snap === one.id ? " is-on" : ""}`}
                onClick={() => onSnap(one.id)}
              >
                {one.id === "bar" ? t("bars") : one.id === "beat" ? t("beat") : t("half")}
              </button>
            ))}
          </span>
        ) : null}
        <button type="button" className="gs-icon is-sm" onClick={() => onZoom(Math.max(16, zoom - 12))} aria-label={t("zoomOut")}>
          <ZoomOut />
        </button>
        <button type="button" className="gs-icon is-sm" onClick={() => onZoom(Math.min(260, zoom + 12))} aria-label={t("zoomIn")}>
          <ZoomIn />
        </button>
      </div>
    </section>
  );
}