/**
 * The admin's saved words, and the rules a rapped word is held to. The Rap Studio and the
 * voice assistant both read their vocabulary from here — the admin's one knowledge document, the
 * word entries saved before it existed, and the words the saved documents spell out themselves — so
 * the two can never drift apart.
 */

import { docWordRows, publishedDoc } from "./knowledgeDoc.ts";

export const MAX_TERM = 40;
export const MAX_MEANING = 110;
export const MAX_USAGE = 90;

// the prefixes the list allows a listed verb to wear, joined exactly as the list joins them
export const PREFIXES = ["na", "a", "ba"];

// a saved list in the thousands is read page by page, so all of it is taken in
const WORDS_PER_PAGE = 500;
const MAX_WORDS_READ = 20000;
const MAX_DOCS = 20;
const MAX_MEANING_WORDS = 4;

export function clean(value: any, max: number): string {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return text.slice(0, max);
}

// a rule mark in the term itself — a slash, a semicolon, an equals sign, a spaced dash —
// belongs to a rule, and a rule is never rapped
const NOT_A_TERM = /[\/;=]|\s[-–—]\s|\d|[.!?]/;
// A meaning is a short translation and nothing else. A full stop, a comma, a semicolon, a
// slash or an equals sign means the line was a note or a list of variants, not a meaning;
// so does a run of a- / ba- / o- / bo- conjugations.
// a hyphen inside a word is a syllable run or a conjugation dump, never a translation
const NOT_A_MEANING = /[\d!?.,:;\/=]|\s[-–—]\s|\b(?:a|ba|o|bo|na|ni|tu)-|\S+-\S+/;

// the words that only ever sit inside a sentence or a note about a word: a translation
// carrying one of these is a phrase, not the short gloss a rapped word needs
const MEANING_STOP = new Set([
  "a",
  "an",
  "the",
  "of",
  "to",
  "for",
  "is",
  "are",
  "was",
  "were",
  "with",
  "this",
  "that",
  "it",
  "in",
  "on",
  "at",
  "by",
  "as",
  "from",
  "and",
  "or",
  "but",
  "if",
  "then",
  "than",
  "when",
  "which",
  "who",
  "you",
  "your",
  "we",
  "our",
  "they",
  "their",
  "he",
  "she",
  "his",
  "her",
  "my",
  "us",
  "not",
  "no",
  "yes",
  "ready",
  "instruction",
  "instructions",
  "user",
  "users",
  "story",
  "recording",
  "taught",
  "brought",
  "copy",
  "example",
  "note",
  "page",
  "part",
  "section",
  "meaning",
  "word",
  "words",
  "rule",
  "rules",
  "sentence",
  "these",
  "those",
  "them",
  "have",
  "has",
  "had",
  "will",
  "would",
  "can",
  "could",
  "should",
  "must",
  "never",
  "always",
  "every",
  "each",
  "all",
  "both",
  "some",
  "any",
  "more",
  "most",
  "other",
  "another",
  "such",
  "same",
  "too",
  "very",
  "just",
  "also",
  "complete",
  "forms",
  "form",
  "list",
  "lists",
  "order",
  "system",
  "through",
  "letter",
  "letters",
  "sound",
  "sounds",
  "spelling",
  "written",
  "speak",
  "spoken",
  "called",
  "means",
  "name",
  "names",
  "title",
  // the words a note about the language itself is written in
  "kibembe",
  "ebembe",
  "kiswahili",
  "mfumo",
  "kamili",
  "lugha",
  "neno",
  "maneno",
  "sentensi",
  "kanuni",
  "sheria",
  "jina",
  "majina",
  "msemo",
  "misemo",
  "kitenzi",
  "mfano",
  "nyakati",
  "umoja",
  "wingi",
  "kama",
  "hii",
  "hiyo",
  "hivi",
  "pia",
  "katika",
  "baada",
  "cha",
  "kwa",
]);

// words that are only ever written *about* words: a heading, a rule, a note or a page label.
// An entry spelled only in these is not a word to rap.
const ABOUT_WORDS = new Set([
  "english",
  "american",
  "swahili",
  "kiswahili",
  "kibembe",
  "ebembe",
  "kitenzi",
  "mfano",
  "pronunciation",
  "reading",
  "rules",
  "rule",
  "word",
  "words",
  "example",
  "note",
  "notes",
  "page",
  "part",
  "section",
  "lesson",
  "vocabulary",
  "meaning",
  "plural",
  "singular",
  "wingi",
  "umoja",
  "nyakati",
  "sana",
  "na",
  "no",
  "verb",
  "tense",
  "the",
  "and",
  "only",
  "not",
  "does",
  "sasa",
  "zamani",
  "baadaye",
  "zaidi",
  "husomwa",
]);

/**
 * A rapped word has to be a word: a whole spelling of at least three letters, with a short
 * translation beside it. A rule, a heading, a syllable fragment, a page marker or a note
 * about grammar that was saved as an entry is not one, and it never reaches the rapper.
 */
export function isWordEntry(term: string, meaning: string): boolean {
  if (!term || !meaning) return false;
  if (term.length > MAX_TERM || meaning.length > MAX_MEANING) return false;
  // one word, one translation: an entry whose term is a phrase was lifted out of a document,
  // not saved as a word to rap
  if (term.split(/\s+/).length > 1 || meaning.split(/\s+/).length > MAX_MEANING_WORDS) return false;
  // an entry that translates itself is a transliteration, not a meaning
  if (meaning.toLowerCase() === term.toLowerCase()) return false;
  if (term.replace(/[^\p{L}]/gu, "").length < 3) return false;
  if (!/^[\p{L}\p{N}'’&.\- ]+$/u.test(term)) return false;
  if (/^\d+\s*[.)]/.test(term)) return false;
  // a heading stands in capitals: no real Ebembe word is written that way
  if (term.length > 1 && !/[a-zà-ÿ]/.test(term)) return false;
  if (NOT_A_TERM.test(term) || NOT_A_MEANING.test(meaning)) return false;
  // a translation made of sentence words is a note, not the short gloss a word needs
  const gloss = meaning.toLowerCase().split(/\s+/);
  if (gloss.some((word) => MEANING_STOP.has(word.replace(/[^a-z]/g, "")))) return false;
  // a gloss that ends in h is a transliterated sound rather than a translation: Kiswahili and
  // English glosses do not end that way, while a written-out pronunciation does
  if (gloss.some((word) => word.length > 1 && /h$/.test(word.replace(/[^a-z]/g, "")))) return false;
  // an entry spelled only in words about words is a heading or a rule, not a word
  const tokens = term.toLowerCase().split(/\s+/);
  if (tokens.every((token) => ABOUT_WORDS.has(token))) return false;
  return true;
}

/** A saved entry whose translation turned into a run of conjugated forms still carries its
 *  real gloss first, so that is taken and the run after it is dropped. An entry that is nothing
 *  but forms — the word conjugated and no translation — has no gloss at all. */
export function glossOf(term: string, raw: any): string {
  let text = clean(raw, MAX_MEANING);
  // a leading letter and a dash mark a form of the word, not its meaning
  const after = text.match(/^[^\s—–-]{0,4}\s*[—–]\s*(.*)$/);
  if (after) text = after[1].trim();

  if (/\S+-\S+/.test(text)) {
    const parts: string[] = [];
    for (const token of text.split(/\s+/)) {
      if (/\S+-\S+/.test(token)) break;
      if (token.toLowerCase() === term.toLowerCase()) break;
      parts.push(token);
    }
    text = parts.join(" ");
  }

  return clean(text, MAX_MEANING).replace(/[\s\/;,]+$/, "");
}

/** A word a saved document spells out itself, written as term = meaning. */
function minedLines(text: any): any[] {
  const out: any[] = [];
  const body = typeof text === "string" ? text : "";
  body.split(/\r?\n/).forEach((line) => {
    const pair = line.match(/^\s*([^=]{2,40}?)\s*=\s*([^=]{2,80}?)\s*$/);
    if (!pair) return;
    out.push({ term: clean(pair[1], MAX_TERM), meaning: clean(pair[2], MAX_MEANING) });
  });
  return out;
}

/**
 * Every word the app holds. The admin's one knowledge document stands first, because what it says a
 * word is, is what the word is — it is the newest thing they have written and the only thing every
 * AI is promised. A spelling the document does not carry is then taken from the word entries saved
 * before it existed, and from the words the saved documents spell out themselves, so nothing that
 * was saved earlier is lost. One spelling of a word is only ever taken once.
 */
export async function knowledgeWordRows(base44: any): Promise<any[]> {
  const rows: any[] = [];
  const seen = new Set<string>();

  const add = (row: any) => {
    const key = clean(row?.term, MAX_TERM).toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  };

  const doc = await publishedDoc(base44);
  if (doc) docWordRows(doc).forEach(add);

  let cursor: string | undefined;

  while (rows.length < MAX_WORDS_READ) {
    const options: any = { limit: WORDS_PER_PAGE };
    if (cursor) options.cursor = cursor;
    const page = await base44.asServiceRole.entities.AssistantKnowledge.filter(
      { kind: "word" },
      options
    );
    const fresh = (Array.isArray(page) ? page : page?.items || []).filter(
      (row: any) => row?.term
    );
    fresh.forEach(add);

    const next = page?.has_more ? page?.next_cursor : "";
    if (!next) break;
    cursor = next;
  }

  const texts = await base44.asServiceRole.entities.KnowledgeText.list({
    limit: MAX_DOCS,
    fields: ["text", "passages"],
  });
  (texts?.items || []).forEach((doc: any) => {
    minedLines(doc?.text).forEach(add);
    (doc?.passages || []).forEach((passage: any) => minedLines(passage).forEach(add));
  });

  return rows;
}

/** The words the admin has confirmed, exactly as they are saved: every word entry, plus any
 *  word the saved documents spell out themselves. Each one has to be a real word, and the
 *  same spelling is only ever taken once. */
export async function savedWords(base44: any) {
  const rows = await knowledgeWordRows(base44);
  const seen = new Set<string>();
  return rows
    .map((row: any) => {
      const term = clean(row.term, MAX_TERM);
      return {
        term,
        meaning: glossOf(term, row.meaning),
        usage: clean(row.usage, MAX_USAGE),
      };
    })
    .filter((word: any) => {
      if (!isWordEntry(word.term, word.meaning)) return false;
      const key = word.term.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Every confirmed spelling, so what the model hands back is kept as the list writes it. */
export function knownMap(words: any[]): Map<string, string> {
  const map = new Map<string, string>();
  words.forEach((word: any) => map.set(word.term.toLowerCase(), word.term));
  return map;
}

export function tokensOf(line: any): string[] {
  return String(line?.ebembe || "")
    .split(/\s+/)
    .map((token) => token.replace(/[^\p{L}'’-]/gu, "").toLowerCase())
    .filter(Boolean);
}

/** Whether a word a line uses is one the store really holds, joined prefix and all. */
export function knownToken(token: string, known: Map<string, string>): boolean {
  if (known.has(token)) return true;
  return PREFIXES.some((prefix) => {
    if (!token.startsWith(prefix) || token.length <= prefix.length + 2) return false;
    const bare = token.startsWith(prefix + "-")
      ? token.slice(prefix.length + 1)
      : token.slice(prefix.length);
    return known.has(bare);
  });
}

/** The bars that lean on a word the store does not hold, with the words that were not found. */
export function unverified(lines: any[], known: Map<string, string>) {
  return lines
    .map((line: any, index: number) => ({
      index,
      unknown: tokensOf(line).filter((token) => !knownToken(token, known)),
    }))
    .filter((row: any) => row.unknown.length);
}