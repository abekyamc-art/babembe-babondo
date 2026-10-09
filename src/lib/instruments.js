/**
 * The instruments a beat is built from, made on the phone with the browser's own sound engine.
 * Every one is a small recipe — an oscillator or a piece of noise, a filter and an envelope — so no
 * sample is downloaded and nothing is sent anywhere.
 *
 * A drum is struck at a fixed pitch of its own; a melodic instrument plays whatever note the grid
 * hands it.
 */

export const INSTRUMENTS = [
  { id: "kick", label: "Kick", kind: "drum" },
  { id: "snare", label: "Snare", kind: "drum" },
  { id: "clap", label: "Clap", kind: "drum" },
  { id: "hat", label: "Hi-hat", kind: "drum" },
  { id: "tom", label: "Tom", kind: "drum" },
  { id: "bass", label: "Bass", kind: "melodic" },
  { id: "piano", label: "Piano", kind: "melodic" },
  { id: "guitar", label: "Gitaa", kind: "melodic" },
  { id: "brass", label: "Brass", kind: "melodic" },
  { id: "flute", label: "Filimbi", kind: "melodic" },
  { id: "marimba", label: "Marimba", kind: "melodic" },
  { id: "strings", label: "Strings", kind: "melodic" },
];

export function instrumentOf(id) {
  return INSTRUMENTS.find((one) => one.id === id) || INSTRUMENTS[0];
}

/** One piece of noise, made once for each sound engine and used by every drum. */
const NOISE = new WeakMap();

function noiseBuffer(ctx) {
  let made = NOISE.get(ctx);
  if (!made) {
    made = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 1.2), ctx.sampleRate);
    const data = made.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    NOISE.set(ctx, made);
  }
  return made;
}

/** An envelope: up at once, then away, so every hit has a beginning and an end. */
function shape(ctx, at, peak, decay) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + Math.max(0.05, decay));
  return gain;
}

/** A tone with its own envelope, handed to whatever follows it. */
function tone(ctx, type, freq, at, peak, decay, extra) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(20, freq), at);
  if (extra?.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, extra.to), at + (extra.over || 0.18));
  const gain = shape(ctx, at, peak, decay);
  osc.connect(gain);
  osc.start(at);
  osc.stop(at + Math.max(0.2, decay + 0.1));
  return gain;
}

/** A piece of noise through a filter. */
function noise(ctx, at, peak, decay, filter) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  let node = src;
  if (filter) {
    const shaped = ctx.createBiquadFilter();
    shaped.type = filter.type || "highpass";
    shaped.frequency.value = filter.freq || 6000;
    if (filter.q) shaped.Q.value = filter.q;
    src.connect(shaped);
    node = shaped;
  }
  const gain = shape(ctx, at, peak, decay);
  node.connect(gain);
  src.start(at);
  src.stop(at + Math.max(0.08, decay + 0.05));
  return gain;
}

const VOICES = {
  kick(ctx, dest, at, freq, dur, gain) {
    tone(ctx, "sine", Math.max(90, freq), at, gain, 0.42, { to: 46, over: 0.18 }).connect(dest);
  },
  snare(ctx, dest, at, freq, dur, gain) {
    noise(ctx, at, gain * 0.9, 0.22, { type: "bandpass", freq: 1900, q: 0.9 }).connect(dest);
    tone(ctx, "triangle", 190, at, gain * 0.5, 0.16).connect(dest);
  },
  clap(ctx, dest, at, freq, dur, gain) {
    // three quick strikes, which is what a clap is
    [0, 0.012, 0.025].forEach((offset) => {
      noise(ctx, at + offset, gain * (offset ? 0.5 : 0.85), 0.12, { type: "bandpass", freq: 1400, q: 1.1 }).connect(dest);
    });
  },
  hat(ctx, dest, at, freq, dur, gain) {
    noise(ctx, at, gain * 0.5, 0.05, { type: "highpass", freq: 8200 }).connect(dest);
  },
  tom(ctx, dest, at, freq, dur, gain) {
    tone(ctx, "sine", 230, at, gain, 0.28, { to: 110, over: 0.2 }).connect(dest);
  },
  bass(ctx, dest, at, freq, dur, gain) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq / 2;
    const low = ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 460;
    const end = shape(ctx, at, gain, Math.max(0.16, dur));
    osc.connect(low);
    low.connect(end);
    end.connect(dest);
    osc.start(at);
    osc.stop(at + 0.7);
  },
  piano(ctx, dest, at, freq, dur, gain) {
    tone(ctx, "sine", freq, at, gain, 0.8).connect(dest);
    tone(ctx, "sine", freq * 2, at, gain * 0.3, 0.5).connect(dest);
  },
  guitar(ctx, dest, at, freq, dur, gain) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    const low = ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.setValueAtTime(3200, at);
    low.frequency.exponentialRampToValueAtTime(520, at + 0.5);
    const end = shape(ctx, at, gain * 0.8, 0.7);
    osc.connect(low);
    low.connect(end);
    end.connect(dest);
    osc.start(at);
    osc.stop(at + 0.9);
  },
  brass(ctx, dest, at, freq, dur, gain) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    const low = ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 1600;
    const end = shape(ctx, at, gain * 0.7, Math.max(0.2, dur));
    osc.connect(low);
    low.connect(end);
    end.connect(dest);
    osc.start(at);
    osc.stop(at + 0.6);
  },
  flute(ctx, dest, at, freq, dur, gain) {
    const end = tone(ctx, "sine", freq, at, gain * 0.75, Math.max(0.25, dur));
    end.connect(dest);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const depth = ctx.createGain();
    depth.gain.value = freq * 0.012;
    lfo.connect(depth);
    lfo.start(at);
    lfo.stop(at + 0.8);
  },
  marimba(ctx, dest, at, freq, dur, gain) {
    tone(ctx, "sine", freq, at, gain, 0.35).connect(dest);
    tone(ctx, "sine", freq * 4, at, gain * 0.2, 0.12).connect(dest);
  },
  strings(ctx, dest, at, freq, dur, gain) {
    [-6, 6].forEach((cents) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq * Math.pow(2, cents / 1200);
      const low = ctx.createBiquadFilter();
      low.type = "lowpass";
      low.frequency.value = 2200;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.0001, at);
      gainNode.gain.linearRampToValueAtTime(gain * 0.4, at + 0.16);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, at + Math.max(0.4, dur));
      osc.connect(low);
      low.connect(gainNode);
      gainNode.connect(dest);
      osc.start(at);
      osc.stop(at + dur + 0.3);
    });
  },
};

/** One strike of an instrument, at a moment on the sound engine's own clock. */
export function hit(ctx, dest, id, at, freq, dur, gain) {
  const voice = VOICES[id] || VOICES.piano;
  voice(ctx, dest, at, freq, dur, gain);
}