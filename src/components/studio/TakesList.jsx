import React, { useEffect, useRef, useState } from "react";
import { Check, Music, Play, Square, Trash2 } from "lucide-react";
import { useStudioText } from "@/components/studio/StudioLangProvider";
import { previewBlob } from "@/lib/studioEngine";
import { getAudio } from "@/lib/studioStore";
import { formatClock } from "@/lib/studioTracks";

/**
 * Every take of a part, kept whether or not it stands on the timeline. One can be heard on its own,
 * put on the timeline, renamed, or thrown away — the others are never lost by choosing between them.
 */
export default function TakesList({ takes = [], onUse, onRename, onDelete, recording = false }) {
  const { t } = useStudioText();
  const [playingId, setPlayingId] = useState("");
  const stopRef = useRef(null);

  useEffect(
    () => () => {
      stopRef.current?.stop();
    },
    []
  );

  const audition = async (take) => {
    if (playingId === take.id) {
      stopRef.current?.stop();
      stopRef.current = null;
      setPlayingId("");
      return;
    }
    stopRef.current?.stop();
    try {
      const row = await getAudio(take.source_key);
      if (!row?.blob) return;
      const made = await previewBlob(row.blob, { onEnd: () => setPlayingId("") });
      stopRef.current = made;
      setPlayingId(take.id);
    } catch (err) {
      setPlayingId("");
    }
  };

  return (
    <section className="gs-panel">
      <div className="gs-panel-head">
        <span className="gs-label">
          <Music aria-hidden="true" /> {t("takes")}
        </span>
        <span className="gs-chip is-tiny">{takes.length}</span>
      </div>

      {recording ? <p className="gs-note">{t("recording")}…</p> : null}

      {takes.length ? (
        <ul className="gs-takes">
          {takes.map((take) => (
            <li key={take.id} className={`gs-take${playingId === take.id ? " is-on" : ""}`}>
              <button type="button" className="gs-icon is-sm" onClick={() => audition(take)} aria-label={t("audition")}>
                {playingId === take.id ? <Square /> : <Play />}
              </button>
              <input
                className="gs-take-name"
                value={take.name || ""}
                placeholder={`${t("take")} ${formatClock(take.seconds)}`}
                onChange={(event) => onRename(take.id, event.target.value)}
              />
              <span className={`gs-take-len${take.peak >= 0.99 ? " is-hot" : ""}`}>{formatClock(take.seconds)}</span>
              <button type="button" className="gs-icon is-sm is-go" onClick={() => onUse(take)} aria-label={t("useOnTimeline")}>
                <Check />
              </button>
              <button type="button" className="gs-icon is-sm is-danger" onClick={() => onDelete(take)} aria-label={t("delete")}>
                <Trash2 />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="gs-note is-quiet">{t("tapToRecord")}</p>
      )}
    </section>
  );
}