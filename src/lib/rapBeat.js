/**
 * The beat the app plays itself, in the Afro-Zaga feel: kick, bongo toms, shaker and
 * bass. It is written into any audio graph — the phone's own mixer, or the offline
 * renderer that turns a take into a file — so what is heard and what is saved are the
 * same beat.
 */

// Sauti ya ElevenLabs (kuimba na kurap) ndiyo ya kwanza na ya msingi: studio hufunguka
// ikiwa imechaguliwa, na sauti yake mwenyewe inabaki kama akiba tu.
export const VOICE_OPTIONS = [
  { id: "sing", label: "ElevenLabs · msingi" },
  { id: "agent", label: "Sauti yake mwenyewe" },
];

export const BEAT_OPTIONS = [
  { id: "app", label: "Beat ya app" },
  { id: "mine", label: "Beat yangu" },
  { id: "none", label: "Bila beat" },
];

/** The feels the studio's own engine can lay down when a similar beat is asked for. */
export const BEAT_STYLES = [
  { id: "afro", label: "Afro-Zaga" },
  { id: "bongo", label: "Bongo Flava" },
  { id: "dancehall", label: "Dancehall" },
  { id: "trap", label: "Trap" },
];

export function styleLabel(id) {
  return BEAT_STYLES.find((style) => style.id === id)?.label || "Beat";
}

export const TEMPOS = [96, 112, 124, 144];
export const DEFAULT_BPM = 112;

/** How long a take runs, chosen by time rather than by bars. */
export const TAKES = [
  { id: 10, label: "10s" },
  { id: 30, label: "30s" },
  { id: 60, label: "1 dakika" },
  { id: 90, label: "1:30" },
  { id: 120, label: "2 dakika" },
];
export const DEFAULT_TAKE = 30;
export const MIN_BARS = 4;
export const MAX_BARS = 80;

/** The key the studio's own beat is built in: its bass runs on A, B, C and D, A minor. */
export const APP_BEAT_KEY = "A minor";

/** The bars that fill the chosen time at this tempo, one bar being four beats. */
export function barsFor(seconds, bpm) {
  const span = Math.max(1, Number(seconds) || DEFAULT_TAKE);
  const tempo = Math.max(60, Number(bpm) || DEFAULT_BPM);
  return Math.min(MAX_BARS, Math.max(MIN_BARS, Math.round((span * tempo) / 240)));
}

/** A time as it is written beside a take: 30s, or 1:30. */
export function timeLabel(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return minutes ? minutes + ":" + String(rest).padStart(2, "0") : total + "s";
}

/** The kinds of rap the studio can lay down: from laid-back to rapid-fire. */
export const FLOW_OPTIONS = [
  {
    id: "polepole",
    label: "Polepole",
    hint: "Polepole — mapumziko mengi, maneno machache kila bar.",
    bpm: 96,
  },
  {
    id: "kawaida",
    label: "Kawaida",
    hint: "Kawaida — mwendo wa studio kama ulivyo.",
    bpm: DEFAULT_BPM,
  },
  {
    id: "haraka",
    label: "Haraka",
    hint: "Haraka — mfuatano wa haraka, kama Nicki Minaj.",
    bpm: 124,
  },
  {
    id: "sana",
    label: "Haraka sana",
    hint: "Haraka sana — rapid-fire kama 6ix9ine.",
    bpm: 144,
  },
];

export const DEFAULT_FLOW = "kawaida";

/** The kind of rap that was chosen; anything unrecognised is the usual one. */
export function flowOf(id) {
  return FLOW_OPTIONS.find((flow) => flow.id === id) || FLOW_OPTIONS[1];
}

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

/** One bar in sixteenths per feel: the steps the kick, the clap and the bass fall on, the
    pitch of each tom, and how hard the shaker shakes on every step (1 ordinary, 2 accented,
    0 silent). The feel is a pattern inside this one engine, never a second engine. */
const STYLE_PATTERNS = {
  afro: {
    kick: [0, 6, 8],
    clap: [4, 12],
    toms: { 3: 300, 7: 236, 10: 300, 14: 236 },
    bass: [0, 10],
    shaker: [1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1],
  },
  bongo: {
    kick: [0, 8],
    clap: [4, 12],
    toms: { 6: 280, 14: 216 },
    bass: [0, 8],
    shaker: [2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0],
  },
  dancehall: {
    kick: [8],
    clap: [4, 12],
    toms: {},
    bass: [0, 8],
    shaker: [2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1],
  },
  trap: {
    kick: [0, 6, 10],
    clap: [8],
    toms: {},
    bass: [0, 10],
    shaker: [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
  },
};

/**
 * Lays the whole beat into an audio graph and returns how long it runs. The pattern is
 * counted in sixteenths, so one bar is sixteen steps at any tempo.
 */
export function scheduleBeat(ctx, out, { bpm = DEFAULT_BPM, seconds = 30, at = 0, style = "afro" } = {}) {
  const pattern = STYLE_PATTERNS[style] || STYLE_PATTERNS.afro;
  const step = 60 / Math.max(60, bpm) / 4;
  const noise = noiseBuffer(ctx);
  const roots = [55, 61.74, 65.41, 73.42];
  const steps = Math.max(1, Math.ceil(seconds / step));

  for (let i = 0; i < steps; i += 1) {
    const t = at + i * step;
    const m = i % 16;
    const bar = Math.floor(i / 16);

    if (pattern.kick.includes(m)) kick(ctx, out, t);
    if (pattern.clap.includes(m)) clap(ctx, out, t, noise);
    if (pattern.toms[m]) tom(ctx, out, t, pattern.toms[m]);
    if (pattern.shaker[m]) shaker(ctx, out, t, noise, pattern.shaker[m] === 2 ? 0.13 : 0.07);
    pattern.bass.forEach((step, index) => {
      if (step === m) bass(ctx, out, t, roots[(bar + index * 2) % roots.length]);
    });
  }

  return steps * step;
}