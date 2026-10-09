import React from "react";
import { Download } from "lucide-react";
import { languageLabel } from "@/lib/rapLanguage";
import { saveBlob, slug } from "@/lib/rapLines";
import { songText } from "@/lib/songwriter";

/** The written song, part by part: the lead lines as they are sung, and — set in beneath each of
 *  them — the answers the voice behind the lead sings back. */
export default function SongSheet({ song }) {
  if (!song) return null;

  return (
    <section className="rap-card">
      <div className="rap-card-head">
        <span className="rap-label">Wimbo ulioandikwa</span>
        <span className="rap-hint">{languageLabel(song.language)}</span>
      </div>

      <p className="rap-song-title">{song.title}</p>

      {(song.sections || []).map((section) => (
        <div key={section.name} className="rap-song-part">
          <span className="rap-section">{section.name}</span>
          {(section.lines || []).map((line, index) => (
            <div
              key={`${section.name}-${index}`}
              className={`rap-song-line ${line.kind === "back" ? "is-back" : ""}`}
            >
              <p className="rap-song-text">
                {line.kind === "back" ? <span className="rap-song-tag">BACK</span> : null}
                {line.text}
              </p>
              {line.meaning ? <p className="rap-song-meaning">{line.meaning}</p> : null}
            </div>
          ))}
        </div>
      ))}

      {song.wordsUsed?.length ? (
        <p className="rap-hint">Maneno ya Kibembe yaliyotumika: {song.wordsUsed.join(" · ")}</p>
      ) : null}

      <button
        type="button"
        className="rap-dl-row"
        onClick={() =>
          saveBlob(new Blob([songText(song)], { type: "text/plain" }), `${slug(song.title)}-wimbo.txt`)
        }
      >
        <span className="rap-dl-label">
          <Download className="h-4 w-4" />
          Maneno ya wimbo (.txt)
        </span>
        <span className="rap-hint">Parts, mistari na back vocals</span>
      </button>
    </section>
  );
}