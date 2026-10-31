/**
 * The few words the sliding puzzle is explained in, in the language the app is answering in.
 *
 * Kiswahili is written out in full. Kibembe stands beside it only where the app's own confirmed words
 * reach this far: no confirmed Kibembe words for the instructions of the puzzle exist, so the Kiswahili
 * lines stand rather than a translation the app cannot stand behind.
 *
 * The last number of a board is asked for, so the same words explain the easy eight-number board and the
 * medium fifteen-number one.
 */
const TEXT = {
  english: {
    title: "Slide the numbers into order",
    how: (last) =>
      `Tap a tile standing beside the empty space to slide it in. Put 1 to ${last} in order, with the empty space at the bottom-right.`,
    moves: "Moves",
    solved: "✓ SOLVED! Every number stands in order.",
    easy: "Easy",
    medium: "Medium",
  },
  swahili: {
    title: "Sogeza namba kwa mpangilio",
    how: (last) =>
      `Gusa kigae kilicho karibu na nafasi tupu ili kukisogeza. Panga 1 hadi ${last} kwa mpangilio, na nafasi tupu ibaki chini kulia.`,
    moves: "Hatua",
    solved: "✓ UMEMALIZA! Namba zote zimesimama kwa mpangilio.",
    easy: "Rahisi",
    medium: "Wastani",
  },
  kibembe: {
    title: "Sogeza namba kwa mpangilio",
    how: (last) =>
      `Gusa kigae kilicho karibu na nafasi tupu ili kukisogeza. Panga 1 hadi ${last} kwa mpangilio, na nafasi tupu ibaki chini kulia.`,
    moves: "Hatua",
    solved: "✓ UMEMALIZA! Namba zote zimesimama kwa mpangilio.",
    easy: "Rahisi",
    medium: "Wastani",
  },
};

/** The puzzle's own words in a language, standing on English when the language is not known. */
export function slideText(lang, last = 8) {
  const base = TEXT[lang] || TEXT.english;
  return { ...base, how: base.how(last) };
}