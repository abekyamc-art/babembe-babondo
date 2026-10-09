import React from "react";
import { Mic, Mic2, Music, Upload, Volume2, Waves } from "lucide-react";
import StudioSheet from "@/components/studio/StudioSheet";
import { useStudioText } from "@/components/studio/StudioLangProvider";
import { KIND_NAMES, MAX_TRACKS, TRACK_KINDS } from "@/lib/studioTracks";

const ICONS = { beat: Music, vocal: Mic, adlib: Mic2, harmony: Waves, instrument: Music, drums: Volume2, import: Upload };

/** Adding a track: one tap for each kind of track a song can carry. */
export default function AddTrackSheet({ open, onClose, onAdd, count = 0 }) {
  const { t, pick } = useStudioText();
  const full = count >= MAX_TRACKS;

  return (
    <StudioSheet open={open} onClose={onClose} title={t("addTrack")}>
      <p className="gs-note">
        {count}/{MAX_TRACKS} {t("tracksCount")}
      </p>
      <div className="gs-kinds">
        {TRACK_KINDS.map((kind) => {
          const Icon = ICONS[kind.id] || Music;
          return (
            <button
              key={kind.id}
              type="button"
              className="gs-kind"
              style={{ "--gs-track": kind.color }}
              disabled={full}
              onClick={() => onAdd(kind.id)}
            >
              <Icon aria-hidden="true" />
              <span>{pick(KIND_NAMES[kind.id])}</span>
            </button>
          );
        })}
      </div>
    </StudioSheet>
  );
}