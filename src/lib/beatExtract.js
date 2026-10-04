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