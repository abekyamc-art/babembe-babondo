/**
 * The game's own ear and hand: short sounds made by the phone itself — nothing is downloaded — and a
 * light tap of the phone's own vibration. Both are the player's to switch off, and both stay silent if
 * the phone will not give them.
 */
let ctx = null;

function audio() {
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, after, dur, gain = 0.13, type = "sine") {
  const ac = audio();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const start = ac.currentTime + after;
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(amp);
    amp.connect(ac.destination);
    osc.start(start);
    osc.stop(start + dur + 0.03);
  } catch {
    /* a sound that will not play changes nothing */
  }
}

export const sfx = {
  found(on) {
    if (!on) return;
    tone(880, 0, 0.12);
    tone(1320, 0.09, 0.16);
  },
  wrong(on) {
    if (!on) return;
    tone(220, 0, 0.16, 0.11, "triangle");
    tone(160, 0.1, 0.2, 0.09, "triangle");
  },
  hint(on) {
    if (!on) return;
    tone(660, 0, 0.12, 0.11);
    tone(990, 0.1, 0.18, 0.11);
  },
  win(on) {
    if (!on) return;
    [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.12, 0.3));
  },
  lose(on) {
    if (!on) return;
    [440, 392, 330, 262].forEach((f, i) => tone(f, i * 0.14, 0.3, 0.11));
  },
};

/** A short tap of the phone's own hand, when the player has left it on. */
export function buzz(pattern, on) {
  if (!on) return;
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    /* a phone without it simply does not shake */
  }
}