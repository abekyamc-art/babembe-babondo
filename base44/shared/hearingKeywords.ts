import { MAX_TERM, clean, knowledgeWordRows } from "./knowledgeWords.ts";
import { knowledgeStamp } from "./wordBank.ts";

// The hearing service behind every call knows no Kibembe at all: a word it was never taught comes
// back as the English or Kiswahili word it nearly sounds like, and every answer follows that wrong
// text. It does take words of the app's own, though, so the admin's saved Ebembe words ride with
// every turn and what the person says comes back spelled the way the app already holds it.
//
// Two readers are pointed at them, and each takes a different amount:
//
// - A call's own hearing service takes fifty words, twenty characters each, so it is handed the
//   saved words alone and only the ones it most needs pointing at.
// - The app's own ears take a thousand terms of fifty characters each, five words at most, so they
//   are handed the saved expressions as well — "ole bile" said whole is exactly what a word-by-word
//   reading gets wrong, and it is the phrase the person is practising.
const KEYWORD_LIMIT = 50;
// what the app's own ears are given: how many terms, how long one may be, and how many words
const EAR_LIMIT = 100;
const EAR_CHARS = 50;
const EAR_WORDS = 5;

// The letter runs no English or Kiswahili word carries. A word wearing one has nothing for the
// service to fall back on, so those are the words pointed at first, the longest of them ahead.
const CLUSTERS = ["ny", "ng", "mb", "nk", "nd", "nt", "mv", "bv", "hw", "bw", "gw", "kw", "by"];

// the name of the language itself: always heard, and always written the same way
const ALWAYS = ["Ebembe", "Kibembe"];

/** How much a saved word needs the service pointed at it. */
export function keywordScore(term: string): number {
  const word = term.toLowerCase();
  // Letters past a handful say nothing about whether the word ever gets said, and a very
  // long word would otherwise take a place an everyday one is the one that needs.
  let score = Math.min(word.length, 6);
  CLUSTERS.forEach((cluster) => {
    if (word.includes(cluster)) score += 4;
  });
  return score;
}

/** The saved words the hearing service is pointed at: one spelling each, single words only, the
 *  ones it would otherwise turn into English or Kiswahili words first. */
export function hearingKeywords(rows: any[]): string[] {
  const seen = new Set(ALWAYS.map((word) => word.toLowerCase()));
  const found: { term: string; score: number }[] = [];

  rows.forEach((row: any) => {
    const term = clean(row?.term, MAX_TERM);
    // One plain word, and nothing else: a phrase, a syllable run joined by dashes, a rule or a
    // heading is not something the person says, and pointing the service at it would only make
    // it write dashes and headings back.
    if (!/^[\p{L}'’]{3,}$/u.test(term)) return;
    const key = term.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ term, score: keywordScore(term) });
  });

  found.sort((a, b) => b.score - a.score);
  return [...ALWAYS, ...found.slice(0, KEYWORD_LIMIT - ALWAYS.length).map((row) => row.term)];
}

/**
 * One saved expression the app's own ears can be pointed at, or nothing at all: letters, spaces and
 * apostrophes, up to five words, and never a note, a heading, a translation or a run of syllables.
 */
function earTerm(value: any): string {
  const term = clean(value, MAX_TERM).replace(/\s+/g, " ");
  if (!term || term.length > EAR_CHARS) return "";
  if (!/^[\p{L}'’][\p{L}'’ ]*$/u.test(term)) return "";
  const words = term.split(" ");
  if (words.length > EAR_WORDS) return "";
  return words.some((word) => word.length >= 3) ? term : "";
}

/**
 * What the app's own ears are pointed at: the saved Ebembe words, and the saved expressions with
 * them. The Kibembe the person is practising is what has to come back in the app's own letters, so
 * the expressions lead — a phrase read word by word is what the ears get most wrong — and behind
 * them come the words written most recently, which are the ones being practised now.
 */
export function earKeywords(rows: any[]): string[] {
  const seen = new Set(ALWAYS.map((word) => word.toLowerCase()));
  const found: { term: string; phrase: boolean; at: number; score: number }[] = [];

  rows.forEach((row: any) => {
    const term = earTerm(row?.term);
    if (!term) return;
    const key = term.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    found.push({
      term,
      phrase: term.includes(" "),
      at: Date.parse(row?.updated_date || row?.created_date || "") || 0,
      score: keywordScore(term),
    });
  });

  found.sort(
    (a, b) => Number(b.phrase) - Number(a.phrase) || b.at - a.at || b.score - a.score
  );
  return [...ALWAYS, ...found.slice(0, EAR_LIMIT - ALWAYS.length).map((row) => row.term)];
}

// The words are read once per call, not once per turn, and the held copy is dropped the moment the
// store moves: a word the admin has just saved is pointed at on the very next turn, while a call
// that changes nothing still reads the list once.
const CACHE_MS = 60000;

/** One list of terms the hearing is pointed at, held while the store is unchanged. */
function heldTerms(build: (rows: any[]) => string[]) {
  let held: { at: number; stamp: string; words: string[] } = { at: 0, stamp: "", words: [] };
  return async (base44: any): Promise<string[]> => {
    const stamp = await knowledgeStamp(base44);
    if (held.words.length && stamp && held.stamp === stamp && Date.now() - held.at < CACHE_MS) {
      return held.words;
    }
    try {
      const rows = await knowledgeWordRows(base44);
      held = { at: Date.now(), stamp, words: build(rows) };
      return held.words;
    } catch (error: any) {
      console.error("The saved words could not be read for the hearing service:", error?.message);
      return held.words;
    }
  };
}

/** The admin's saved words as recognition keywords for a call's own hearing, held while unchanged. */
export const recognitionKeywords = heldTerms(hearingKeywords);

/** The saved words and expressions the app's own ears are pointed at, held while unchanged. */
export const earKeyTerms = heldTerms(earKeywords);