/**
 * The beat work the studio does on the phone itself: a song the person sends is read and
 * measured, its voice lifted out of the middle of the mix, and a fresh beat built at the
 * song's own tempo in the style they picked. Nothing in here goes near ElevenLabs.
 */

import { audioGraph } from "@/lib/rapAudio";
import { scheduleBeat } from "@/lib/rapBeat";

const RATE = 44100;
// a long song is trimmed before it is worked on, so what is held in memory stays light
const MAX_SECONDS = 60;
// below this the two sides carry almost nothing of their own: there is no beat to lift out
const MIN_SIDE = 0.05;
const TARGET_PEAK = 0.89;

/** Reads the song that was sent, keeping its first stretch and dropping the rest. */
export async function readSong(file) {
  const bytes = await file.arrayBuffer();
  const ctx = audioGraph();

  let full;
  try {
    full = await ctx.decodeAudioData(bytes);
  } catch (err) {
    throw new Error("Faili hili halisomeki kama sauti. Jaribu faili la wimbo jingine.");
  }

  const frames = Math.min(full.length, Math.floor(MAX_SECONDS * full.sampleRate));
  if (frames >= full.length) return { buffer: full, seconds: full.duration };

  const buffer = ctx.createBuffer(full.numberOfChannels, frames, full.sampleRate);
  for (let c = 0; c < full.numberOfChannels; c += 1) {
    buffer.getChannelData(c).set(full.getChannelData(c).subarray(0, frames));
  }
  return { buffer, seconds: buffer.duration };
}

function corrAt(energy, lag, frames) {
  let acc = 0;
  for (let f = lag; f < frames; f += 1) acc += energy[f] * energy[f - lag];
  return acc / Math.max(1, frames - lag);
}

/** The song's speed, read from how loudly it pulses over its own first stretch. */
export function tempoOf(buffer) {
  const hop = 512;
  const frames = Math.floor(buffer.length / hop);
  if (frames < 64) return { bpm: 0, confident: false };

  const left = buffer.getChannelData(0);
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;
  const energy = new Float32Array(frames);

  for (let f = 0; f < frames; f += 1) {
    let sum = 0;
    const start = f * hop;
    for (let i = 0; i < hop; i += 4) {
      const l = left[start + i] || 0;
      const r = right ? right[start + i] || 0 : l;
      const v = (l + r) * 0.5;
      sum += v * v;
    }
    energy[f] = sum;
  }

  let mean = 0;
  for (let f = 0; f < frames; f += 1) mean += energy[f];
  mean /= frames;
  for (let f = 0; f < frames; f += 1) energy[f] -= mean;

  const fps = buffer.sampleRate / hop;
  const fastest = Math.max(2, Math.round((60 * fps) / 180));
  const slowest = Math.round((60 * fps) / 60);

  let best = 0;
  let bestLag = 0;
  let total = 0;
  let count = 0;

  for (let lag = fastest; lag <= slowest && lag < frames; lag += 1) {
    const acc = corrAt(energy, lag, frames);
    total += acc;
    count += 1;
    if (acc > best) {
      best = acc;
      bestLag = lag;
    }
  }
  if (!bestLag || best <= 0) return { bpm: 0, confident: false };

  // a pulse repeats twice as often as it reads: the faster count is the one that is felt
  let lag = bestLag;
  const half = Math.round(bestLag / 2);
  if (half >= fastest && corrAt(energy, half, frames) >= best * 0.85) lag = half;

  const found = Math.round((60 * fps) / lag);
  const confident =
    found >= 60 && found <= 180 && best > (count ? total / count : 0) * 1.6;
  return { bpm: Math.min(180, Math.max(60, found)), confident };
}

/** The sides of the mix alone: the voice sitting in the middle is taken out of it, and what
 *  is left is the beat, levelled so the take sits on it. */
export function stripVoice(buffer) {
  if (buffer.numberOfChannels < 2) return { ok: false };

  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const frames = buffer.length;
  let mid = 0;
  let side = 0;
  let peak = 0;

  for (let i = 0; i < frames; i += 1) {
    const l = left[i];
    const r = right[i];
    const m = (l + r) * 0.5;
    const d = (l - r) * 0.5;
    mid += m * m;
    side += d * d;
    const abs = d < 0 ? -d : d;
    if (abs > peak) peak = abs;
  }

  if (peak < 0.001 || side / (mid + 1e-9) < MIN_SIDE) return { ok: false };

  const ctx = audioGraph();
  const out = ctx.createBuffer(2, frames, buffer.sampleRate);
  const a = out.getChannelData(0);
  const b = out.getChannelData(1);
  const gain = TARGET_PEAK / peak;

  for (let i = 0; i < frames; i += 1) {
    const d = (left[i] - right[i]) * 0.5 * gain;
    a[i] = d;
    b[i] = d;
  }

  return { ok: true, buffer: out };
}

/** A fresh beat from the studio's own engine, at the tempo that was measured. */
export async function renderBeat({ bpm, seconds, style }) {
  const span = Math.max(6, seconds);
  const ctx = new OfflineAudioContext(2, Math.ceil(span * RATE), RATE);
  scheduleBeat(ctx, ctx.destination, { bpm, seconds: span, style });
  return ctx.startRendering();
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
// how far into a song the key is read from, so a long file stays quick to work through
const KEY_SECONDS = 45;

/** The key a beat sits in, read from its own bass: each of the twelve notes is weighed across
 *  the whole of it, and the one that carries the most is the root the voice has to sing in. */
export function keyOf(buffer) {
  const rate = buffer.sampleRate;
  const span = Math.min(buffer.length, Math.floor(rate * KEY_SECONDS));
  const left = buffer.getChannelData(0);
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
  const block = 8192;
  const chroma = new Float64Array(12);
  const base = 65.41; // C2, where a bass line lives

  for (let start = 0; start + block <= span; start += block) {
    for (let note = 0; note < 12; note += 1) {
      const freq = base * Math.pow(2, note / 12);
      const coeff = 2 * Math.cos((2 * Math.PI * freq) / rate);
      let s1 = 0;
      let s2 = 0;
      for (let i = 0; i < block; i += 1) {
        const v = (left[start + i] + right[start + i]) * 0.5;
        const s0 = v + coeff * s1 - s2;
        s2 = s1;
        s1 = s0;
      }
      chroma[note] += s1 * s1 + s2 * s2 - coeff * s1 * s2;
    }
  }

  let best = 0;
  let total = 0;
  let top = 0;
  for (let note = 0; note < 12; note += 1) {
    total += chroma[note];
    if (chroma[note] > best) {
      best = chroma[note];
      top = note;
    }
  }
  if (!best) return { root: "", label: "", confident: false };

  return {
    root: NOTE_NAMES[top],
    label: NOTE_NAMES[top] + " minor",
    confident: best > (total / 12) * 1.6,
  };
}

/** The key of a beat held as a file, or nothing when it cannot be read. */
export async function keyBytes(bytes) {
  try {
    const buffer = await audioGraph().decodeAudioData(bytes.slice(0));
    return keyOf(buffer).label;
  } catch (err) {
    return "";
  }
}

/** Decodes a take held as a file, so it can be judged before it is handed over. */
export async function decodeBytes(bytes) {
  return audioGraph().decodeAudioData(bytes.slice(0));
}

function pulseAt(energy, lag, frames) {
  let dot = 0;
  let left = 0;
  let right = 0;
  for (let f = lag; f < frames; f += 1) {
    const x = energy[f];
    const y = energy[f - lag];
    dot += x * y;
    left += x * x;
    right += y * y;
  }
  const den = Math.sqrt(left * right);
  return den ? dot / den : 0;
}

/** Whether a take really came back with a beat under it: the sound has to pulse where the
 *  tempo says the beat falls, which a plain reading of the lines never does. */
export function hasBeat(buffer, bpm) {
  const hop = 1024;
  const frames = Math.floor(buffer.length / hop);
  // too short to judge: it is let through rather than thrown away
  if (frames < 96) return true;

  const left = buffer.getChannelData(0);
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;
  const energy = new Float32Array(frames);

  for (let f = 0; f < frames; f += 1) {
    let sum = 0;
    const start = f * hop;
    for (let i = 0; i < hop; i += 4) {
      const l = left[start + i] || 0;
      const r = right ? right[start + i] || 0 : l;
      const v = (l + r) * 0.5;
      sum += v * v;
    }
    energy[f] = sum;
  }

  let mean = 0;
  for (let f = 0; f < frames; f += 1) mean += energy[f];
  mean /= frames;
  for (let f = 0; f < frames; f += 1) energy[f] -= mean;

  const fps = buffer.sampleRate / hop;
  const beat = (60 / Math.min(180, Math.max(60, bpm || 112))) * fps;
  let best = 0;
  [beat / 2, beat, beat * 2].forEach((span) => {
    const lag = Math.round(span);
    if (lag < 2 || lag >= frames) return;
    const found = pulseAt(energy, lag, frames);
    if (found > best) best = found;
  });

  return best > 0.22;
}