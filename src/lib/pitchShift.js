/**
 * Pitch and key work on the phone.
 *
 * Nothing here is sent anywhere. A recorded clip is shifted in place, and the automatic setting
 * measures the clip's own pitch to choose the shift that carries it into the key that was picked.
 * Small shifts stay clean; a shift of several semitones is heard as a machine, which is what a
 * shift of several semitones is — this is not a studio-grade correction and is not described as one.
 */

import { audioGraph } from "@/lib/rapAudio";

// a grain long enough to hold a voice's pitch, short enough that the words still move
const GRAIN = 2048;

/** A Hann window: the grains rise and fall, so laying one over the next leaves no click. */
function hann(size) {
  const win = new Float32Array(size);
  for (let i = 0; i < size; i += 1) {
    win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
  }
  return win;
}

const WINDOW = hann(GRAIN);

/** How far one semitone moves the pitch. */
export function semitoneFactor(semitones) {
  return Math.pow(2, (Number(semitones) || 0) / 12);
}

/**
 * The same clip at a different pitch, keeping its own length.
 *
 * Grains are read from the clip a little faster or slower than they are written out, and laid one
 * over the next; the overlap is divided back out so nothing gets louder. The clip therefore keeps
 * its place on the timeline while its pitch moves.
 */
export function shiftPitch(buffer, semitones) {
  const factor = semitoneFactor(semitones);
  if (!buffer || Math.abs(factor - 1) < 0.002) return buffer;

  const ctx = audioGraph();
  const out = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  const readHop = Math.max(1, Math.round((GRAIN / 4) * factor));

  for (let c = 0; c < buffer.numberOfChannels; c += 1) {
    const source = buffer.getChannelData(c);
    const target = out.getChannelData(c);
    const weight = new Float32Array(buffer.length + GRAIN);

    let read = 0;
    let write = 0;
    while (write < buffer.length) {
      for (let i = 0; i < GRAIN; i += 1) {
        const at = write + i;
        if (at >= buffer.length) break;
        const from = read + i;
        const sample = from < source.length ? source[from] : 0;
        target[at] += sample * WINDOW[i];
        weight[at] += WINDOW[i];
      }
      read += readHop;
      write += GRAIN / 4;
    }

    for (let i = 0; i < target.length; i += 1) {
      if (weight[i] > 0.001) target[i] /= weight[i];
    }
  }

  return out;
}

/** The pitch the clip is really sung at, measured from the loudest part of it. Nothing is changed. */
export function detectPitch(buffer) {
  if (!buffer) return 0;
  const data = buffer.getChannelData(0);
  const rate = buffer.sampleRate;
  const size = Math.min(4096, data.length);
  if (size < 512) return 0;

  // the loudest stretch is the one that is measured
  let start = 0;
  let best = -1;
  for (let at = 0; at + size <= data.length; at += size) {
    let energy = 0;
    for (let i = 0; i < size; i += 1) energy += data[at + i] * data[at + i];
    if (energy > best) {
      best = energy;
      start = at;
    }
  }

  const slice = data.subarray(start, start + size);
  const minLag = Math.max(2, Math.floor(rate / 420));
  const maxLag = Math.min(slice.length - 2, Math.floor(rate / 70));

  let bestLag = 0;
  let bestScore = 0;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let sum = 0;
    let left = 0;
    let right = 0;
    for (let i = 0; i + lag < slice.length; i += 1) {
      sum += slice[i] * slice[i + lag];
      left += slice[i] * slice[i];
      right += slice[i + lag] * slice[i + lag];
    }
    const score = left && right ? sum / Math.sqrt(left * right) : 0;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }

  if (!bestLag || bestScore < 0.3) return 0;
  return rate / bestLag;
}

export const ROOTS = [
  { id: "c", label: "C", pc: 0 },
  { id: "c#", label: "C#", pc: 1 },
  { id: "d", label: "D", pc: 2 },
  { id: "d#", label: "D#", pc: 3 },
  { id: "e", label: "E", pc: 4 },
  { id: "f", label: "F", pc: 5 },
  { id: "f#", label: "F#", pc: 6 },
  { id: "g", label: "G", pc: 7 },
  { id: "g#", label: "G#", pc: 8 },
  { id: "a", label: "A", pc: 9 },
  { id: "a#", label: "A#", pc: 10 },
  { id: "b", label: "B", pc: 11 },
];

export const MODES = [
  { id: "major", label: "Major", steps: [0, 2, 4, 5, 7, 9, 11] },
  { id: "minor", label: "Minor", steps: [0, 2, 3, 5, 7, 8, 10] },
];

export function rootOf(id) {
  return ROOTS.find((one) => one.id === id) || ROOTS[9];
}

export function modeOf(id) {
  return MODES.find((one) => one.id === id) || MODES[1];
}

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function noteLabel(midi) {
  const at = ((midi % 12) + 12) % 12;
  return `${NAMES[at]}${Math.floor(midi / 12) - 1}`;
}

/** The note the beat is built on, in the octave the bass sits in. */
export function rootHz(pc, octave = 3) {
  const midi = 12 * (octave + 1) + pc;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * The shift that carries a clip into the key that was picked: the nearest note of that key. A clip
 * already in the key comes back with no shift at all, so nothing is touched that does not need it.
 */
export function snapToKey(hz, rootPc, modeId) {
  if (!hz) return null;
  const mode = modeOf(modeId);
  const midi = 69 + 12 * Math.log2(hz / 440);
  const centre = Math.round(midi);

  let best = null;
  for (let shift = -7; shift <= 7; shift += 1) {
    const target = centre + shift;
    if (target <= 0) continue;
    const pc = ((target % 12) + 12) % 12;
    const inKey = mode.steps.some((step) => (rootPc + step) % 12 === pc);
    if (!inKey) continue;
    const distance = Math.abs(target - midi);
    if (!best || distance < best.distance) best = { distance, shift, target };
  }

  if (!best) return null;
  return { semitones: best.shift, label: noteLabel(best.target) };
}