/**
 * Stage directions written between brackets — [curious], [laughs], (softly) — are notes to a
 * voice, never words for a person to read. Every line the assistant gives is put through here
 * before it reaches the screen, so a cue is taken out whole instead of being left standing as
 * the word inside it.
 */
const BRACKETED = /[([][^)\]]*[)\]]/g;

/** The same line with every bracketed cue taken out of it. */
export function withoutCues(value) {
  return String(value ?? "")
    .replace(BRACKETED, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}