import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RefreshCw, RotateCcw } from "lucide-react";
import { playBuffer } from "@/lib/rapAudio";

function clock(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** The take itself: heard here, with its lines rising one after another as it runs. */
export default function RapPlayer({ buffer, lines, kind, busy, onReTake }) {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const stopRef = useRef(null);
  const bufferRef = useRef(buffer);
  bufferRef.current = buffer;

  const halt = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
  }, []);

  useEffect(() => () => halt(), [halt]);

  const begin = useCallback(() => {
    if (!bufferRef.current) return;
    stopRef.current?.();
    stopRef.current = playBuffer(bufferRef.current, {
      onTime: setTime,
      onEnd: () => {
        stopRef.current = null;
        setPlaying(false);
        setTime(0);
      },
    });
    setPlaying(true);
  }, []);

  const toggle = useCallback(() => {
    if (playing) {
      halt();
      setPlaying(false);
      setTime(0);
      return;
    }
    begin();
  }, [begin, halt, playing]);

  const duration = buffer?.duration || 0;
  const per = lines.length ? duration / lines.length : 0;
  const index = per ? Math.min(lines.length - 1, Math.floor(time / per)) : 0;
  const current = lines[index];
  const next = lines[index + 1];

  return (
    <section className="rap-card">
      <div className="rap-card-head">
        <span className="rap-label">Take yako</span>
        <span className="rap-hint">
          {kind === "song" ? "Imeimbwa na beat yake" : "Sauti juu ya beat uliyochagua"}
        </span>
      </div>

      <div className="rap-now">
        <p className="rap-now-line">{playing && current ? current.ebembe : "Bonyeza play uisikie"}</p>
        <p className="rap-now-next">
          {playing && current ? current.swahili : `${lines.length} bars · ${clock(duration)}`}
        </p>
        {playing && next ? <p className="rap-now-next">{next.ebembe}</p> : null}
      </div>

      <div className="rap-bar">
        <div
          className="rap-bar-fill"
          style={{ width: `${duration ? Math.min(100, (time / duration) * 100) : 0}%` }}
        />
      </div>

      <div className="rap-controls">
        <button
          type="button"
          className="rap-tool"
          onClick={toggle}
          aria-label={playing ? "Simamisha" : "Sikiliza"}
        >
          {playing ? <Pause /> : <Play />}
        </button>
        <button
          type="button"
          className="rap-tool"
          onClick={() => {
            setTime(0);
            begin();
          }}
          aria-label="Anza upya"
        >
          <RotateCcw />
        </button>
        <button
          type="button"
          className="rap-tool"
          onClick={() => {
            halt();
            setPlaying(false);
            setTime(0);
            onReTake?.();
          }}
          disabled={busy}
          aria-label="Re-take"
        >
          <RefreshCw />
        </button>
        <span className="rap-time">
          {clock(time)} / {clock(duration)}
        </span>
      </div>
    </section>
  );
}