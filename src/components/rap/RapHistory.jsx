import React, { useRef, useState } from "react";
import { Film, Pause, Play, RotateCcw } from "lucide-react";
import { timeLabel } from "@/lib/rapBeat";
import { languageLabel } from "@/lib/rapLanguage";

/** The takes already made: heard again, taken up again, or opened as their video. */
export default function RapHistory({ takes, onReuse }) {
  const audioRef = useRef(null);
  const [playingId, setPlayingId] = useState("");

  const play = (take) => {
    if (playingId === take.id) {
      audioRef.current?.pause();
      setPlayingId("");
      return;
    }
    if (!audioRef.current || !take.audio_url) return;
    audioRef.current.src = take.audio_url;
    audioRef.current.play().catch(() => setPlayingId(""));
    setPlayingId(take.id);
  };

  return (
    <section className="rap-card">
      <span className="rap-label">Takes zangu</span>

      {(takes || []).length ? (
        takes.map((take) => (
          <div key={take.id} className="rap-history-row">
            <div className="rap-history-text">
              <p className="rap-history-title">{take.title || "Take"}</p>
              <p className="rap-hint">
                {take.bpm || 112} BPM ·{" "}
                {take.seconds ? timeLabel(take.seconds) : `${(take.ebembe_lines || []).length} bars`} ·{" "}
                {languageLabel(take.language)}
              </p>
            </div>
            <button
              type="button"
              className="rap-tool"
              aria-label={playingId === take.id ? "Simamisha" : "Sikiliza take"}
              onClick={() => play(take)}
            >
              {playingId === take.id ? <Pause /> : <Play />}
            </button>
            <button
              type="button"
              className="rap-tool"
              aria-label="Tumia mistari tena"
              onClick={() => onReuse(take)}
            >
              <RotateCcw />
            </button>
            {take.video_url ? (
              <a
                className="rap-tool"
                href={take.video_url}
                target="_blank"
                rel="noreferrer"
                aria-label="Fungua video"
              >
                <Film />
              </a>
            ) : null}
          </div>
        ))
      ) : (
        <p className="rap-hint">Hakuna take iliyohifadhiwa bado.</p>
      )}

      <audio ref={audioRef} className="rap-hidden" onEnded={() => setPlayingId("")} />
    </section>
  );
}