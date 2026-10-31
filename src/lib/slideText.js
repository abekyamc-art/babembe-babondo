/**
 * The few words the sliding puzzle is explained in, in the language the app is answering in.
 *
 * Kiswahili is written out in full. Kibembe stands beside it only where the app's own confirmed words
 * reach this far: no confirmed Kibembe words for the instructions of the puzzle exist, so the Kiswahili
 * lines stand rather than a translation the app cannot stand behind.
 */
const TEXT = {
  english: {
    title: "Slide the numbers into order",
    how: "Tap a tile standing beside the empty space to slide it in. Put 1 to 15 in order, with the empty space at the bottom-right.",
    moves: "Moves",
    solved: "✓ SOLVED! Every number stands in order.",
  },
  swahili: {
    title: "Sogeza namba kwa mpangilio",
    how: "Gusa kigae kilicho karibu na nafasi tupu ili kukisogeza. Panga 1 hadi 15 kwa mpangilio, na nafasi tupu ibaki chini kulia.",
    moves: "Hatua",
    solved: "✓ UMEMALIZA! Namba zote zimesimama kwa mpangilio.",
  },
  kibembe: {
    title: "Sogeza namba kwa mpangilio",
    how: "Gusa kigae kilicho karibu na nafasi tupu ili kukisogeza. Panga 1 hadi 15 kwa mpangilio, na nafasi tupu ibaki chini kulia.",
    moves: "Hatua",
    solved: "✓ UMEMALIZA! Namba zote zimesimama kwa mpangilio.",
  },
};

/** The puzzle's own words in a language, standing on English when the language is not known. */
export function slideText(lang) {
  return TEXT[lang] || TEXT.english;
}