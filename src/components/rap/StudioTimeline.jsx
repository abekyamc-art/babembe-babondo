import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import TimelineClip from "@/components/rap/TimelineClip";
import { trackLength } from "@/lib/voiceTracks";

const SPANS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const LIME = "#c7f400";
const CYAN = "#15d8d0";
// how wide one second of a voice lane is drawn, and so how far a hand carries a clip
const TRACK_PPS = 20;

/** The clips of one lane, laid one after the other across it. */
function lay(clips) {
  let at = 20;
  return clips.map((clip, index) => {
    const width = Math.min(700, Math.max(120, 60 + clip.count * 34));
    const row = { ...clip, left: at, width, color: index % 2 ? CYAN : LIME };
    at += width + 16;
    return row;
  });
}

/**
 * The session laid out as a timeline: one lane for the beat, one for the bars that have been
 * written, one for the voice, and one for every sound of its own. A voice clip can be taken hold of
 * where it stands and carried along its lane, its lane can be folded down to a line, and the piece
 * that was taken hold of is handed to the controls below. Nothing is drawn here that the studio does
 * not already have.
 */
export default function StudioTimeline({
  beat,
  savedBeats,
  lines,
  take,
  recording,
  seconds,
  tracks,
  voiceTools,
  selectedId,
  onSelect,
  onStart,
  onFold,
  inspector,
}) {
  // the clip being carried by hand right now, and the place it has been carried to
  const [drag, setDrag] = useState(null);

  // the written bars, section by section, as the clip each part of the rap stands in
  const sections = [];
  (lines || []).forEach((line) => {
    const name = line.section || "Bars";
    const at = sections.findIndex((one) => one.name === name);
    if (at < 0) sections.push({ name, count: 1, seed: `${name}${line.ebembe || ""}` });
    else sections[at].count += 1;
  });

  const beatClips = beat?.name
    ? [{ key: "beat", name: beat.name, count: 6, seed: beat.name }]
    : (savedBeats || []).length
      ? [{ key: "saved", name: `${savedBeats.length} beats zangu`, count: 4, seed: "beats" }]
      : [];

  const voiceClips = [];
  if (take) voiceClips.push({ key: "take", name: "Take yako", count: 8, seed: take.kind || "take" });
  if (recording) {
    voiceClips.push({
      key: "rec",
      name: `Rekodi · ${Math.max(0, Math.round(seconds || 0))}s`,
      count: 5,
      seed: "rekodi",
    });
  }

  const lanes = [
    { id: "beat", name: "Beat", clips: lay(beatClips) },
    {
      id: "bars",
      name: "Mistari",
      clips: lay(
        sections.slice(0, 3).map((one) => ({
          key: one.name,
          name: `${one.name} · ${one.count}`,
          count: one.count,
          seed: one.seed,
        }))
      ),
    },
    { id: "voice", name: "Sauti", clips: lay(voiceClips) },
  ];

  // every voice track is a lane of its own, and its clip stands where it was laid — or, while it is
  // being carried, where the hand has taken it
  (tracks || []).forEach((track, index) => {
    const held = drag && drag.id === track.id ? drag.seconds : Math.max(0, Number(track.start || 0));
    const length = trackLength(track);
    const moved = track.semitones ? ` · ${track.semitones > 0 ? "+" : ""}${track.semitones}st` : "";
    lanes.push({
      id: track.id,
      name: track.name,
      track,
      carrying: drag?.id === track.id,
      clips: [
        {
          key: track.id,
          name: `${track.name}${moved}${track.muted ? " · M" : ""}${track.solo ? " · S" : ""}`,
          count: Math.max(3, Math.round(length)),
          seed: track.id,
          left: 20 + held * TRACK_PPS,
          width: Math.max(80, Math.min(740, Math.max(0.4, length) * TRACK_PPS)),
          color: track.muted ? "#4d505d" : index % 2 ? CYAN : LIME,
        },
      ],
    });
  });

  const grab = (track) => (event) => {
    if (!onStart) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const from = Math.max(0, Number(track.start || 0));
    setDrag({ id: track.id, from, x: event.clientX, seconds: from });
    onSelect?.(track.id);
  };

  const slide = (event) => {
    setDrag((prev) =>
      prev ? { ...prev, seconds: Math.max(0, prev.from + (event.clientX - prev.x) / TRACK_PPS) } : prev
    );
  };

  const drop = () => {
    if (drag) onStart?.(drag.id, drag.seconds);
    setDrag(null);
  };

  return (
    <>
      <div className="rap-ruler">
        {SPANS.map((span) => (
          <span key={span}>{span}</span>
        ))}
      </div>

      <div className="rap-lanes">
        {lanes.map((lane) => {
          const folded = !!lane.track?.collapsed;

          return (
            <div
              key={lane.id}
              className={`rap-trk ${folded ? "is-folded" : ""} ${lane.carrying ? "is-moving" : ""}`}
            >
              <span className="rap-trk-name">{lane.name}</span>

              {lane.id === "voice" && voiceTools ? <div className="rap-trk-tools">{voiceTools}</div> : null}

              {lane.track ? (
                <div className="rap-trk-tools">
                  <button
                    type="button"
                    className="rap-fold"
                    aria-label={folded ? `Fungua ${lane.name}` : `Funga ${lane.name}`}
                    aria-pressed={folded}
                    onClick={() => onFold?.(lane.track.id)}
                  >
                    {folded ? <ChevronDown /> : <ChevronUp />}
                  </button>
                </div>
              ) : null}

              {folded ? (
                <span className="rap-trk-empty">
                  {lane.name} · {trackLength(lane.track).toFixed(1)}s imefungwa
                </span>
              ) : (
                lane.clips.map((clip) => (
                  <TimelineClip
                    key={clip.key}
                    clip={clip}
                    draggable={!!lane.track}
                    selected={!!lane.track && selectedId === lane.track.id}
                    dragging={lane.carrying}
                    onGrab={lane.track ? grab(lane.track) : undefined}
                    onSlide={slide}
                    onDrop={drop}
                  />
                ))
              )}

              {!folded && !lane.clips.length ? <span className="rap-trk-empty">Bado hakuna kitu hapa</span> : null}

              <div className="rap-ph" />
            </div>
          );
        })}
      </div>

      {inspector}
    </>
  );
}