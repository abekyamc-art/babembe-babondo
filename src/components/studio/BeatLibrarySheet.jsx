import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import StudioSheet from "@/components/studio/StudioSheet";
import { useStudioText } from "@/components/studio/StudioLangProvider";
import { formatClock } from "@/lib/studioTracks";

/** The beats the app has already made and saved, ready to be dropped onto a song. */
export default function BeatLibrarySheet({ open, onClose, onUse, busy = false }) {
  const { t } = useStudioText();
  const [beats, setBeats] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    base44.entities.SavedBeat
      .filter({}, { sort: "-created_date", limit: 50 })
      .then((page) => {
        if (alive) setBeats(page?.items || []);
      })
      .catch(() => setBeats([]))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open]);

  return (
    <StudioSheet open={open} onClose={onClose} title={t("beatLibrary")} tall>
      {loading ? (
        <p className="gs-note">
          <Loader2 className="gs-spin" aria-hidden="true" /> {t("loading")}
        </p>
      ) : null}

      {beats.length ? (
        <ul className="gs-beats">
          {beats.map((beat) => (
            <li key={beat.id}>
              <span className="gs-beat-text">
                <span className="gs-beat-name">{beat.name}</span>
                <span className="gs-beat-sub">
                  {beat.style} · {beat.bpm} BPM
                </span>
              </span>
              <button type="button" className="gs-btn is-tiny is-primary" onClick={() => onUse(beat)} disabled={busy}>
                {t("add")}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        !loading && <p className="gs-note is-quiet">{t("noBeats")}</p>
      )}

      {busy ? <p className="gs-note">{t("loading")}</p> : null}
    </StudioSheet>
  );
}