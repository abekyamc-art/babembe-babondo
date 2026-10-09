/**
 * What a track is and what can be done to it. Kept apart from the screen so the timeline, the mixer
 * and the export all count bars, snap clips and cut recordings the very same way.
 */

export const TRACK_KINDS = [
  { id: "beat", labelKey: "fxBeat", color: "#F0B429", bus: "music" },
  { id: "vocal", labelKey: "record", color: "#4FC3F7", bus: "vocal" },
  { id: "adlib", labelKey: "fxAdlib", color: "#8B7CFF", bus: "vocal" },
  { id: "harmony", labelKey: "fxHarmony", color: "#2DD4BF", bus: "vocal" },
  { id: "instrument", labelKey: "inputFile", color: "#FF9F45", bus: "music" },
  { id: "drums", labelKey: "addBeat", color: "#E879F9", bus: "music" },
  { id: "import", labelKey: "importAudio", color: "#34D399", bus: "music" },
];

export const TRACK_COLORS = [
  "#F0B429", "#4FC3F7", "#FF6B8A", "#8B7CFF", "#4ADE80",
  "#FF9F45", "#2DD4BF", "#E879F9", "#60A5FA", "#FACC15",
];

export const SNAP_CHOICES = [
  { id: "bar", labelKey: "bars" },
  { id: "beat", labelKey: "beat" },
  { id: "half", labelKey: "half" },
];

export const TEMPLATES = [
  { id: "blank", labelKey: "tBlank", bpm: 90, key_root: "A", key_scale: "minor", kinds: [] },
  { id: "afro", labelKey: "tAfro", bpm: 102, key_root: "F", key_scale: "minor", kinds: ["beat", "vocal", "vocal", "adlib", "harmony"] },
  { id: "bongo", labelKey: "tBongo", bpm: 96, key_root: "C", key_scale: "minor", kinds: ["beat", "vocal", "adlib", "harmony"] },
  { id: "trap", labelKey: "tTrap", bpm: 140, key_root: "G", key_scale: "minor", kinds: ["beat", "vocal", "vocal", "adlib"] },
  { id: "acoustic", labelKey: "tAcoustic", bpm: 84, key_root: "D", key_scale: "major", kinds: ["instrument", "vocal", "harmony"] },
  { id: "voice", labelKey: "tVoice", bpm: 80, key_root: "A", key_scale: "minor", kinds: ["import", "vocal", "vocal"] },
];

export const TEMPLATE_NAMES = {
  blank: { sw: "Wimbo tupu", en: "Blank session" },
  afro: { sw: "Afrobeat", en: "Afrobeat" },
  bongo: { sw: "Bongo Flava", en: "Bongo Flava" },
  trap: { sw: "Trap / Hip hop", en: "Trap / Hip hop" },
  acoustic: { sw: "Akustiki", en: "Acoustic" },
  voice: { sw: "Sauti / podikasti", en: "Voice / podcast" },
};

export const KIND_NAMES = {
  beat: { sw: "Bit", en: "Beat" },
  vocal: { sw: "Sauti kuu", en: "Lead vocal" },
  adlib: { sw: "Ad-lib", en: "Ad-lib" },
  harmony: { sw: "Harmony", en: "Harmony" },
  instrument: { sw: "Instrument", en: "Instrument" },
  drums: { sw: "Drum pad", en: "Drum pad" },
  import: { sw: "Sauti kutoka simu", en: "Audio import" },
};

export const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const TIME_SIGNATURES = ["4/4", "3/4", "6/8"];

export const MAX_TRACKS = 24;

let seq = 0;
export function uid(prefix) {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}`;
}

export function kindInfo(kind) {
  return TRACK_KINDS.find((one) => one.id === kind) || TRACK_KINDS[1];
}

export function newTrack(kind, index = 0, name = "") {
  const info = kindInfo(kind);
  return {
    id: uid("trk"),
    name: name || `${KIND_NAMES[kind]?.en || "Track"} ${index + 1}`,
    kind,
    color: info.color || TRACK_COLORS[index % TRACK_COLORS.length],
    volume: 1,
    pan: 0,
    muted: false,
    soloed: false,
    locked: false,
    armed: false,
    input: kind === "import" || kind === "beat" ? "file" : "mic",
    bus: info.bus || "music",
    fx: startingChain(kind),
    clips: [],
  };
}

/** The chain a track begins with, so a voice is heard clearly and a mix never clips. */
export function startingChain(kind) {
  if (kind === "vocal" || kind === "adlib" || kind === "harmony") {
    return [
      { id: uid("fx"), type: "eq", order: 0, on: true, bypass: false, wet: 1, params: { low: -2, mid: 1, high: 2 } },
      { id: uid("fx"), type: "comp", order: 1, on: true, bypass: false, wet: 1, params: { threshold: -20, ratio: 3, attack: 0.01, release: 0.2, makeup: 3 } },
    ];
  }
  if (kind === "none") return [];
  return [
    { id: uid("fx"), type: "eq", order: 0, on: true, bypass: false, wet: 1, params: { low: 0, mid: 0, high: 1 } },
    { id: uid("fx"), type: "limiter", order: 1, on: true, bypass: false, wet: 1, params: { ceiling: -1 } },
  ];
}

export function newClip({ sourceKey, name, start = 0, offset = 0, duration = 0, takeId = "", looping = false }) {
  return {
    id: uid("clp"),
    name: name || "Clip",
    source_key: sourceKey,
    take_id: takeId,
    start: Math.max(0, Number(start) || 0),
    offset: Math.max(0, Number(offset) || 0),
    duration: Math.max(0.05, Number(duration) || 0.05),
    gain: 1,
    fade_in: 0,
    fade_out: 0,
    looping: !!looping,
  };
}

export function clipEnd(clip) {
  return (Number(clip.start) || 0) + (Number(clip.duration) || 0);
}

/** How long the song is: the furthest point anything on it reaches. */
export function projectDuration(project) {
  let end = 0;
  for (const track of project?.tracks || []) {
    for (const clip of track.clips || []) end = Math.max(end, clipEnd(clip));
  }
  for (const marker of project?.markers || []) end = Math.max(end, Number(marker.at) || 0);
  end = Math.max(end, Number(project?.loop_end) || 0);
  return Math.round(end * 100) / 100;
}

export function barsOf(seconds, bpm, signature) {
  const beatsPerBar = Number(String(signature || "4/4").split("/")[0]) || 4;
  const beats = (Number(seconds) || 0) * (Number(bpm) || 90) / 60;
  return { bar: Math.floor(beats / beatsPerBar) + 1, beat: Math.floor(beats % beatsPerBar) + 1 };
}

export function formatClock(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const min = Math.floor(total / 60);
  const sec = Math.floor(total % 60);
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export function formatBars(seconds, bpm, signature) {
  const { bar, beat } = barsOf(seconds, bpm, signature);
  return `${bar}.${beat}`;
}

export function formatSize(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function gridSeconds(bpm, snap) {
  const beat = 60 / Math.max(30, Number(bpm) || 90);
  if (snap === "bar") return beat * 4;
  if (snap === "half") return beat / 2;
  return beat;
}

export function snapTo(seconds, bpm, snap) {
  if (!snap) return Math.max(0, Number(seconds) || 0);
  const grid = gridSeconds(bpm, snap);
  return Math.max(0, Math.round((Number(seconds) || 0) / grid) * grid);
}

/** Every clip of one track, in the order it is heard. */
export function withClip(track, clipId, changes) {
  return {
    ...track,
    clips: (track.clips || []).map((clip) => (clip.id === clipId ? { ...clip, ...changes } : clip)),
  };
}

export function removeClip(track, clipId) {
  return { ...track, clips: (track.clips || []).filter((clip) => clip.id !== clipId) };
}

/**
 * A clip cut in two at a point on the timeline: what stands before it is trimmed to that point, and
 * what stands after it plays on from where it was cut. Nothing of the recording itself is lost —
 * both halves still point at the same take, one of them further in.
 */
export function splitClip(track, clipId, at) {
  return {
    ...track,
    clips: (track.clips || []).flatMap((clip) => {
      if (clip.id !== clipId) return [clip];
      const end = clipEnd(clip);
      if (at <= clip.start + 0.05 || at >= end - 0.05) return [clip];
      const left = { ...clip, duration: at - clip.start, fade_out: Math.min(clip.fade_out || 0, 0.05) };
      const right = {
        ...clip,
        id: uid("clp"),
        start: at,
        offset: (Number(clip.offset) || 0) + (at - clip.start),
        duration: end - at,
        fade_in: Math.min(clip.fade_in || 0, 0.05),
      };
      return [left, right];
    }),
  };
}

export function duplicateClip(track, clipId) {
  const clip = (track.clips || []).find((one) => one.id === clipId);
  if (!clip) return track;
  const copy = { ...clip, id: uid("clp"), start: clipEnd(clip) };
  return { ...track, clips: [...(track.clips || []), copy] };
}

/** The starting place a song is given when it is made from a template. */
export function templateTracks(template) {
  return (template?.kinds || []).map((kind, index) => newTrack(kind, index));
}

export function defaultBuses() {
  return { vocal: { volume: 1, muted: false }, music: { volume: 1, muted: false } };
}

export function defaultMaster() {
  return { volume: 1, eq_low: 0, eq_high: 0, comp: false, limiter: true, ceiling: -1 };
}

export function newProject({ title, artist, bpm, key_root, key_scale, time_signature, template }) {
  return {
    title: (title || "").trim() || "Wimbo mpya",
    artist: (artist || "").trim(),
    bpm: Number(bpm) || 90,
    key_root: key_root || "A",
    key_scale: key_scale || "minor",
    time_signature: time_signature || "4/4",
    notes: "",
    cover_url: "",
    duration: 0,
    tracks: templateTracks(template),
    takes: [],
    markers: [],
    loop_start: 0,
    loop_end: 0,
    loop_on: false,
    buses: defaultBuses(),
    master: defaultMaster(),
    template: template?.id || "blank",
    storage: "local",
    archived: false,
    trashed_at: "",
    last_saved_at: new Date().toISOString(),
    size_bytes: 0,
  };
}