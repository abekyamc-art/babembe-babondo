import React from "react";
import { trackLength } from "@/lib/voiceTracks";

const SPANS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const LIME = "#c7f400";
const CYAN = "#15d8d0";
// how wide one second of a voice lane is drawn
const TRACK_PPS = 20;

/**
 * The bars a clip stands on, read from the words the clip carries: the same clip always draws the
 * same shape. Nothing here is counted, stored or sent anywhere — it is how a clip looks.
 */
function barsOf(seed, count) {
  const text = String(seed || "clip");
  let hash = 0;
  for (let at = 0; at < text.length; at += 1) hash = (hash * 31 + text.charCodeAt(at)) % 9973;

  const bars = [];
  for (let at = 0; at < count; at += 1) {
    hash = (hash * 1103515245 + 12345) % 2147483648;
    bars.push(26 + (hash % 70));
  }
  return bars;
}

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
 * written, and one for the voice — each clip standing for the work it really holds, and a playhead
 * sweeping the lanes. Nothing is drawn here that the studio does not already have.
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
}) {
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

  // every voice track is a lane of its own: where it stands, how much of it is left after the cut,
  // and the pitch it was moved to
  const trackLanes = (tracks || []).slice(0, 6).map((track, index) => {
    const length = trackLength(track);
    const moved = track.semitones ? ` · ${track.semitones > 0 ? "+" : ""}${track.semitones}st` : "";
    return {
      id: track.id,
      name: track.name,
      clips: [
        {
          key: track.id,
          name: `${track.name}${moved}${track.muted ? " · M" : ""}${track.solo ? " · S" : ""}`,
          count: Math.max(3, Math.round(length)),
          seed: track.id,
          left: 20 + Math.max(0, track.start || 0) * TRACK_PPS,
          width: Math.max(80, Math.min(740, Math.max(0.4, length) * TRACK_PPS)),
          color: track.muted ? "#4d505d" : index % 2 ? CYAN : LIME,
        },
      ],
    };
  });

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
    ...trackLanes,
  ];

  return (
    <>
      <div className="rap-ruler">
        {SPANS.map((span) => (
          <span key={span}>{span}</span>
        ))}
      </div>

      <div className="rap-lanes">
        {lanes.map((lane) => (
          <div key={lane.id} className="rap-trk">
            <span className="rap-trk-name">{lane.name}</span>

            {lane.id === "voice" && voiceTools ? <div className="rap-trk-tools">{voiceTools}</div> : null}

            {lane.clips.map((clip) => (
              <div
                key={clip.key}
                className="rap-clip"
                style={{ left: clip.left, width: clip.width, background: clip.color }}
              >
                <span className="rap-clip-name">{clip.name}</span>
                {barsOf(clip.seed, Math.max(6, Math.min(18, clip.count + 4))).map((height, index) => (
                  <i key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
            ))}

            {lane.clips.length ? null : <span className="rap-trk-empty">Bado hakuna kitu hapa</span>}

            <div className="rap-ph" />
          </div>
        ))}
      </div>
    </>
  );
}