/**
 * The voice tracks of the studio: what the person recorded, what they brought in, and the vocal a
 * cloned voice sang. Each track keeps its own clipping, its own volume and its own pitch, and they
 * are played out together as one sound over the beat.
 *
 * Everything here happens on the phone.
 */

const RATE = 44100;
// more than the six the studio used to allow, and fewer than a phone would choke on
export const MAX_TRACKS = 24;
export const MIN_TRACK_SECONDS = 1;

export function nameForTrack(count) {
  return `Sauti ${count}`;
}

/** A new track, holding the sound it was made of and nothing changed about it yet. */
export function newTrack({ name, buffer, blob, kind = "record" }) {
  return {
    id: `tk-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    name,
    kind,
    buffer,
    blob: blob || null,
    volume: 1,
    start: 0,
    trimStart: 0,
    trimEnd: buffer.duration,
    semitones: 0,
    shifted: null,
    tuned: false,
    muted: false,
    solo: false,
  };
}

/** The sound a track really plays: its own, or the same sound with its pitch moved. */
export function sourceOf(track) {
  return track.shifted || track.buffer;
}

/** How much of the clip is left after the cut, in seconds. */
export function trackLength(track) {
  const source = sourceOf(track);
  const from = Math.max(0, track.trimStart || 0);
  const to = Math.min(source.duration, track.trimEnd ?? source.duration);
  return Math.max(0, to - from);
}

/** Where the track ends on the timeline, so a mix knows how long it is. */
export function trackEnd(track) {
  return Math.max(0, track.start || 0) + trackLength(track);
}

/** The shape of a clip, read as bars: what the lane draws, and nothing that is counted or sent. */
export function peaks(buffer, count = 72) {
  if (!buffer) return [];
  const data = buffer.getChannelData(0);
  const size = Math.max(1, Math.floor(data.length / count));
  const bars = [];
  for (let at = 0; at < count; at += 1) {
    let high = 0;
    const from = at * size;
    for (let i = from; i < from + size && i < data.length; i += 1) {
      const value = Math.abs(data[i]);
      if (value > high) high = value;
    }
    bars.push(high);
  }
  const loudest = Math.max(0.001, ...bars);
  return bars.map((one) => Math.max(0.06, one / loudest));
}

/** How long the whole mix runs: where the last track ends. */
export function mixSeconds(tracks, fallback = 8) {
  const ends = (tracks || []).filter((track) => !track.muted).map(trackEnd);
  return Math.max(fallback, ...ends, 0);
}

/**
 * Every track that is heard, cut as it was cut, at the volume it was set to and at the pitch it was
 * moved to, laid at its own place on the timeline and played out together as one sound. When one
 * track is soloed, only the soloed tracks are heard.
 */
export async function renderTracks(tracks, seconds) {
  const span = Math.max(1, Number(seconds) || mixSeconds(tracks));
  const ctx = new OfflineAudioContext(2, Math.ceil(span * RATE), RATE);

  const audible = (tracks || []).filter((track) => !track.muted && track.buffer);
  const soloed = audible.filter((track) => track.solo);
  const heard = soloed.length ? soloed : audible;

  heard.forEach((track) => {
    const source = sourceOf(track);
    const from = Math.max(0, track.trimStart || 0);
    const to = Math.min(source.duration, track.trimEnd ?? source.duration);
    if (to - from < 0.02) return;

    const node = ctx.createBufferSource();
    node.buffer = source;
    const gain = ctx.createGain();
    gain.gain.value = Math.max(0, Number(track.volume) ?? 1);
    node.connect(gain);
    gain.connect(ctx.destination);
    node.start(Math.max(0, track.start || 0), from, to - from);
  });

  return ctx.startRendering();
}