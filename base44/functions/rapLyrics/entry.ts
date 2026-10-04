import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { flowOf, flowStyle } from "../../shared/rapFlows.ts";

const UNAVAILABLE = "Mawazo hayakuweza kutengenezwa. Jaribu tena baada ya sekunde chache.";
const EMPTY_LIST =
  "Hakuna maneno ya Kibembe yaliyohifadhiwa bado. Ongeza maneno kwenye Assistant knowledge kwanza.";
const MIN_BARS = 4;
const PAGE = 400;
const MAX_POOL = 1200;
// the words handed to the model in one plan: a fresh window of the pool, so the same handful
// of words stops coming back take after take
const MAX_WINDOW = 140;
const MIN_FRESH = 60;
const MAX_TERM = 40;
const MAX_MEANING = 110;
const MAX_USAGE = 90;
const MAX_LINES = 80;
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
  if (term.split(/\s+/).length > 3 || meaning.split(/\s+/).length > MAX_MEANING_WORDS) return false;
  if (term.replace(/[^\p{L}]/gu, "").length < 3) return false;
  if (!/^[\p{L}\p{N}'’&.\- ]+$/u.test(term)) return false;
  if (/^\d+\s*[.)]/.test(term)) return false;
  // a heading stands in capitals: no real Ebembe word is written that way
  if (term.length > 1 && !/[a-zà-ÿ]/.test(term)) return false;
  if (NOT_A_TERM.test(term) || NOT_A_MEANING.test(meaning)) return false;
  // a translation made of sentence words is a note, not the short gloss a word needs
  const gloss = meaning.toLowerCase().split(/\s+/);
  if (gloss.some((word) => MEANING_STOP.has(word.replace(/[^a-z]/g, "")))) return false;
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

  if (fresh.length >= MIN_FRESH) {
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

/** The terms the model named, kept only where they really stand in the confirmed list. */
function confirmedList(values: any, known: Map<string, string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  (Array.isArray(values) ? values : []).forEach((value: any) => {
    const term = known.get(clean(value, MAX_TERM).toLowerCase());
    if (!term || seen.has(term.toLowerCase())) return;
    seen.add(term.toLowerCase());
    out.push(term);
  });
  return out;
}

function readLines(values: any): any[] {
  return (Array.isArray(values) ? values : [])
    .map((line: any) => ({
      section: clean(line?.section, 14).toUpperCase() || "VERSE",
      ebembe: plainLine(line?.ebembe),
      swahili: plainLine(line?.swahili),
    }))
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

function wordList(words: any[]): string {
  return words.map((word: any) => word.term + " = " + (word.meaning || "")).join("\n");
}

/** The words chosen for the theme, then three different ways into it. */
function planPrompt(words: any[], bpm: number, topic: string, flow: any, recentTitles: string[], avoid: string[]) {
  return [
    "You are preparing a rap in Ebembe, the Babembe language, for a voice that sings it over a fast Afro-Zaga / Bongo Flava beat at " +
      bpm +
      " BPM.",
    "The list below is the whole of the Ebembe you may use, one word per line as term = meaning:",
    wordList(words),
    "Some saved entries are not words at all: a pronunciation fragment, a spelling guide, a rule, a heading or a note about grammar. Never plan or rap one — every word you plan has to be a real Ebembe word whose meaning is a short translation.",
    avoid.length
      ? "These words were used in this person's recent takes — leave them for another time and build on the others: " +
        avoid.join(", ")
      : "",
    "Step one — plan the words: choose up to " +
      MAX_PLAN +
      " of those words that suit the theme and can carry a rap on it, and return them in plan exactly as the list spells them.",
    "Step two — offer " +
      MAX_IDEAS +
      " different angles on that theme, three if you can: a different way into it, a different mood or a different scene, never three versions of one idea.",
    "For each idea give:",
    "- name: its angle in at most 5 words, in Kiswahili, so the person can tell the ideas apart at a glance.",
    '- hook: the idea\'s hook as one or two short Ebembe lines (section "HOOK"), at most ' +
      flow.maxWords +
      " Ebembe words each, plain spelling.",
    "- hook_swahili: the same hook in Kiswahili.",
    "- words_used: the Ebembe words from plan that this idea really builds on, spelled exactly as the list spells them.",
    "- lines: the hook written out line by line, each line a bar with its section and its swahili meaning.",
    "Rules, all of them strict:",
    flowStyle(flow),
    ...SPELLING,
    recentTitles.length
      ? "These angles were already used in this person's recent takes — offer different ones: " +
        recentTitles.join("; ")
      : "",
    "The theme, when one is given, is: " + (topic || "everyday Babembe life"),
  ].join("\n");
}

/** The chosen angle written out in full, against the very words its plan named. */
function writePrompt(words: any[], idea: any, bars: number, bpm: number, topic: string, flow: any) {
  // a very short take is one hook on its own; a longer one is hook, body, hook
  const structure =
    bars <= 6
      ? 'Return exactly ' + bars + ' lines in total: a single hook (section "HOOK"), and no verse.'
      : 'Return exactly ' +
        bars +
        ' lines in total, in this order: a hook of 4 lines (section "HOOK"), then the body (section "VERSE 1"), then the hook again (section "HOOK").';

  return [
    "You write one rap in Ebembe, the Babembe language, for a voice that sings it over a fast Afro-Zaga / Bongo Flava beat at " +
      bpm +
      " BPM.",
    structure,
    "This rap is one chosen angle, so stay on it: " +
      (idea?.name || "the theme") +
      ".",
    idea?.hook ? "Its hook is already set — keep it and build the rap around it: " + idea.hook : "",
    idea?.swahili ? "That hook means: " + idea.swahili : "",
    "The list below is the whole of the Ebembe you may use, one word per line as term = meaning:",
    wordList(words),
    "Rules, all of them strict:",
    ...SPELLING,
    "- Each line is one bar of the beat. Repetition, chant and call-and-answer are welcome, and a hook repeats.",
    flowStyle(flow),
    "- Give swahili: the same line in Kiswahili so a listener learns the meaning. Keep it short.",
    "- In words_used list the Ebembe terms you actually used, exactly as spelled in the list.",
    "The theme, when one is given, is: " + (topic || "everyday Babembe life"),
  ]
    .filter(Boolean)
    .join("\n");
}

/** One more pass over the bars that leaned on a word the store does not hold, so what reaches
 *  the person is written only from the words the store really keeps. */
async function repairLines(
  base44: any,
  words: any[],
  lines: any[],
  missed: any[],
  flow: any
): Promise<any[] | null> {
  const prompt = [
    "You are correcting bars of an Ebembe rap. Some of them use words that are not in the confirmed list, and that list is the whole of the Ebembe allowed.",
    "The list below is the whole of the Ebembe you may use, one word per line as term = meaning:",
    wordList(words),
    "Rewrite each bar listed below so that every word in it is in that list, keeping its meaning and its place in the rap. Change nothing else about the rap.",
    ...missed.map(
      (row: any) =>
        "Bar " + (row.index + 1) + ": " + lines[row.index]?.ebembe + "  (not in the list: " + row.unknown.join(", ") + ")"
    ),
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
    if (fixed.length !== missed.length) return null;
    const next = lines.slice();
    missed.forEach((row: any, at: number) => {
      next[row.index] = fixed[at];
    });
    return next;
  } catch (error: any) {
    console.error("Rap repair failed:", error?.message);
    return null;
  }
}

/** Base44 AI reads its own plan once more before the words are handed over: an entry whose
 *  meaning is a pronunciation, a rule or a note about grammar is not a word to rap. */
async function verifyPlan(base44: any, planned: any[]): Promise<any[]> {
  if (!planned.length) return planned;

  const prompt = [
    "These entries were saved in an Ebembe (Babembe) knowledge store. Some of them are not words at all — they are pronunciation fragments, spelling guides, rules, headings or notes about grammar.",
    "Here they are, one per line as term = meaning:",
    planned.map((word: any) => word.term + " = " + (word.meaning || "")).join("\n"),
    "Return in keep only the entries that are real Ebembe words a rapper can use: the term is an Ebembe word and the meaning is its short translation in Kiswahili or English.",
    "Leave out anything that is not such a word, and leave out any entry whose meaning is a pronunciation, a sound or a note about how a word is written.",
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
    // a reading that kept almost nothing is not trusted over the plan itself
    return kept.length >= 4 ? kept : planned;
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

    // without an action the studio simply reads the same confirmed list the composer uses
    if (action !== "plan" && action !== "write") {
      return Response.json({ words, count: words.length });
    }

    if (!words.length) {
      return Response.json({ error: EMPTY_LIST, words: [] });
    }

    const bars = Math.min(MAX_LINES, Math.max(MIN_BARS, Number(payload?.bars) || 16));
    const bpm = Math.min(160, Math.max(60, Number(payload?.bpm) || 112));
    const topic = clean(payload?.topic, 140);
    const flow = flowOf(payload?.flow);
    const known = knownMap(words);

    if (action === "plan") {
      // every plan opens on a fresh window of the store, steered around the person's recent takes
      const recent = await recentTakes(base44);
      const taken = await base44.entities.RapTake.count({});
      const window = freshWindow(words, recent.used, Number(taken) || 0);

      const out: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: planPrompt(window.list, bpm, topic, flow, recent.titles, window.avoid),
        response_json_schema: IDEAS_SCHEMA,
      });

      // the planned words are read once more before they are handed over: what reaches the
      // person is only words that really are words, with their meanings beside them
      const verified = await verifyPlan(
        base44,
        confirmedList(out?.plan, known).map((term) => ({ term, meaning: meaningOf(term, words) }))
      );
      const planned = new Set(verified.map((word: any) => word.term.toLowerCase()));

      const ideas = (Array.isArray(out?.ideas) ? out.ideas : [])
        .map((idea: any) => ({
          name: clean(idea?.name, 60),
          hook: plainLine(idea?.hook),
          swahili: plainLine(idea?.hook_swahili),
          words_used: confirmedList(idea?.words_used, known).filter((term) =>
            planned.has(term.toLowerCase())
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
    const plannedTerms = confirmedList(idea?.words_used, known);
    const planned = new Set(plannedTerms.map((term) => term.toLowerCase()));
    // the chosen angle's own words carry the rap; a plan that arrived empty falls back to the whole list
    const chosen = planned.size
      ? words.filter((word: any) => planned.has(word.term.toLowerCase()))
      : words;

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
        flow
      ),
      response_json_schema: LINES_SCHEMA,
    });

    let lines = readLines(out?.lines);
    if (!lines.length) {
      return Response.json({ error: UNAVAILABLE, words: words.length }, { status: 502 });
    }

    // nothing reaches the person that leans on a word the store does not hold: those bars are
    // written once more against the confirmed list before the take is handed over
    const missed = unverified(lines, known);
    if (missed.length) {
      const repaired = await repairLines(base44, chosen, lines, missed, flow);
      if (repaired) lines = repaired;
    }

    // the words the rap really stands on: what the model listed plus the whole plan it drew from
    const used = confirmedList(out?.words_used, known);
    const seen = new Set(used.map((term) => term.toLowerCase()));
    plannedTerms.forEach((term) => {
      if (seen.has(term.toLowerCase())) return;
      seen.add(term.toLowerCase());
      used.push(term);
    });

    return Response.json({
      lines,
      words_used: used.slice(0, 60),
      words: words.length,
    });
  } catch (error: any) {
    console.error("Rap lines failed:", error?.message);
    return Response.json({ error: UNAVAILABLE }, { status: 500 });
  }
}