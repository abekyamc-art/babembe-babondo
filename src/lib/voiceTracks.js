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
// how far along the line a clip may be laid: well past the eight bars the studio writes
export const MAX_START = 30;

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
    collapsed: false,
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

/**
 * The room the whole mix is heard in. Everything is played dry first, then one short echo and one
 * soft tail are laid over the lot, so the voices and the beat sound like they were cut in the same
 * room rather than stacked on top of each other. With the room turned right down, the mix is handed
 * back exactly as it was rendered.
 */
export async function addAmbience(buffer, amount) {
  const wet = Math.max(0, Math.min(1, Number(amount) || 0));
  if (!wet || !buffer) return buffer;

  const rate = buffer.sampleRate || RATE;
  // the tail is given its own room to ring out in, so the echo never ends in a cut
  const length = buffer.length + Math.ceil(rate * 0.9);
  const ctx = new OfflineAudioContext(Math.max(1, buffer.numberOfChannels), length, rate);

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const dry = ctx.createGain();
  dry.gain.value = 1 - wet * 0.3;

  const tail = ctx.createConvolver();
  tail.buffer = roomTail(ctx, 1.8, 2.6);
  const send = ctx.createGain();
  send.gain.value = wet * 0.5;

  const echo = ctx.createDelay(0.7);
  echo.delayTime.value = 0.27;
  const echoLevel = ctx.createGain();
  echoLevel.gain.value = wet * 0.35;
  const echoBack = ctx.createGain();
  echoBack.gain.value = 0.32;

  source.connect(dry);
  dry.connect(ctx.destination);
  source.connect(send);
  send.connect(tail);
  tail.connect(ctx.destination);
  send.connect(echo);
  echo.connect(echoLevel);
  echoLevel.connect(ctx.destination);
  echo.connect(echoBack);
  echoBack.connect(echo);

  source.start(0);
  return ctx.startRendering();
}

/** The tail of the room: a short burst of noise falling away, which is what a room sounds like. */
function roomTail(ctx, seconds, decay) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const tail = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = tail.getChannelData(channel);
    for (let at = 0; at < length; at += 1) {
      data[at] = (Math.random() * 2 - 1) * Math.pow(1 - at / length, decay);
    }
  }
  return tail;
}