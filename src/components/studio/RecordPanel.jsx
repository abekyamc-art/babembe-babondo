import React, { useEffect, useState } from "react";
import { AlertTriangle, Headphones, Loader2, Mic } from "lucide-react";
import Meter from "@/components/studio/Meter";
import { useStudioText } from "@/components/studio/StudioLangProvider";
import { estimateLatency } from "@/lib/studioEngine";
import { formatClock } from "@/lib/studioTracks";
import { extensionFor, pickMime } from "@/lib/studioRecorder";

/**
 * The recording side of the studio: how loud the voice is coming in, how hard it is being taken, what
 * the click is doing, and where the take will land. The recording itself is started from the transport,
 * where the artist's thumb already is.
 */
export default function RecordPanel({ recorder, armedTrack, position, countIn, onCountIn, metro, onMetro }) {
  const { t } = useStudioText();
  const [latency, setLatency] = useState(0);

  useEffect(() => {
    setLatency(estimateLatency());
  }, []);

  const clipping = recorder.level.peak >= 0.985 || (recorder.seconds > 0 && recorder.level.peak >= 0.99);
  const stateText =
    recorder.state === "counting"
      ? `${t("counting")} ${recorder.count}`
      : recorder.state === "recording"
        ? `${t("recording")} · ${formatClock(recorder.seconds)}`
        : recorder.state === "saving"
          ? t("saving")
          : null;

  return (
    <section className="gs-panel">
      <div className="gs-panel-head">
        <span className="gs-label">
          <Mic aria-hidden="true" /> {recorder_label(armedTrack, t)}
        </span>
        <span className="gs-chip is-tiny">
          {extensionFor(pickMime()).toUpperCase()} · {t("quality")} 48 kHz
        </span>
      </div>

      {armedTrack ? (
        <p className="gs-note">
          {armedTrack.name} · {t("startAt")} {formatClock(position)}
        </p>
      ) : (
        <p className="gs-warn">
          <AlertTriangle aria-hidden="true" /> {t("armFirst")}
        </p>
      )}

      <div className="gs-meter-row">
        <Meter rms={recorder.level.rms} peak={recorder.level.peak} wide />
        {stateText ? (
          <span className="gs-meter-state">
            <Loader2 className="gs-spin" aria-hidden="true" /> {stateText}
          </span>
        ) : (
          <span className="gs-meter-state">{t("tapToRecord")}</span>
        )}
      </div>

      {clipping ? (
        <p className="gs-warn is-hot">
          <AlertTriangle aria-hidden="true" /> {t("clipping")}
        </p>
      ) : null}

      <div className="gs-field">
        <span className="gs-label">
          {t("inputGain")} · {Math.round(recorder.gain * 100)}%
        </span>
        <input
          className="gs-range"
          type="range"
          min="0.2"
          max="3"
          step="0.05"
          value={recorder.gain}
          onChange={(event) => recorder.setGain(Number(event.target.value))}
        />
      </div>

      <div className="gs-chips">
        <button
          type="button"
          className={`gs-chip${recorder.monitor ? " is-on" : ""}`}
          onClick={() => recorder.setMonitor(!recorder.monitor)}
          aria-pressed={recorder.monitor}
        >
          <Headphones aria-hidden="true" /> {t("monitoring")}
        </button>
        <button
          type="button"
          className={`gs-chip${metro ? " is-on" : ""}`}
          onClick={() => onMetro(!metro)}
          aria-pressed={metro}
        >
          {t("metronome")}
        </button>
        {[0, 1, 2].map((bars) => (
          <button
            key={bars}
            type="button"
            className={`gs-chip${countIn === bars ? " is-on" : ""}`}
            onClick={() => onCountIn(bars)}
            aria-pressed={countIn === bars}
          >
            {t("countIn")} {bars}
          </button>
        ))}
      </div>

      {recorder.monitor ? <p className="gs-warn">{t("monitorWarn")}</p> : null}
      {armedTrack && !recorder.monitor ? <p className="gs-note is-quiet">{t("headphoneWarn")}</p> : null}
      {recorder.error ? <p className="gs-warn is-hot">{t(recorderErrorKey(recorder.error))}</p> : null}

      <p className="gs-note is-quiet">
        {t("latency")}: {latency} ms · {t("engineNote")}
      </p>
    </section>
  );
}

function recorder_label(track, t) {
  return track ? track.name : t("record");
}

function recorderErrorKey(code) {
  if (code === "denied") return "micDenied";
  if (code === "none") return "micNone";
  if (code === "busy") return "micBusy";
  if (code === "storage") return "exportFailed";
  return "micDenied";
}