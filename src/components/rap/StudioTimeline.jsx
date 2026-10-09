import React, { useState } from "react";
import RapTempo from "@/components/rap/RapTempo";
import StudioTransport from "@/components/rap/StudioTransport";
import TrackHead from "@/components/rap/TrackHead";
import ClipNudge from "@/components/rap/ClipNudge";
import TimelineClip from "@/components/rap/TimelineClip";
import { trackLength } from "@/lib/voiceTracks";

// how wide one second of the session is drawn, and how far the ruler runs
const PPS = 22;
const LANE_SECONDS = 40;
const MARK_EVERY = 4;
// a bar of the rap is read as this much of the line
const BAR_SECONDS = 2;

const secondsOf = (value, fallback = 0) => {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : fallback;
};

/**
 * The session itself, drawn the way a multi-track studio is read: the beat, the bars that were
 * written, the take, and every voice of its own, each one a lane with its head pinned at the left
 * and its clips laid along the line. A clip is taken hold of where it stands and carried front or
 * back, nudged by the buttons that name its place, folded away with its lane, or left alone — and
 * all of it is done whether the session is playing or stopped.
 */
export default function StudioTimeline({
  beat,
  lines,
  take,
  recording,
  seconds,
  tracks,
  position,
  length,
  playing,
  busy,
  off,
  bpm,
  onBpm,
  onPlay,
  onPause,
  onStop,
  onSeek,
  mic,
  selectedId,
  onSelect,
  onStart,
  onNudge,
  onFold,
  onPatch,
  inspector,
}) {
  // the clip a hand is carrying right now, and the place on the line it has been carried to
  const [drag, setDrag] = useState(null);

  const selected = (tracks || []).find((track) => track.id === selectedId) || null;
  // where a clip stands: the place it was laid, or the place a hand has carried it to
  const held = (track) => (drag && drag.id === track.id ? drag.at : Math.max(0, Number(track.start || 0)));

  const clipOf = ({ key, name, seed, at, to, count, color }) => ({
    key,
    name,
    seed,
    count,
    left: Math.max(0, at) * PPS,
    width: Math.max(96, Math.max(0.6, to - at) * PPS),
    color,
  });

  // the beat, standing the whole length of the session
  const beatClips = beat?.name
    ? [clipOf({ key: "beat", name: beat.name, seed: beat.name, at: 0, to: length, count: 10 })]
    : [];

  // the bars that were written, section by section, each one where it is rapped on the line
  const sections = [];
  let at = 0;
  (lines || []).forEach((line) => {
    const name = line.section || "Bars";
    const found = sections.find((one) => one.name === name);
    if (found) found.count += 1;
    else sections.push({ name, count: 1, from: at });
    at += BAR_SECONDS;
  });
  const barClips = sections.map((one) =>
    clipOf({
      key: one.name,
      name: `${one.name} · ${one.count}`,
      seed: one.name,
      at: one.from,
      to: one.from + one.count * BAR_SECONDS,
      count: one.count + 4,
    })
  );

  // the voice: the take the studio made, and a recording still on the microphone
  const voiceClips = [];
  if (take) {
    voiceClips.push(
      clipOf({ key: "take", name: "Take yako", seed: "take", at: 0, to: secondsOf(take.seconds, length), count: 10 })
    );
  }
  if (recording) {
    voiceClips.push(
      clipOf({
        key: "rec",
        name: `Rekodi · ${Math.round(seconds || 0)}s`,
        seed: "rekodi",
        at: 0,
        to: secondsOf(seconds, 2),
        count: 6,
      })
    );
  }

  const rows = [
    { id: "beat", name: "Beat", hint: "Hakuna beat", clips: beatClips },
    { id: "bars", name: "Mistari", hint: "Hakuna mistari", clips: barClips },
    { id: "voice", name: "Sauti", hint: "Hakuna take bado", clips: voiceClips },
  ];

  // a lane of its own for every voice track, its clip standing where it was placed
  (tracks || []).forEach((track, index) => {
    const from = held(track);
    const span = trackLength(track);
    rows.push({
      id: track.id,
      name: track.name,
      track,
      clips: [
        clipOf({
          key: track.id,
          name: `${track.name}${track.semitones ? ` · ${track.semitones > 0 ? "+" : ""}${track.semitones}st` : ""}${
            track.muted ? " · M" : ""
          }${track.solo ? " · S" : ""}`,
          seed: track.id,
          at: from,
          to: from + span,
          count: Math.max(4, Math.round(span)),
          color: track.muted ? "#4d505d" : index % 2 ? "#15d8d0" : "#c7f400",
        }),
      ],
    });
  });

  const grab = (track) => (event) => {
    if (!onStart) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const from = Math.max(0, Number(track.start || 0));
    setDrag({ id: track.id, from, x: event.clientX, at: from });
    onSelect?.(track.id);
  };

  const slide = (event) => {
    setDrag((prev) =>
      prev ? { ...prev, at: Math.max(0, prev.from + (event.clientX - prev.x) / PPS) } : prev
    );
  };

  const drop = () => {
    if (drag) onStart?.(drag.id, drag.at);
    setDrag(null);
  };

  const seekAt = (event) => {
    if (!onSeek) return;
    const box = event.currentTarget.getBoundingClientRect();
    onSeek(Math.max(0, (event.clientX - box.left) / PPS));
  };

  const marks = [];
  for (let second = 0; second <= LANE_SECONDS; second += MARK_EVERY) marks.push(second);

  const playhead = <span className="rap-line-ph" style={{ left: position * PPS }} />;

  return (
    <div className="rap-ws">
      <div className="rap-ws-bar">
        <StudioTransport
          playing={playing}
          position={position}
          length={length}
          busy={busy}
          off={off}
          hasTracks={!!(tracks || []).length}
          onPlay={onPlay}
          onPause={onPause}
          onStop={onStop}
        />

        <div className="rap-ws-tools">
          <span className="rap-label">Mwendo (BPM)</span>
          <RapTempo bpm={bpm} busy={busy || off} onPick={onBpm} />
          {mic}
        </div>
      </div>

      <ClipNudge
        track={selected}
        busy={busy}
        onNudge={(delta) => selected && onNudge?.(selected.id, delta)}
        onClose={() => onSelect?.(null)}
      />

      <div className="rap-tl">
        <div className="rap-row is-ruler">
          <div className="rap-th rap-th-ruler">
            <span className="rap-th-name">Sekunde</span>
            <span className="rap-th-hint">Gusa hapa kuipeleka playhead</span>
          </div>
          <div className="rap-lane rap-lane-ruler" onPointerDown={seekAt}>
            {marks.map((second) => (
              <span key={second} className="rap-rk" style={{ left: second * PPS }}>
                {second}s
              </span>
            ))}
            {playhead}
          </div>
        </div>

        {rows.map((row) => {
          const folded = !!row.track?.collapsed;

          return (
            <div
              key={row.id}
              className={`rap-row ${folded ? "is-folded" : ""} ${drag?.id === row.id ? "is-moving" : ""}`}
            >
              <TrackHead
                name={row.name}
                hint={row.hint}
                track={row.track}
                busy={busy}
                onPatch={(changes) => onPatch?.(row.track.id, changes)}
                onFold={onFold}
              />

              <div className="rap-lane">
                {folded ? (
                  <span className="rap-trk-empty">{row.name} imefungwa</span>
                ) : (
                  row.clips.map((clip) => (
                    <TimelineClip
                      key={clip.key}
                      clip={clip}
                      draggable={!!row.track}
                      selected={!!row.track && selectedId === row.track.id}
                      dragging={drag?.id === row.id}
                      onGrab={row.track ? grab(row.track) : undefined}
                      onSlide={slide}
                      onDrop={drop}
                    />
                  ))
                )}

                {!folded && !row.clips.length ? (
                  <span className="rap-trk-empty">{row.hint}</span>
                ) : null}
                {playhead}
              </div>
            </div>
          );
        })}
      </div>

      {inspector}
    </div>
  );
}