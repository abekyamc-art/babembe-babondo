/**
 * The beat the app plays itself, in the Afro-Zaga feel: kick, bongo toms, shaker and
 * bass. It is written into any audio graph — the phone's own mixer, or the offline
 * renderer that turns a take into a file — so what is heard and what is saved are the
 * same beat.
 */

export const VOICE_OPTIONS = [
  { id: "sing", label: "Sauti ya kuimba" },
  { id: "agent", label: "Sauti yake mwenyewe" },
];

export const BEAT_OPTIONS = [
  { id: "app", label: "Beat ya app" },
  { id: "mine", label: "Beat yangu" },
  { id: "none", label: "Bila beat" },
];

export const TEMPOS = [96, 112, 124];
export const LENGTHS = [8, 16, 32];
export const DEFAULT_BPM = 112;

/** How long a rap of this many bars runs at this tempo, in seconds. */
export function beatSeconds(bars, bpm) {
  return (Math.max(1, bars) * 4 * 60) / Math.max(60, bpm);
}

function noiseBuffer(ctx, seconds = 0.5) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function kick(ctx, out, at) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(130, at);
  osc.frequency.exponentialRampToValueAtTime(46, at + 0.13);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.95, at + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + 0.32);
}

function clap(ctx, out, at, noise) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1400;
  band.Q.value = 0.9;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.5, at + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
  src.connect(band).connect(gain).connect(out);
  src.start(at);
  src.stop(at + 0.2);
}

function tom(ctx, out, at, freq) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, at);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.72, at + 0.16);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.34, at + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.24);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + 0.26);
}

function shaker(ctx, out, at, noise, loud) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const high = ctx.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = 6500;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(loud, at + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
  src.connect(high).connect(gain).connect(out);
  src.start(at);
  src.stop(at + 0.08);
}

function bass(ctx, out, at, freq) {
  const osc = ctx.createOscillator();
  const low = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(freq, at);
  low.type = "lowpass";
  low.frequency.value = 220;
  low.Q.value = 4;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.28, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
  osc.connect(low).connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + 0.55);
}

/**
 * Lays the whole beat into an audio graph and returns how long it runs. The pattern is
 * counted in sixteenths, so one bar is sixteen steps at any tempo.
 */
export function scheduleBeat(ctx, out, { bpm = DEFAULT_BPM, seconds = 30, at = 0 } = {}) {
  const step = 60 / Math.max(60, bpm) / 4;
  const noise = noiseBuffer(ctx);
  const roots = [55, 61.74, 65.41, 73.42];
  const steps = Math.max(1, Math.ceil(seconds / step));

  for (let i = 0; i < steps; i += 1) {
    const t = at + i * step;
    const m = i % 16;
    const bar = Math.floor(i / 16);

    if (m === 0 || m === 6 || m === 8) kick(ctx, out, t);
    if (m === 4 || m === 12) clap(ctx, out, t, noise);
    if (m === 3 || m === 7 || m === 10 || m === 14) tom(ctx, out, t, m === 3 || m === 10 ? 300 : 236);
    shaker(ctx, out, t, noise, m % 4 === 2 ? 0.13 : 0.07);
    if (m === 0) bass(ctx, out, t, roots[bar % roots.length]);
    if (m === 10) bass(ctx, out, t, roots[(bar + 2) % roots.length]);
  }

  return steps * step;
}