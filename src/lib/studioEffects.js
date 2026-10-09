/**
 * What can be done to a voice, and what each effect is made of. The same chain is built for what is
 * heard while working and for the file that comes out at the end, so the export is the mix that was
 * listened to and not a second guess at it.
 *
 * Some of the studio's effects ask for more than a browser can do — a gate that follows an envelope,
 * a de-esser, noise reduction, real pitch correction. Those keep their place in the chain and say so
 * plainly rather than being drawn as though they were working.
 */

import { uid } from "@/lib/studioTracks";

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, Number(value) || 0));

/** Every effect a track can carry, with the controls each one has. */
export const FX_LIST = [
  {
    id: "eq", label: "EQ", insert: true,
    params: [
      { key: "low", min: -18, max: 18, def: 0, step: 0.5, unit: "dB" },
      { key: "mid", min: -18, max: 18, def: 0, step: 0.5, unit: "dB" },
      { key: "high", min: -18, max: 18, def: 0, step: 0.5, unit: "dB" },
    ],
  },
  {
    id: "comp", label: "Compressor", insert: true,
    params: [
      { key: "threshold", min: -60, max: 0, def: -20, step: 1, unit: "dB" },
      { key: "ratio", min: 1, max: 20, def: 3, step: 0.5, unit: ":1" },
      { key: "attack", min: 0.001, max: 0.4, def: 0.01, step: 0.001, unit: "s" },
      { key: "release", min: 0.05, max: 1, def: 0.2, step: 0.01, unit: "s" },
      { key: "makeup", min: 0, max: 18, def: 3, step: 0.5, unit: "dB" },
    ],
  },
  {
    id: "sat", label: "Saturation", insert: true,
    params: [
      { key: "drive", min: 0, max: 100, def: 25, step: 1, unit: "%" },
      { key: "trim", min: -12, max: 6, def: -2, step: 0.5, unit: "dB" },
    ],
  },
  {
    id: "limiter", label: "Limiter", insert: true,
    params: [{ key: "ceiling", min: -9, max: 0, def: -1, step: 0.5, unit: "dB" }],
  },
  {
    id: "delay", label: "Delay", wet: 0.28,
    params: [
      { key: "time", min: 0.04, max: 1.2, def: 0.28, step: 0.01, unit: "s" },
      { key: "feedback", min: 0, max: 0.85, def: 0.32, step: 0.01, unit: "" },
      { key: "tone", min: 500, max: 9000, def: 3200, step: 100, unit: "Hz" },
    ],
  },
  {
    id: "reverb", label: "Reverb", wet: 0.2,
    params: [
      { key: "decay", min: 0.3, max: 4, def: 1.4, step: 0.1, unit: "s" },
      { key: "tone", min: 800, max: 12000, def: 5200, step: 100, unit: "Hz" },
    ],
  },
  {
    id: "chorus", label: "Chorus", wet: 0.25,
    params: [
      { key: "rate", min: 0.1, max: 6, def: 1.2, step: 0.1, unit: "Hz" },
      { key: "depth", min: 0.001, max: 0.02, def: 0.006, step: 0.001, unit: "s" },
    ],
  },
  {
    id: "width", label: "Stereo width", wet: 1,
    params: [{ key: "amount", min: 0, max: 2, def: 1.3, step: 0.05, unit: "" }],
  },
  { id: "gate", label: "Gate", native: true, params: [{ key: "threshold", min: -80, max: 0, def: -45, step: 1, unit: "dB" }] },
  { id: "deess", label: "De-esser", native: true, params: [{ key: "amount", min: 0, max: 100, def: 40, step: 1, unit: "%" }] },
  { id: "denoise", label: "Noise reduction", native: true, params: [{ key: "amount", min: 0, max: 100, def: 50, step: 1, unit: "%" }] },
  { id: "pitch", label: "Pitch correction", native: true, params: [{ key: "amount", min: 0, max: 100, def: 60, step: 1, unit: "%" }] },
];

export const FX_BY_ID = FX_LIST.reduce((all, one) => ({ ...all, [one.id]: one }), {});

export function defaultParams(type) {
  const found = FX_BY_ID[type];
  if (!found) return {};
  return (found.params || []).reduce((all, param) => ({ ...all, [param.key]: param.def }), {});
}

/** The presets an artist reaches for first, each one a whole chain ready to be shaped. */
export const FX_PRESETS = [
  {
    id: "clean", label: "fxClean",
    fx: [
      { type: "eq", params: { low: -3, mid: 1, high: 2.5 } },
      { type: "comp", params: { threshold: -20, ratio: 3, attack: 0.012, release: 0.2, makeup: 3 } },
      { type: "reverb", wet: 0.12, params: { decay: 1.2, tone: 5200 } },
      { type: "limiter" },
    ],
  },
  {
    id: "rap", label: "fxRap",
    fx: [
      { type: "eq", params: { low: -5, mid: 3, high: 2 } },
      { type: "comp", params: { threshold: -24, ratio: 6, attack: 0.003, release: 0.16, makeup: 5 } },
      { type: "sat", params: { drive: 28, trim: -3 } },
      { type: "delay", wet: 0.12, params: { time: 0.24, feedback: 0.28, tone: 2800 } },
      { type: "limiter" },
    ],
  },
  {
    id: "afro", label: "fxAfro",
    fx: [
      { type: "eq", params: { low: -3, mid: 1, high: 3 } },
      { type: "comp", params: { threshold: -20, ratio: 4, attack: 0.01, release: 0.22, makeup: 4 } },
      { type: "chorus", wet: 0.22, params: { rate: 1, depth: 0.006 } },
      { type: "reverb", wet: 0.22, params: { decay: 1.6, tone: 5600 } },
      { type: "limiter" },
    ],
  },
  {
    id: "fast", label: "fxFast",
    fx: [
      { type: "eq", params: { low: -6, mid: 4, high: 3 } },
      { type: "comp", params: { threshold: -28, ratio: 8, attack: 0.002, release: 0.12, makeup: 6 } },
      { type: "sat", params: { drive: 35, trim: -4 } },
      { type: "limiter" },
    ],
  },
  {
    id: "harmony", label: "fxHarmony",
    fx: [
      { type: "eq", params: { low: -3, mid: 0, high: 3 } },
      { type: "comp", params: { threshold: -22, ratio: 3, makeup: 3 } },
      { type: "chorus", wet: 0.36, params: { rate: 0.8, depth: 0.008 } },
      { type: "reverb", wet: 0.3, params: { decay: 1.9, tone: 6000 } },
      { type: "width", wet: 1, params: { amount: 1.45 } },
    ],
  },
  {
    id: "adlib", label: "fxAdlib",
    fx: [
      { type: "eq", params: { low: -4, mid: 2, high: 3 } },
      { type: "comp", params: { threshold: -24, ratio: 5, makeup: 4 } },
      { type: "delay", wet: 0.34, params: { time: 0.22, feedback: 0.42, tone: 3400 } },
      { type: "reverb", wet: 0.28, params: { decay: 1.4, tone: 5200 } },
    ],
  },
  {
    id: "live", label: "fxLive",
    fx: [
      { type: "eq", params: { low: -6, mid: 1, high: 2 } },
      { type: "comp", params: { threshold: -18, ratio: 3, makeup: 2 } },
      { type: "reverb", wet: 0.42, params: { decay: 2.4, tone: 4800 } },
      { type: "limiter" },
    ],
  },
  {
    id: "phone", label: "fxPhone",
    fx: [
      { type: "eq", params: { low: -14, mid: 3, high: 1 } },
      { type: "comp", params: { threshold: -26, ratio: 6, attack: 0.004, release: 0.14, makeup: 6 } },
      { type: "sat", params: { drive: 30, trim: -4 } },
      { type: "limiter" },
    ],
  },
  {
    id: "beat", label: "fxBeat",
    fx: [
      { type: "eq", params: { low: 1, mid: -1, high: 1.5 } },
      { type: "comp", params: { threshold: -16, ratio: 2.5, makeup: 2 } },
      { type: "limiter" },
    ],
  },
];

/** A whole preset as a chain, ready to take the place of what a track already carries. */
export function presetChain(presetId) {
  const preset = FX_PRESETS.find((one) => one.id === presetId);
  if (!preset) return null;
  return preset.fx.map((one, index) => ({
    id: uid("fx"),
    type: one.type,
    order: index,
    on: true,
    bypass: false,
    wet: one.wet ?? (FX_BY_ID[one.type]?.insert ? 1 : 0.3),
    amount: 1,
    params: { ...defaultParams(one.type), ...(one.params || {}) },
  }));
}

/* --- what each effect is actually built from --- */

function impulse(ctx, decay) {
  const seconds = clamp(decay, 0.2, 4);
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6);
    }
  }
  return buffer;
}

function driveCurve(amount) {
  const size = 1024;
  const curve = new Float32Array(size);
  const k = 1 + clamp(amount, 0, 100) * 0.12;
  for (let i = 0; i < size; i += 1) {
    const x = (i / (size - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return curve;
}

const MAKERS = {
  eq: (ctx, p) => {
    const low = ctx.createBiquadFilter();
    low.type = "lowshelf";
    low.frequency.value = 130;
    low.gain.value = clamp(p.low ?? 0, -18, 18);
    const mid = ctx.createBiquadFilter();
    mid.type = "peaking";
    mid.frequency.value = 1700;
    mid.Q.value = 0.9;
    mid.gain.value = clamp(p.mid ?? 0, -18, 18);
    const high = ctx.createBiquadFilter();
    high.type = "highshelf";
    high.frequency.value = 6200;
    high.gain.value = clamp(p.high ?? 0, -18, 18);
    low.connect(mid);
    mid.connect(high);
    return { in: low, out: high, insert: true, nodes: [low, mid, high] };
  },
  comp: (ctx, p) => {
    const node = ctx.createDynamicsCompressor();
    node.threshold.value = clamp(p.threshold ?? -20, -80, 0);
    node.ratio.value = clamp(p.ratio ?? 3, 1, 20);
    node.attack.value = clamp(p.attack ?? 0.01, 0.001, 0.5);
    node.release.value = clamp(p.release ?? 0.2, 0.05, 1);
    node.knee.value = 12;
    const makeup = ctx.createGain();
    makeup.gain.value = Math.pow(10, clamp(p.makeup ?? 0, 0, 18) / 20);
    node.connect(makeup);
    return { in: node, out: makeup, insert: true, nodes: [node, makeup] };
  },
  limiter: (ctx, p) => {
    const node = ctx.createDynamicsCompressor();
    node.threshold.value = clamp(p.ceiling ?? -1, -12, 0);
    node.ratio.value = 20;
    node.attack.value = 0.002;
    node.release.value = 0.06;
    node.knee.value = 0;
    return { in: node, out: node, insert: true, nodes: [node] };
  },
  sat: (ctx, p) => {
    const shaper = ctx.createWaveShaper();
    shaper.curve = driveCurve(p.drive ?? 25);
    shaper.oversample = "2x";
    const trim = ctx.createGain();
    trim.gain.value = Math.pow(10, clamp(p.trim ?? -2, -18, 6) / 20);
    shaper.connect(trim);
    return { in: shaper, out: trim, insert: true, nodes: [shaper, trim] };
  },
  delay: (ctx, p) => {
    const input = ctx.createGain();
    const delay = ctx.createDelay(2);
    delay.delayTime.value = clamp(p.time ?? 0.28, 0.02, 1.5);
    const feedback = ctx.createGain();
    feedback.gain.value = clamp(p.feedback ?? 0.32, 0, 0.85);
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = clamp(p.tone ?? 3200, 400, 12000);
    input.connect(delay);
    delay.connect(tone);
    tone.connect(feedback);
    feedback.connect(delay);
    return { in: input, out: tone, nodes: [input, delay, feedback, tone] };
  },
  reverb: (ctx, p) => {
    const input = ctx.createGain();
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse(ctx, p.decay ?? 1.4);
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = clamp(p.tone ?? 5200, 600, 14000);
    input.connect(convolver);
    convolver.connect(tone);
    return { in: input, out: tone, nodes: [input, convolver, tone] };
  },
  chorus: (ctx, p) => {
    const input = ctx.createGain();
    const out = ctx.createGain();
    const lfo = ctx.createOscillator();
    lfo.frequency.value = clamp(p.rate ?? 1.2, 0.05, 8);
    const depth = ctx.createGain();
    depth.gain.value = clamp(p.depth ?? 0.006, 0.0005, 0.03);
    lfo.connect(depth);
    const left = ctx.createDelay(0.06);
    const right = ctx.createDelay(0.06);
    left.delayTime.value = 0.014;
    right.delayTime.value = 0.022;
    depth.connect(left.delayTime);
    depth.connect(right.delayTime);
    lfo.start();
    const panL = ctx.createStereoPanner();
    panL.pan.value = -0.7;
    const panR = ctx.createStereoPanner();
    panR.pan.value = 0.7;
    input.connect(left);
    input.connect(right);
    left.connect(panL);
    right.connect(panR);
    panL.connect(out);
    panR.connect(out);
    return { in: input, out, nodes: [input, out, lfo, depth, left, right, panL, panR] };
  },
  width: (ctx, p) => {
    const amount = clamp(p.amount ?? 1.3, 0, 2);
    const input = ctx.createGain();
    const out = ctx.createGain();
    const split = ctx.createChannelSplitter(2);
    const merge = ctx.createChannelMerger(2);
    const mid = ctx.createGain();
    mid.gain.value = 0.5;
    const side = ctx.createGain();
    side.gain.value = 0.5 * amount;
    const invert = ctx.createGain();
    invert.gain.value = -1;
    const sideBack = ctx.createGain();
    sideBack.gain.value = -1;
    input.connect(split);
    split.connect(mid, 0);
    split.connect(mid, 1);
    split.connect(side, 0);
    split.connect(invert, 1);
    invert.connect(side);
    mid.connect(merge, 0, 0);
    mid.connect(merge, 0, 1);
    side.connect(merge, 0, 0);
    side.connect(sideBack);
    sideBack.connect(merge, 0, 1);
    merge.connect(out);
    return { in: input, out, nodes: [input, out, split, merge, mid, side, invert, sideBack] };
  },
};

/** Every effect the phone's own engine can run. The rest wait for the native one. */
export const RUNNABLE = Object.keys(MAKERS);

/**
 * A track's chain, built and joined together in the order it stands. What comes back is the way in
 * and the way out, so the chain can be laid into a playing graph or a rendered one and the song is
 * heard the same either way.
 */
export function buildChain(ctx, fxList) {
  const input = ctx.createGain();
  let node = input;
  const nodes = [input];

  const chain = [...(fxList || [])]
    .filter((one) => one && one.on !== false && !one.bypass)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

  for (const one of chain) {
    const maker = MAKERS[one.type];
    if (!maker) continue;
    const amount = clamp(one.amount ?? 1, 0, 1.5);
    const params = { ...(one.params || {}) };
    if (one.type === "sat") params.drive = clamp(params.drive ?? 25, 0, 100) * amount;
    const built = maker(ctx, params);
    if (!built) continue;

    const out = ctx.createGain();
    const wetGain = ctx.createGain();
    const dryGain = ctx.createGain();
    const wet = built.insert ? 1 : clamp((one.wet ?? 0.3) * amount, 0, 1);
    wetGain.gain.value = wet;
    dryGain.gain.value = 1 - wet;

    node.connect(built.in);
    built.out.connect(wetGain);
    wetGain.connect(out);
    node.connect(dryGain);
    dryGain.connect(out);

    node = out;
    nodes.push(...(built.nodes || []), out, wetGain, dryGain);
  }

  return {
    input,
    output: node,
    dispose() {
      nodes.forEach((one) => {
        try {
          one.disconnect();
        } catch (err) {
          // already pulled out of the graph
        }
      });
    },
  };
}