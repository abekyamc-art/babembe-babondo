import { MAX_TERM, clean, knowledgeWordRows } from "./knowledgeWords.ts";
import { knowledgeStamp } from "./wordBank.ts";

// The hearing service behind every call knows no Kibembe at all: a word it was never taught comes
// back as the English or Kiswahili word it nearly sounds like, and every answer follows that wrong
// text. It does take words of the app's own, though, so the admin's saved Ebembe words ride with
// every turn — up to the fifty it accepts — and what the person says comes back spelled the way the
// app already holds it.
const KEYWORD_LIMIT = 50;

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

// The words are read once per call, not once per turn, and the held copy is dropped the moment the
// store moves: a word the admin has just saved is pointed at on the very next turn, while a call
// that changes nothing still reads the list once.
const CACHE_MS = 60000;
let cache: { at: number; stamp: string; words: string[] } = { at: 0, stamp: "", words: [] };

/** The admin's saved words as recognition keywords, held while the store is unchanged. */
export async function recognitionKeywords(base44: any): Promise<string[]> {
  const stamp = await knowledgeStamp(base44);
  if (cache.words.length && stamp && cache.stamp === stamp && Date.now() - cache.at < CACHE_MS) {
    return cache.words;
  }
  try {
    const rows = await knowledgeWordRows(base44);
    cache = { at: Date.now(), stamp, words: hearingKeywords(rows) };
    return cache.words;
  } catch (error: any) {
    console.error("The saved words could not be read for the hearing service:", error?.message);
    return cache.words;
  }
}