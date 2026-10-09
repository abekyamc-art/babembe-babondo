/**
 * The beat the studio builds by hand: a grid of sixteen steps to the bar, one row for each
 * instrument, and a kit to start from when the beat is asked for automatically. The grid is played
 * out on the phone into one sound, which is then used exactly like any other beat.
 */

import { hit, instrumentOf } from "@/lib/instruments";

export const STEPS = 16;
const RATE = 44100;
// a melodic row walks these notes as its steps come, so a line is made without any note editing
const MELODY = [0, 4, 7, 12, 7, 4];

/** The kits the automatic setting starts from: which instrument plays which steps of the bar. */
const KITS = {
  afro: {
    kick: [0, 4, 6, 10],
    clap: [4, 12],
    hat: [0, 2, 4, 6, 8, 10, 12, 14],
    tom: [8, 15],
    bass: [0, 3, 6, 8, 11, 14],
    marimba: [1, 5, 9, 13],
  },
  bongo: {
    kick: [0, 7, 8],
    snare: [4, 12],
    hat: [2, 6, 10, 14],
    tom: [3, 9, 11, 15],
    bass: [0, 4, 8, 12],
    guitar: [2, 6, 10, 14],
  },
  dancehall: {
    kick: [0, 9],
    clap: [4, 12],
    hat: [2, 6, 10, 14],
    bass: [0, 3, 8, 11],
    brass: [4, 12],
  },
  trap: {
    kick: [0, 6, 10],
    snare: [8],
    hat: [0, 2, 4, 6, 8, 10, 12, 14],
    clap: [12],
    bass: [0, 5, 8, 13],
  },
};

export const BEAT_STYLES = [
  { id: "afro", label: "Afro-Zaga" },
  { id: "bongo", label: "Bongo Flava" },
  { id: "dancehall", label: "Dancehall" },
  { id: "trap", label: "Trap" },
];

export function styleLabel(id) {
  return (BEAT_STYLES.find((one) => one.id === id) || BEAT_STYLES[0]).label;
}

function patternOf(steps) {
  const row = new Array(STEPS).fill(false);
  (steps || []).forEach((step) => {
    if (step >= 0 && step < STEPS) row[step] = true;
  });
  return row;
}

let made = 0;
function rowId(instrument) {
  made += 1;
  return `${instrument}-${made}`;
}

/** A row with nothing on it yet. */
export function emptyRow(instrument) {
  const one = instrumentOf(instrument);
  return {
    id: rowId(instrument),
    instrument,
    steps: patternOf([]),
    volume: one.kind === "drum" ? 0.85 : 0.6,
  };
}

/** A whole kit, laid out and ready to be changed by hand. */
export function rowsFor(style) {
  const kit = KITS[style] || KITS.afro;
  return Object.entries(kit).map(([instrument, steps]) => {
    const one = instrumentOf(instrument);
    return {
      id: rowId(instrument),
      instrument,
      steps: patternOf(steps),
      volume: one.kind === "drum" ? 0.85 : 0.6,
    };
  });
}

/**
 * The grid played out into one sound. A drum is struck at its own pitch; a melodic row walks the
 * notes above the root the beat is built on.
 */
export async function renderGrid({ rows, bpm, bars = 2, rootPc = 9, sampleRate = RATE }) {
  const tempo = Math.min(180, Math.max(60, Number(bpm) || 112));
  const stepSeconds = 60 / tempo / 4;
  const span = Math.max(1.5, bars * STEPS * stepSeconds + 0.4);
  const ctx = new OfflineAudioContext(2, Math.ceil(span * sampleRate), sampleRate);
  const root = 440 * Math.pow(2, (12 * 4 + rootPc - 69) / 12);

  (rows || []).forEach((row) => {
    const one = instrumentOf(row.instrument);
    let sung = 0;
    for (let bar = 0; bar < bars; bar += 1) {
      for (let step = 0; step < STEPS; step += 1) {
        if (!row.steps || !row.steps[step]) continue;
        const at = (bar * STEPS + step) * stepSeconds;
        const freq = one.kind === "drum" ? 120 : root * Math.pow(2, MELODY[sung % MELODY.length] / 12);
        hit(ctx, ctx.destination, row.instrument, at, freq, stepSeconds * 1.8, row.volume);
        sung += 1;
      }
    }
  });

  return ctx.startRendering();
}

/** How many steps of the bar are filled, so the grid can say what it holds. */
export function filledSteps(rows) {
  return (rows || []).reduce((total, row) => total + row.steps.filter(Boolean).length, 0);
}