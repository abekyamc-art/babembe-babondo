/**
 * Room sound effects, made on the phone itself so there is nothing to download.
 * An effect is posted as a room line, and every phone that sees the line plays
 * the same sound — so the whole room hears it together.
 */
export const EFFECTS = [
  { id: "applause", name: "Applause", emoji: "👏" },
  { id: "cheer", name: "Cheer", emoji: "🎉" },
  { id: "sparkle", name: "Sparkle", emoji: "✨" },
  { id: "drum", name: "Drum", emoji: "🥁" },
  { id: "horn", name: "Horn", emoji: "📣" },
  { id: "laugh", name: "Laugh", emoji: "😂" },
];

let context = null;

function audio() {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!context) context = new Ctor();
  if (context.state === "suspended") context.resume().catch(() => {});
  return context;
}

function tone(ac, { freq, to, type = "sine", dur = 0.3, gain = 0.18, delay = 0 }) {
  const osc = ac.createOscillator();
  const level = ac.createGain();
  const start = ac.currentTime + delay;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, start + dur);
  level.gain.setValueAtTime(0.0001, start);
  level.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  level.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(level).connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

function noise(ac, { dur = 0.6, gain = 0.16, freq = 1200, q = 0.9, attack = 0.06, delay = 0 }) {
  const length = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;

  const source = ac.createBufferSource();
  source.buffer = buffer;
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = freq;
  band.Q.value = q;
  const level = ac.createGain();
  const start = ac.currentTime + delay;
  level.gain.setValueAtTime(0.0001, start);
  level.gain.exponentialRampToValueAtTime(gain, start + attack);
  level.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  source.connect(band).connect(level).connect(ac.destination);
  source.start(start);
  source.stop(start + dur + 0.05);
}

/** Plays one effect out loud. Silent when the device can't make sound. */
export function playEffect(id) {
  if (!id) return;
  const ac = audio();
  if (!ac) return;

  if (id === "applause") {
    noise(ac, { dur: 1.1, gain: 0.16, freq: 1400, q: 0.7, attack: 0.12 });
    noise(ac, { dur: 0.9, gain: 0.1, freq: 2600, q: 0.6, attack: 0.2, delay: 0.05 });
    return;
  }
  if (id === "cheer") {
    noise(ac, { dur: 1.2, gain: 0.14, freq: 900, q: 0.8, attack: 0.18 });
    tone(ac, { freq: 420, to: 880, dur: 0.8, gain: 0.07, type: "triangle" });
    return;
  }
  if (id === "sparkle") {
    [988, 1319, 1760].forEach((freq, index) =>
      tone(ac, { freq, dur: 0.35, gain: 0.1, delay: index * 0.08, type: "triangle" })
    );
    return;
  }
  if (id === "drum") {
    tone(ac, { freq: 160, to: 55, dur: 0.35, gain: 0.28 });
    noise(ac, { dur: 0.12, gain: 0.12, freq: 2200, q: 0.6, attack: 0.01 });
    return;
  }
  if (id === "horn") {
    [392, 494, 587].forEach((freq) =>
      tone(ac, { freq, dur: 0.45, gain: 0.1, type: "sawtooth" })
    );
    return;
  }
  if (id !== "laugh") return;
  // laugh: a run of short chirps
  [520, 470, 560, 430].forEach((freq, index) =>
    tone(ac, {
      freq,
      to: freq * 0.85,
      dur: 0.16,
      gain: 0.12,
      delay: index * 0.18,
      type: "square",
    })
  );
}