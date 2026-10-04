import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { flowOf, flowStyle } from "../../shared/rapFlows.ts";
import { LANG_NAME, rapLang, usesStore, type RapLang } from "../../shared/rapLangs.ts";

const UNAVAILABLE = "Mawazo hayakuweza kutengenezwa. Jaribu tena baada ya sekunde chache.";
const EMPTY_LIST =
  "Hakuna maneno ya Kibembe yaliyohifadhiwa bado. Ongeza maneno kwenye Assistant knowledge kwanza.";
const MIN_BARS = 4;
const PAGE = 400;
const MAX_POOL = 1200;
// the words handed to the model in one plan: a fresh window of the pool, so the same handful
// of words stops coming back take after take
const MAX_WINDOW = 140;
const MIN_SPARE = 6;
const MAX_TERM = 40;
const MAX_MEANING = 110;
const MAX_USAGE = 90;
const MAX_LINES = 80;
// the plan's own words carry a take, but a plan of only a handful is too thin to rap on, so the
// whole saved list stands behind the writer instead
const MIN_CHOSEN = 8;
const MAX_IDEAS = 3;
const MAX_PLAN = 40;

const LINE_SCHEMA = {
  type: "object",
  properties: {
    section: { type: "string" },
    ebembe: { type: "string" },
    swahili: { type: "string" },
  },
  required: ["section", "ebembe", "swahili"],
};

// one call plans the words and offers the angles, so nothing is charged until a take is made
const IDEAS_SCHEMA = {
  type: "object",
  properties: {
    plan: { type: "array", items: { type: "string" } },
    ideas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          hook: { type: "string" },
          hook_swahili: { type: "string" },
          words_used: { type: "array", items: { type: "string" } },
          lines: { type: "array", items: LINE_SCHEMA },
        },
        required: ["name", "hook", "hook_swahili", "words_used", "lines"],
      },
    },
  },
  required: ["plan", "ideas"],
};

const LINES_SCHEMA = {
  type: "object",
  properties: {
    lines: { type: "array", items: LINE_SCHEMA },
    words_used: { type: "array", items: { type: "string" } },
  },
  required: ["lines", "words_used"],
};

// the one corrective pass: bars written again from the confirmed words alone
const FIX_SCHEMA = {
  type: "object",
  properties: {
    lines: { type: "array", items: LINE_SCHEMA },
  },
  required: ["lines"],
};

// the reading of a planned word list: the entries that really are words
const VERIFY_SCHEMA = {
  type: "object",
  properties: {
    keep: { type: "array", items: { type: "string" } },
  },
  required: ["keep"],
};

function clean(value: any, max: number): string {
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
const MAX_MEANING_WORDS = 4;

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
function isWordEntry(term: string, meaning: string): boolean {
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

/** A pronunciation guide is the assistant's own: it never reaches the screen. */
function plainLine(value: any): string {
  const text = typeof value === "string" ? value : "";
  return text
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Every saved word entry, a page at a time: the whole store is in play, not a slice of it. */
async function wordEntries(base44: any): Promise<any[]> {
  const rows: any[] = [];
  let cursor: any = undefined;
  for (let page = 0; page < Math.ceil(MAX_POOL / PAGE); page += 1) {
    const found = await base44.asServiceRole.entities.AssistantKnowledge.filter(
      { kind: "word" },
      { limit: PAGE, cursor } as any
    );
    rows.push(...(found?.items || []));
    if (!found?.has_more || !found?.next_cursor || rows.length >= MAX_POOL) break;
    cursor = found.next_cursor;
  }
  return rows;
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

/** A saved entry whose translation turned into a run of conjugated forms still carries its
 *  real gloss first, so that is taken and the run after it is dropped. An entry that is nothing
 *  but forms — the word conjugated and no translation — has no gloss at all. */
function glossOf(term: string, raw: any): string {
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

/** The words the admin has confirmed, exactly as they are saved: every word entry, plus any
 *  word the saved documents spell out themselves. Each one has to be a real word, and the
 *  same spelling is only ever taken once. */
async function savedWords(base44: any) {
  const rows = await wordEntries(base44);
  const texts = await base44.asServiceRole.entities.KnowledgeText.list({ limit: 20 });
  (texts?.items || []).forEach((doc: any) => {
    rows.push(...minedLines(doc?.text));
    (doc?.passages || []).forEach((passage: any) => rows.push(...minedLines(passage)));
  });

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

/** The words of the person's own most recent takes, and what those takes were about. */
async function recentTakes(base44: any) {
  const page = await base44.entities.RapTake.filter(
    {},
    { sort: "-created_date", limit: 5, fields: ["words_used", "title"] }
  );
  const used = new Set<string>();
  const titles: string[] = [];
  (page?.items || []).forEach((row: any) => {
    (row.words_used || []).forEach((term: any) => used.add(String(term).toLowerCase()));
    if (row.title) titles.push(String(row.title).slice(0, 40));
  });
  return { used, titles };
}

/** The words offered for one plan, and the ones the recent takes already used. A store with
 *  room to spare opens a fresh window that steers clear of those words; a small one offers
 *  everything and names the words to leave for another take. */
function freshWindow(words: any[], recent: Set<string>, taken: number) {
  const fresh = words.filter((word: any) => !recent.has(word.term.toLowerCase()));

  if (fresh.length >= MIN_SPARE) {
    if (fresh.length <= MAX_WINDOW) return { list: fresh, avoid: [] as string[] };
    const start = (taken * 53 + 17) % fresh.length;
    const list: any[] = [];
    for (let i = 0; i < MAX_WINDOW; i += 1) list.push(fresh[(start + i) % fresh.length]);
    return { list, avoid: [] as string[] };
  }

  return {
    list: words,
    avoid: words
      .filter((word: any) => recent.has(word.term.toLowerCase()))
      .slice(0, 40)
      .map((word: any) => word.term),
  };
}

// the prefixes the list allows a listed verb to wear, joined exactly as the list joins them
const PREFIXES = ["na", "a", "ba"];

/** Whether a word a line uses is one the store really holds, joined prefix and all. */
function knownToken(token: string, known: Map<string, string>): boolean {
  if (known.has(token)) return true;
  return PREFIXES.some((prefix) => {
    if (!token.startsWith(prefix) || token.length <= prefix.length + 2) return false;
    const bare = token.startsWith(prefix + "-") ? token.slice(prefix.length + 1) : token.slice(prefix.length);
    return known.has(bare);
  });
}

function tokensOf(line: any): string[] {
  return String(line?.ebembe || "")
    .split(/\s+/)
    .map((token) => token.replace(/[^\p{L}'’-]/gu, "").toLowerCase())
    .filter(Boolean);
}

/** The bars that lean on a word the store does not hold, with the words that were not found. */
function unverified(lines: any[], known: Map<string, string>) {
  return lines
    .map((line: any, index: number) => ({
      index,
      unknown: tokensOf(line).filter((token) => !knownToken(token, known)),
    }))
    .filter((row: any) => row.unknown.length);
}

/** Every confirmed spelling, so what the model hands back is kept as the list writes it. */
function knownMap(words: any[]): Map<string, string> {
  const map = new Map<string, string>();
  words.forEach((word: any) => map.set(word.term.toLowerCase(), word.term));
  return map;
}

function meaningOf(term: string, words: any[]): string {
  const found = words.find((word: any) => word.term.toLowerCase() === term.toLowerCase());
  return found?.meaning || "";
}

/** A planned entry, whether it arrived as a bare word or as "word = meaning". */
function entryOf(value: any): { term: string; meaning: string } {
  if (value && typeof value === "object") {
    return { term: clean(value.term, MAX_TERM), meaning: clean(value.meaning, MAX_MEANING) };
  }
  const text = clean(value, MAX_TERM + MAX_MEANING);
  const pair = text.match(/^(.{1,40}?)\s*(?:=|—|–|\s-\s|:)\s*(.+)$/);
  if (pair) return { term: clean(pair[1], MAX_TERM), meaning: clean(pair[2], MAX_MEANING) };
  // "word (meaning)" is the other way a planned word comes back
  const paren = text.match(/^(.{1,40}?)\s*\(([^)]{1,60})\)\s*$/);
  if (paren) return { term: clean(paren[1], MAX_TERM), meaning: clean(paren[2], MAX_MEANING) };
  return { term: clean(text, MAX_TERM), meaning: "" };
}

/** The terms the model named, kept only where they really stand in the confirmed list. */
function confirmedList(values: any, known: Map<string, string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  (Array.isArray(values) ? values : []).forEach((value: any) => {
    const term = known.get(entryOf(value).term.toLowerCase());
    if (!term || seen.has(term.toLowerCase())) return;
    seen.add(term.toLowerCase());
    out.push(term);
  });
  return out;
}

function readLines(values: any): any[] {
  return (Array.isArray(values) ? values : [])
    .map((line: any) => {
      // the writer sometimes labels every bar on its own; only the hook and the body carry a
      // heading in the take
      const raw = clean(line?.section, 14).toUpperCase();
      return {
        section: raw.includes("HOOK") ? "HOOK" : "VERSE 1",
        ebembe: plainLine(line?.ebembe),
        swahili: plainLine(line?.swahili),
      };
    })
    .filter((line: any) => line.ebembe)
    .slice(0, MAX_LINES);
}

const SPELLING = [
  "- Use ONLY the Ebembe words in that list, spelled exactly as they are written there, in plain spelling with no hyphens between syllables. Never invent a word, never change a spelling, never add a word that is not in the list.",
  "- A word's meaning tells you where it fits: build each line so it says something that makes sense in Ebembe word order.",
  "- The verb prefixes na- (I), a- (he or she) and ba- (they) may be joined to a listed verb, exactly as the list shows. Never split one word into syllables with dashes, and never join two unrelated words with one.",
  "- Never use a Kiswahili or an English word inside ebembe: Kiswahili belongs only in swahili, and no English at all.",
  "- The list may be short. Repeat its words, change their order, and build each line from the words you are allowed rather than reaching for a word you do not have.",
  "- Never write a pronunciation guide, a syllable breakdown, or any text in brackets, dashes or slashes.",
  "- Never write the section name inside ebembe or swahili.",
];

/** The rules a take is written by, in its own language: a Kibembe take raps only on the saved
 *  words, Kiswahili and English take their words from the writer itself, and a mixed take leads
 *  in Kibembe from the list with Kiswahili and English around it so the phrase is understood. */
function languageRules(language: RapLang, store: boolean): string[] {
  if (language === "swahili") {
    return [
      "- Every bar is plain, everyday Kiswahili that anyone in the village understands, spelled as it is spoken.",
      "- Kiswahili only inside the bar: never an Ebembe word, never an English one.",
      "- Every bar says something real and complete, never a pile of words.",
    ];
  }
  if (language === "english") {
    return [
      "- Every bar is plain, everyday English, spelled normally.",
      "- English only inside the bar: never an Ebembe word, never a Kiswahili one.",
      "- Every bar says something real and complete, never a pile of words.",
    ];
  }
  if (language === "mix") {
    return [
      store
        ? "- Every bar mixes all three: a Kibembe lead taken ONLY from the list above, with Kiswahili and English words around it so someone who does not know Kibembe still understands the phrase."
        : "- The saved Kibembe list is empty right now: write this take in Kiswahili with English woven in, and leave Kibembe for another time.",
      store
        ? "- A Kibembe word is spelled exactly as the list spells it, with no hyphens between syllables; the verb prefixes na-, a- and ba- may be joined as the list shows."
        : "",
      "- Never write a pronunciation guide, a syllable breakdown, or any text in brackets, dashes or slashes.",
      "- Never write the section name inside the bar.",
    ];
  }
  return SPELLING;
}

/** The language the meaning line under each bar is written in. */
function meaningRule(language: RapLang): string {
  if (language === "swahili") {
    return "- Give swahili: the same line in English, so a listener learns the meaning. Keep it short.";
  }
  return "- Give swahili: the same line in Kiswahili so a listener learns the meaning. Keep it short.";
}

/** That language, named for the prompts. */
function meaningLang(language: RapLang): string {
  return language === "swahili" ? "English" : "Kiswahili";
}

function wordList(words: any[]): string {
  return words.map((word: any) => word.term + " = " + (word.meaning || "")).join("\n");
}

/** The words chosen for the theme, then three different ways into it. */
function planPrompt(
  words: any[],
  bpm: number,
  topic: string,
  flow: any,
  recentTitles: string[],
  avoid: string[],
  language: RapLang,
  store: boolean
) {
  return [
    "You are preparing a rap in " +
      LANG_NAME[language] +
      " for a voice that sings it over a fast Afro-Zaga / Bongo Flava beat at " +
      bpm +
      " BPM.",
    store
      ? "The list below is the whole of the Ebembe you may use, one word per line as term = meaning:"
      : "You choose the words yourself: pick the everyday " +
        LANG_NAME[language] +
        " words this rap will lean on, words that fit the theme and can carry a rap on it.",
    store ? wordList(words) : "",
    store
      ? "Some saved entries are not words at all: a pronunciation fragment, a spelling guide, a rule, a heading or a note about grammar. Never plan or rap one — every word you plan has to be a real Ebembe word whose meaning is a short translation."
      : "",
    avoid.length
      ? "These words were used in this person's recent takes — leave them for another time and build on the others: " +
        avoid.join(", ")
      : "Every plan has to stand on words this person has not been rapping, so no two takes come out alike.",
    "Step one — plan the words: choose up to " +
      MAX_PLAN +
      " words that suit the theme and can carry a rap on it, and return them in plan" +
      (store
        ? ", exactly as the list spells them."
        : ", each with its short " + meaningLang(language) + " meaning beside it."),
    "Step two — offer " +
      MAX_IDEAS +
      " different angles on that theme, three if you can: a different way into it, a different mood or a different scene, never three versions of one idea.",
    "For each idea give:",
    "- name: its angle in at most 5 words, in Kiswahili, so the person can tell the ideas apart at a glance.",
    '- hook: the idea\'s hook as one or two short lines in ' +
      LANG_NAME[language] +
      ' (section "HOOK"), at most ' +
      flow.maxWords +
      " words each, plain spelling.",
    "- hook_swahili: the same hook in " + meaningLang(language) + ".",
    "- words_used: the words from plan that this idea really builds on, spelled exactly as you planned them.",
    "- lines: the hook written out line by line, each line a bar with its section and its " +
      meaningLang(language) +
      " meaning.",
    "Rules, all of them strict:",
    flowStyle(flow),
    ...languageRules(language, store),
    meaningRule(language),
    recentTitles.length
      ? "These angles were already used in this person's recent takes — offer different ones: " +
        recentTitles.join("; ")
      : "",
    "The theme, when one is given, is: " + (topic || "everyday Babembe life"),
  ]
    .filter(Boolean)
    .join("\n");
}

/** The chosen angle written out in full, against the very words its plan named. */
function writePrompt(
  words: any[],
  idea: any,
  bars: number,
  bpm: number,
  topic: string,
  flow: any,
  language: RapLang,
  store: boolean
) {
  // a short take is a hook and a short body; a longer one is hook, body, hook
  const structure =
    bars <= 6
      ? 'Return exactly ' +
        bars +
        ' lines in total: the hook (section "HOOK") first, then a short body (section "VERSE 1") whose every bar says something new.'
      : 'Return exactly ' +
        bars +
        ' lines in total, in this order: a hook of 4 lines (section "HOOK"), then the body (section "VERSE 1"), then the hook again (section "HOOK").';

  return [
    "You write one rap in " +
      LANG_NAME[language] +
      " for a voice that sings it over a fast Afro-Zaga / Bongo Flava beat at " +
      bpm +
      " BPM.",
    structure,
    "This rap is one chosen angle, so stay on it: " +
      (idea?.name || "the theme") +
      ".",
    idea?.hook ? "Its hook is already set — keep it and build the rap around it: " + idea.hook : "",
    idea?.swahili ? "That hook means: " + idea.swahili : "",
    store
      ? "The list below is the whole of the Ebembe you may use, one word per line as term = meaning:"
      : "",
    store ? wordList(words) : "",
    "Rules, all of them strict:",
    ...languageRules(language, store),
    "- Each line is one bar of the beat. The hook itself comes back, and call-and-answer with the voice behind the lead is welcome, but the body never repeats a line: every body bar carries its own words and its own thought.",
    "- Never let the same word come back bar after bar: once a word has carried two bars, the bars after it take other words from the list and say the same thing another way.",
    "- Every bar says something a listener understands, and no bar leans on the same word again and again — say the thing a different way instead.",
    flowStyle(flow),
    meaningRule(language),
    store
      ? "- In words_used list the Ebembe terms you actually used, exactly as spelled in the list."
      : "- In words_used list the words you actually used.",
    "The theme, when one is given, is: " + (topic || "everyday Babembe life"),
  ]
    .filter(Boolean)
    .join("\n");
}

// how many bars a word may carry before the take is leaning on it again and again
const MAX_WORD_BARS = 2;
// a list this small cannot say the same thing another way — the bars would only come back
// reworded in the same few words — so there the take stands as it is written
const MIN_VARY_WORDS = 18;

/** The bars of the body that lean on a word the take has already leaned on twice, with the word
 *  itself. The hook is left alone: a hook comes back by design. */
function overusedBars(lines: any[]) {
  const carried = new Map<string, number>();
  const rows: { index: number; again: string[] }[] = [];

  lines.forEach((line: any, index: number) => {
    if (line?.section === "HOOK") return;
    const tokens = Array.from(new Set(tokensOf(line)));
    const again = tokens.filter((token) => (carried.get(token) || 0) >= MAX_WORD_BARS);
    tokens.forEach((token) => carried.set(token, (carried.get(token) || 0) + 1));
    if (again.length) rows.push({ index, again });
  });

  return rows;
}

/** The bars that say exactly what an earlier bar of the take already says, with the bar they
 *  copy. The hook is left alone: a hook comes back by design. */
function duplicateBars(lines: any[]) {
  const written = new Map<string, number>();
  const rows: { index: number; from: number }[] = [];

  lines.forEach((line: any, index: number) => {
    if (line?.section === "HOOK") return;
    const key = tokensOf(line).join(" ");
    if (!key) return;
    const from = written.get(key);
    if (from === undefined) written.set(key, index + 1);
    else rows.push({ index, from });
  });

  return rows;
}

/** The words of the list the take really stands on: the ones its own bars say, wearing their
 *  prefix or not. */
function wordsInTake(used: string[], lines: any[]): string[] {
  const said = new Set<string>();
  lines.forEach((line: any) => tokensOf(line).forEach((token) => said.add(token)));
  return used.filter((term) => {
    const key = term.toLowerCase();
    return said.has(key) || PREFIXES.some((prefix) => said.has(prefix + key));
  });
}

/** One more pass over the bars that have to change, so what reaches the person is written only
 *  from the words the store keeps and never leans on the same word again and again. Each note
 *  carries the reason its bar has to be written once more; nothing else about the rap moves. */
async function rewriteBars(
  base44: any,
  words: any[],
  lines: any[],
  intro: string,
  ask: string,
  targets: { index: number; note: string }[],
  flow: any
): Promise<any[] | null> {
  const prompt = [
    intro,
    "The list below is the whole of the Ebembe you may use, one word per line as term = meaning:",
    wordList(words),
    ask,
    ...targets.map((row) => row.note),
    "Return only the rewritten bars in lines, in the same order, each with its section and its swahili meaning.",
    flowStyle(flow),
    ...SPELLING,
  ].join("\n");

  try {
    const out: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: FIX_SCHEMA,
    });
    const fixed = readLines(out?.lines);
    if (fixed.length !== targets.length) return null;
    const next = lines.slice();
    targets.forEach((row, at) => {
      next[row.index] = fixed[at];
    });
    return next;
  } catch (error: any) {
    console.error("Rap repair failed:", error?.message);
    return null;
  }
}

/** A planned word of a Kiswahili or an English take: the writer chose it itself, so only its
 *  shape is checked — it has to be a word, with a short meaning beside it. */
function plainPlan(values: any): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  (Array.isArray(values) ? values : []).forEach((value: any) => {
    const { term, meaning } = entryOf(value);
    const key = term.toLowerCase();
    if (!term || seen.has(key)) return;
    if (term.split(/\s+/).length > 3) return;
    if (term.replace(/[^\p{L}]/gu, "").length < 2) return;
    seen.add(key);
    out.push({ term, meaning });
  });
  return out.slice(0, MAX_PLAN);
}

/** The words a written take stands on, in a language the saved store does not hold. */
function plainList(values: any): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  (Array.isArray(values) ? values : []).forEach((value: any) => {
    const { term } = entryOf(value);
    const key = term.toLowerCase();
    if (!term || seen.has(key)) return;
    if (term.split(/\s+/).length > 3) return;
    seen.add(key);
    out.push(term);
  });
  return out.slice(0, 60);
}

/** The words of the take this person made just before this one. */
async function lastWords(base44: any): Promise<Set<string>> {
  try {
    const page = await base44.entities.RapTake.filter(
      {},
      { sort: "-created_date", limit: 1, fields: ["words_used"] }
    );
    const row = page?.items?.[0];
    return new Set((row?.words_used || []).map((term: any) => String(term).toLowerCase()));
  } catch (error: any) {
    return new Set<string>();
  }
}

/** The whole rap written once more on other words, when a take came out leaning on the very
 *  words of the take before it. */
async function freshTake(
  base44: any,
  words: any[],
  flow: any,
  language: RapLang,
  store: boolean,
  avoid: string[]
): Promise<any | null> {
  const prompt = [
    "This rap came out leaning on almost the same words as the person's last take, and the person has asked for different words so every phrase is understood afresh.",
    "The words that last take used: " + avoid.join(", ") + ".",
    store
      ? "The list below is the whole of the Ebembe you may use, one word per line as term = meaning:"
      : "",
    store ? wordList(words) : "",
    "Write the whole rap again on different words: keep the same theme, the same number of bars and the same sections, and keep what each bar says, but stand on other words — at least half of the words in every bar have to be words that last take did not use.",
    "Rules, all of them strict:",
    ...languageRules(language, store),
    meaningRule(language),
    "- Return the bars in lines, in order, each with its section and its swahili.",
    store
      ? "- In words_used list the Ebembe words you actually used, exactly as spelled in the list."
      : "- In words_used list the words you actually used.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const out: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: LINES_SCHEMA,
    });
    const next = readLines(out?.lines);
    return next.length ? { lines: next, words: out?.words_used } : null;
  } catch (error: any) {
    console.error("A fresh take could not be written:", error?.message);
    return null;
  }
}

/** Base44 AI reads its own plan once more before the words are handed over: an entry whose
 *  meaning is a pronunciation, a rule or a note about grammar is not a word to rap. */
async function verifyPlan(base44: any, planned: any[], language: RapLang): Promise<any[]> {
  if (!planned.length) return planned;

  const prompt = [
    "These entries were saved in an Ebembe (Babembe) knowledge store, and they were planned for a rap in " +
      LANG_NAME[language] +
      ". Some of them are not words at all — they are pronunciation fragments, spelling guides, rules, headings or notes about grammar.",
    "Here they are, one per line as term = meaning:",
    planned.map((word: any) => word.term + " = " + (word.meaning || "")).join("\n"),
    "Return in keep ONLY the entries that are real Ebembe words a rapper can use: the term is a word of the language, and the meaning really is a Kiswahili or an English word that translates it — the way Mungu, leta, penda, money, rain and drum are.",
    "Leave out every entry whose meaning is a transliterated sound — byoh, deh, bweh, ngah, mah, leh, chee — or a syllable run, a pronunciation, a fragment of a rule, a heading, a page label or a note about grammar.",
    "Leave out as well every entry whose meaning is not a word of Kiswahili or English at all, and every entry whose meaning is empty. When you are not certain an entry is a real word with a real translation, leave it out.",
  ].join("\n");

  try {
    const out: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: VERIFY_SCHEMA,
    });
    const keep = new Set(
      (Array.isArray(out?.keep) ? out.keep : []).map((value: any) =>
        clean(value, MAX_TERM).toLowerCase()
      )
    );
    const kept = planned.filter((word: any) => keep.has(word.term.toLowerCase()));
    // The reading is taken only when it keeps most of the plan: a reading that throws away most of
    // the saved words is judging Ebembe without knowing it, while the store's own rules were built
    // for exactly this, so when the cut is that heavy the plan itself stands.
    if (kept.length >= 4 && kept.length * 5 >= planned.length * 3) return kept;
    return planned;
  } catch (error: any) {
    console.error("Word check failed:", error?.message);
    return planned;
  }
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Ingia kwenye akaunti kwanza." }, { status: 401 });

    let payload: any = {};
    try {
      payload = await req.json();
    } catch (err) {
      payload = {};
    }

    const words = await savedWords(base44);
    const action = typeof payload?.action === "string" ? payload.action : "";
    const language = rapLang(payload?.language);

    // without an action the studio simply reads the same confirmed list the composer uses
    if (action !== "plan" && action !== "write") {
      return Response.json({ words, count: words.length });
    }

    // a Kibembe take cannot be written without the saved words; Kiswahili and English take their
    // words from the writer itself, so they stand on their own
    if (!words.length && language === "ebembe") {
      return Response.json({ error: EMPTY_LIST, words: [] });
    }

    const bars = Math.min(MAX_LINES, Math.max(MIN_BARS, Number(payload?.bars) || 16));
    const bpm = Math.min(160, Math.max(60, Number(payload?.bpm) || 112));
    const topic = clean(payload?.topic, 140);
    const flow = flowOf(payload?.flow);
    const known = knownMap(words);

    if (action === "plan") {
      // the saved words carry a Kibembe or a mixed take; Kiswahili and English take their words
      // from the writer, and a mixed take with none saved leans on Kiswahili and English
      const store = usesStore(language) && words.length > 0;

      // every plan opens on a fresh window of the store, steered around the person's recent takes
      const recent = await recentTakes(base44);
      const taken = await base44.entities.RapTake.count({});
      const window = store
        ? freshWindow(words, recent.used, Number(taken) || 0)
        : { list: [] as any[], avoid: Array.from(recent.used).slice(0, 40) };

      const out: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: planPrompt(window.list, bpm, topic, flow, recent.titles, window.avoid, language, store),
        response_json_schema: IDEAS_SCHEMA,
      });

      // the planned words are read once more before they are handed over: what reaches the
      // person is only words that really are words, with their meanings beside them
      const verified = store
        ? await verifyPlan(
            base44,
            confirmedList(out?.plan, known).map((term) => ({ term, meaning: meaningOf(term, words) })),
            language
          )
        : plainPlan(out?.plan);
      const planned = new Set(verified.map((word: any) => word.term.toLowerCase()));

      const ideas = (Array.isArray(out?.ideas) ? out.ideas : [])
        .map((idea: any) => ({
          name: clean(idea?.name, 60),
          hook: plainLine(idea?.hook),
          swahili: plainLine(idea?.hook_swahili),
          words_used: (store ? confirmedList(idea?.words_used, known) : plainList(idea?.words_used)).filter(
            (term) => planned.has(term.toLowerCase())
          ),
          lines: readLines(idea?.lines),
        }))
        .filter((idea: any) => idea.hook || idea.lines.length)
        .slice(0, MAX_IDEAS);

      if (!ideas.length || !verified.length) {
        return Response.json({ error: UNAVAILABLE, words: words.length }, { status: 502 });
      }

      return Response.json({
        plan: verified,
        ideas,
        words: words.length,
      });
    }

    const idea = payload?.idea || {};
    const store = usesStore(language) && words.length > 0;
    const plannedTerms = store ? confirmedList(idea?.words_used, known) : plainList(idea?.words_used);
    const planned = new Set(plannedTerms.map((term) => term.toLowerCase()));
    // the chosen angle's own words carry the rap, and the whole saved list stands behind the
    // writer when the angle came with only a handful of them
    const narrow =
      planned.size >= MIN_CHOSEN
        ? words.filter((word: any) => planned.has(word.term.toLowerCase()))
        : words;
    const chosen = store ? narrow : [];

    const out: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: writePrompt(
        chosen,
        {
          name: clean(idea?.name, 60),
          hook: plainLine(idea?.hook),
          swahili: plainLine(idea?.swahili),
        },
        bars,
        bpm,
        topic,
        flow,
        language,
        store
      ),
      response_json_schema: LINES_SCHEMA,
    });

    let lines = readLines(out?.lines);
    if (!lines.length) {
      return Response.json({ error: UNAVAILABLE, words: words.length }, { status: 502 });
    }

    // the words the rap really stands on: what the model listed plus the whole plan it drew from
    let used = store ? confirmedList(out?.words_used, known) : plainList(out?.words_used);
    const seen = new Set(used.map((term) => term.toLowerCase()));
    plannedTerms.forEach((term) => {
      if (seen.has(term.toLowerCase())) return;
      seen.add(term.toLowerCase());
      used.push(term);
    });

    // A take that stands on the same handful of words as the take before it is written once more,
    // against the words this person has not been rapping, so no two takes come out alike.
    const before = await lastWords(base44);
    const shared = used.filter((term) => before.has(term.toLowerCase())).length;
    if (used.length >= 5 && before.size >= 5 && shared / used.length >= 0.75) {
      const again = await freshTake(base44, chosen, flow, language, store, Array.from(before).slice(0, 40));
      if (again) {
        lines = again.lines;
        const next = store ? confirmedList(again.words, known) : plainList(again.words);
        if (next.length >= 4) used = next;
      }
    }

    // nothing reaches the person that leans on a word the store does not hold, and no bar keeps
    // coming back to a word the take has already used: those bars are written once more against
    // the confirmed list before the take is handed over
    if (store) {
      const list = chosen.length ? chosen : words;

      const missed = unverified(lines, known);
      if (missed.length) {
        const repaired = await rewriteBars(
          base44,
          list,
          lines,
          "You are correcting bars of an Ebembe rap. Some of them use words that are not in the confirmed list, and that list is the whole of the Ebembe allowed.",
          "Rewrite each bar listed below so that every word in it is in that list, keeping its meaning and its place in the rap. Change nothing else about the rap.",
          missed.map((row: any) => ({
            index: row.index,
            note:
              "Bar " +
              (row.index + 1) +
              ": " +
              lines[row.index]?.ebembe +
              "  (not in the list: " +
              row.unknown.join(", ") +
              ")",
          })),
          flow
        );
        if (repaired) lines = repaired;
      }

      // A bar that says exactly what an earlier bar already says is always written again. A word
      // leaned on again and again is only worth rewriting when the list is wide enough to say the
      // same thing another way; on a list too small for that the take stands as it is written.
      const notes = new Map<number, string>();
      duplicateBars(lines).forEach((row: any) => {
        notes.set(
          row.index,
          "Bar " +
            (row.index + 1) +
            ": " +
            lines[row.index]?.ebembe +
            "  (says what bar " +
            row.from +
            " already says)"
        );
      });
      if (list.length >= MIN_VARY_WORDS) {
        overusedBars(lines).forEach((row: any) => {
          if (notes.has(row.index)) return;
          notes.set(
            row.index,
            "Bar " +
              (row.index + 1) +
              ": " +
              lines[row.index]?.ebembe +
              "  (used again: " +
              row.again.join(", ") +
              ")"
          );
        });
      }

      const targets = Array.from(notes, ([index, note]) => ({ index, note })).sort(
        (a, b) => a.index - b.index
      );
      if (targets.length) {
        const varied = await rewriteBars(
          base44,
          list,
          lines,
          "You are correcting bars of an Ebembe rap. Some of them say exactly what another bar already says, and some lean on a word the take has already used in its other bars.",
          "Rewrite each bar listed below so that it says something new, on words the take has not used yet, staying on the same theme and keeping its place in the rap. Leave every other bar of the rap as it is.",
          targets,
          flow
        );
        if (varied) lines = varied;
      }
    }

    // the words line and the words panel carry only the words the take really stands on
    const shown = wordsInTake(used, lines);
    if (shown.length) used = shown;

    return Response.json({
      lines,
      words_used: used.slice(0, 60),
      language,
      words: words.length,
    });
  } catch (error: any) {
    console.error("Rap lines failed:", error?.message);
    return Response.json({ error: UNAVAILABLE }, { status: 500 });
  }
}