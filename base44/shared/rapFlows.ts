/**
 * The kinds of rap the studio lays down — one value per choice, shared by the two
 * backend functions that write a take and perform it, so the writing and the voice
 * always agree on how fast the rap runs. The tempo each one sits at lives with the
 * studio's other options.
 */

export const FLOWS = {
  polepole: {
    id: "polepole",
    label: "Polepole",
    bpm: 96,
    speed: 0.8,
    maxWords: 5,
    density:
      "slow and laid-back: few words to the bar, syllables stretched long, plenty of breathing room between lines",
    delivery: "slow and laid-back, syllables stretched long",
  },
  kawaida: {
    id: "kawaida",
    label: "Kawaida",
    bpm: 112,
    speed: 0,
    maxWords: 8,
    density: "steady and clear: short, punchy and rhythmic, with room on the beat",
    delivery: "fast and clear",
  },
  haraka: {
    id: "haraka",
    label: "Haraka",
    bpm: 124,
    speed: 1.1,
    maxWords: 10,
    density:
      "fast and choppy: more words packed into each bar, clipped and percussive, the syllables running together",
    delivery: "fast and choppy, syllables clipped and running together",
  },
  sana: {
    id: "sana",
    label: "Haraka sana",
    bpm: 144,
    speed: 1.2,
    maxWords: 12,
    density:
      "rapid-fire and aggressive: as many short words as fit in the bar, chant-like, one bar rolling straight into the next, repetition welcome",
    delivery: "rapid-fire and aggressive, barely a breath between words",
  },
};

export const DEFAULT_FLOW = "kawaida";

/** The kind of rap that was chosen; anything unrecognised is the usual one. */
export function flowOf(value: any): any {
  const id = typeof value === "string" ? value : "";
  return FLOWS[id] || FLOWS[DEFAULT_FLOW];
}

/** What the chosen flow asks of the writing, for the rapper's prompt. */
export function flowStyle(flow: any): string {
  return (
    "- This rap is a " +
    flow.label +
    " flow — " +
    flow.density +
    ". Write each bar with at most " +
    flow.maxWords +
    " Ebembe words."
  );
}