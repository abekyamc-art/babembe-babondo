import React from "react";
import { TAKES, barsFor } from "@/lib/rapBeat";
import { usesStore } from "@/lib/rapLanguage";
import StudioPills from "@/components/rap/StudioPills";

/** How long a take runs and what it is about: the two settings that decide what the studio writes,
 *  kept in the inspector beside the writing and the recording they belong to. */
export default function RapSessionPanel({ settings, words, busy, onChange }) {
  const pick = (key, value) => onChange({ ...settings, [key]: value });

  return (
    <section className="rap-card">
      <div className="rap-group">
        <span className="rap-label">Urefu wa take</span>
        <StudioPills
          options={TAKES}
          value={settings.seconds}
          busy={busy}
          onPick={(value) => pick("seconds", Number(value))}
        />
        <p className="rap-hint">{barsFor(settings.seconds, settings.bpm)} bars kwa mwendo huu.</p>
      </div>

      <div className="rap-group">
        <span className="rap-label">Mada</span>
        <input
          className="rap-input"
          value={settings.topic}
          placeholder="Mfano: maisha ya mjini, safari, shukrani"
          onChange={(event) => pick("topic", event.target.value)}
        />
        <p className="rap-hint">
          {!usesStore(settings.language)
            ? "Base44 AI huchagua maneno yenyewe kwa lugha hii."
            : words
              ? `Maneno ${words} yaliyothibitishwa yanapatikana kwa rap.`
              : "Maneno yanapakiwa…"}
        </p>
      </div>
    </section>
  );
}