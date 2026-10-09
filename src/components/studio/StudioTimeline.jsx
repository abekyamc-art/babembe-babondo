import React, { useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import TrackHead from "@/components/studio/TrackHead";
import TimelineClip from "@/components/studio/TimelineClip";
import { useStudioText } from "@/components/studio/StudioLangProvider";
import { barsOf, clipEnd, formatBars } from "@/lib/studioTracks";

const MIN_SPAN = 45;

/**
 * The timeline: the tracks down the side, their clips across the top, and the playhead following the
 * song. The heads and the lanes are two columns of one vertical scroll, and the ruler is kept in step
 * with the lanes by hand, so a long song can be moved in both directions with one thumb.
 */
export default function StudioTimeline({
  project,
  buffers,
  pxPerSec,
  position,
  playing,
  selectedClip,
  onSeek,
  onSelectClip,
  onMoveClip,
  onToggleTrack,
  onOpenTrack,
  onFxTrack,
  onAddTrack,
  onSelectTrack,
  trackLevels = {},
}) {
  const { t } = useStudioText();
  const lanes = useRef(null);
  const ruler = useRef(null);
  const heads = useRef(null);

  const tracks = project?.tracks || [];
  const span = Math.max(MIN_SPAN, (project?.duration || 0) + 12);
  const width = Math.ceil(span * pxPerSec);
  const beatsPerBar = Number(String(project?.time_signature || "4/4").split("/")[0]) || 4;
  const barPx = Math.max(12, ((60 / (project?.bpm || 90)) * beatsPerBar) * pxPerSec);
  const bars = Math.ceil(span / ((60 / (project?.bpm || 90)) * beatsPerBar));

  const keepInStep = () => {
    if (ruler.current && lanes.current) ruler.current.scrollLeft = lanes.current.scrollLeft;
    if (heads.current && lanes.current) heads.current.scrollTop = lanes.current.scrollTop;
  };

  // the song opens on the playhead rather than at the top of the song
  useEffect(() => {
    keepInStep();
  });

  const scrub = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    onSeek(Math.max(0, (event.clientX - box.left) / pxPerSec));
  };

  return (
    <section className="gs-tl">
      <div className="gs-tl-top">
        <div className="gs-tl-corner">
          <span>{t("tracks")}</span>
          <button type="button" className="gs-icon is-sm" onClick={onAddTrack} aria-label={t("addTrack")}>
            <Plus />
          </button>
        </div>
        <div className="gs-ruler-scroll" ref={ruler}>
          <div className="gs-ruler" style={{ width: `${width}px` }} onPointerDown={scrub}>
            {Array.from({ length: bars }, (_, index) => (
              <span key={index} className="gs-ruler-bar" style={{ left: `${index * barPx}px`, width: `${barPx}px` }}>
                {index + 1}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="gs-tl-mid">
        <div className="gs-tl-heads" ref={heads}>
          {tracks.map((track) => (
            <TrackHead
              key={track.id}
              track={track}
              selected={!!selectedClip && selectedClip.trackId === track.id}
              level={trackLevels[track.id]?.rms || 0}
              onToggle={(field, value) => onToggleTrack(track.id, field, value)}
              onSelect={() => onSelectTrack(track.id)}
              onOpen={() => onOpenTrack(track.id)}
              onFx={() => onFxTrack(track.id)}
            />
          ))}
          {tracks.length ? null : <div className="gs-head-empty">{t("addTrack")}</div>}
        </div>

        <div className="gs-lane-scroll" ref={lanes} onScroll={keepInStep}>
          <div className="gs-lanes" style={{ width: `${width}px`, backgroundSize: `${barPx}px 100%` }}>
            {tracks.map((track) => (
              <div key={track.id} className="gs-lane" onPointerDown={scrub}>
                {track.clips.map((clip) => (
                  <TimelineClip
                    key={clip.id}
                    clip={clip}
                    track={track}
                    buffer={buffers?.[clip.source_key] || null}
                    selected={selectedClip?.clipId === clip.id}
                    pxPerSec={pxPerSec}
                    snap={(seconds) => seconds}
                    onSelect={(clipId) => onSelectClip(track.id, clipId)}
                    onMove={(clipId, start) => onMoveClip(track.id, clipId, start)}
                  />
                ))}
              </div>
            ))}
            {tracks.length ? null : <div className="gs-lane-empty" onPointerDown={scrub}>{t("noClips")}</div>}
            <div className={`gs-playhead${playing ? " is-live" : ""}`} style={{ left: `${position * pxPerSec}px` }}>
              <span className="gs-playhead-knob" />
            </div>
          </div>
        </div>
      </div>

      <div className="gs-tl-foot">
        <span>
          {formatBars(position, project?.bpm, project?.time_signature)} · {barsOf(position, project?.bpm, project?.time_signature).bar}
          {" / "}
          {bars}
        </span>
        <span>{Math.round(pxPerSec)} px/s</span>
      </div>
    </section>
  );
}