import React from "react";
import { Download, FileText, Film } from "lucide-react";

/** Everything a finished take leaves behind. */
export default function RapDownloads({ onAudio, onMp3, onVideo, onLyrics, mp3, busyVideo }) {
  return (
    <section className="rap-card">
      <span className="rap-label">Pakua</span>

      <button type="button" className="rap-dl-row" onClick={onAudio}>
        <span className="rap-dl-label">
          <Download className="h-4 w-4" />
          Faili la sauti (.wav)
        </span>
        <span className="rap-hint">Take kamili</span>
      </button>

      {mp3 ? (
        <button type="button" className="rap-dl-row" onClick={onMp3}>
          <span className="rap-dl-label">
            <Download className="h-4 w-4" />
            Faili la sauti (.mp3)
          </span>
          <span className="rap-hint">Ile aliyoimba</span>
        </button>
      ) : null}

      <button type="button" className="rap-dl-row" onClick={onVideo} disabled={busyVideo}>
        <span className="rap-dl-label">
          <Film className="h-4 w-4" />
          Video ya reels (9:16)
        </span>
        <span className="rap-hint">{busyVideo ? "Inatengenezwa…" : "Maneno yanatembea"}</span>
      </button>

      <button type="button" className="rap-dl-row" onClick={onLyrics}>
        <span className="rap-dl-label">
          <FileText className="h-4 w-4" />
          Maneno na tafsiri (.txt)
        </span>
        <span className="rap-hint">Kibembe + Kiswahili</span>
      </button>
    </section>
  );
}