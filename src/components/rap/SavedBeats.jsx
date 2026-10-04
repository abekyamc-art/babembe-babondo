import React from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import BeatPlay from "@/components/rap/BeatPlay";
import { styleLabel } from "@/lib/rapBeat";

/** The beats Base44 AI built and kept: heard again, dropped onto a take, or let go. */
export default function SavedBeats({ beats, activeUri, busy, onUse, onRemove, loadBytes }) {
  return (
    <section className="rap-card">
      <span className="rap-label">Beats zangu</span>

      {(beats || []).length ? (
        beats.map((row) => {
          const active = !!row.file_uri && row.file_uri === activeUri;
          return (
            <div key={row.id} className="rap-history-row">
              <div className="rap-history-text">
                <p className="rap-history-title">{row.name}</p>
                <p className="rap-hint">
                  {styleLabel(row.style)} · {row.bpm} BPM
                </p>
              </div>
              <BeatPlay load={() => loadBytes(row)} busy={busy} />
              <button
                type="button"
                className="rap-tool"
                aria-label={active ? "Beat hii inatumika" : "Weka kwenye take"}
                aria-pressed={active}
                disabled={!!busy || active}
                onClick={() => onUse(row)}
              >
                {active ? <Check /> : <Plus />}
              </button>
              <button
                type="button"
                className="rap-tool"
                aria-label="Ondoa beat"
                disabled={!!busy}
                onClick={() => onRemove(row)}
              >
                <Trash2 />
              </button>
            </div>
          );
        })
      ) : (
        <p className="rap-hint">Hakuna beat iliyohifadhiwa bado.</p>
      )}
    </section>
  );
}