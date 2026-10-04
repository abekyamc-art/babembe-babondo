import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

const UNAVAILABLE = "Mawazo hayakuweza kutengenezwa. Jaribu tena baada ya sekunde chache.";
const EMPTY_LIST =
  "Hakuna maneno ya Kibembe yaliyohifadhiwa bado. Ongeza maneno kwenye Assistant knowledge kwanza.";
const MAX_WORDS = 240;
const MAX_TERM = 40;
const MAX_MEANING = 110;
const MAX_USAGE = 90;
const MAX_LINES = 32;
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

function clean(value: any, max: number): string {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return text.slice(0, max);
}

// a rule mark in the term itself — a slash, a semicolon, an equals sign, a spaced dash —
// belongs to a rule, and a rule is never rapped
const NOT_A_TERM = /[\/;=]|\s[-–—]\s|\d|[.!?]/;
// a meaning may list variants with a slash or a semicolon and may run a little longer than
// a bare phrase; a page number, an equals sign or a shouted sentence is still not a meaning
const NOT_A_MEANING = /[\d!?]|=|\s[-–—]\s/;

/**
 * A rapped word has to be a word: a whole spelling of at least three letters, with a
 * short meaning beside it. A rule, a heading, a syllable fragment or a page marker that
 * was saved as an entry is not one, and it never reaches the rapper.
 */
function isWordEntry(term: string, meaning: string): boolean {
  if (!term || !meaning) return false;
  if (term.length > MAX_TERM || meaning.length > MAX_MEANING) return false;
  if (term.split(/\s+/).length > 3 || meaning.split(/\s+/).length > 12) return false;
  if (term.replace(/[^\p{L}]/gu, "").length < 3) return false;
  if (!/^[\p{L}\p{N}'’&.\- ]+$/u.test(term)) return false;
  if (/^\d+\s*[.)]/.test(term)) return false;
  // a heading stands in capitals: no real Ebembe word is written that way
  if (term.length > 1 && !/[a-zà-ÿ]/.test(term)) return false;
  if (NOT_A_TERM.test(term) || NOT_A_MEANING.test(meaning)) return false;
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

/** The words the admin has confirmed, exactly as they are saved. */
async function savedWords(base44: any) {
  const page = await base44.asServiceRole.entities.AssistantKnowledge.filter(
    { kind: "word" },
    { limit: MAX_WORDS }
  );
  const seen = new Set<string>();
  return (page?.items || [])
    .map((row: any) => ({
      term: clean(row.term, MAX_TERM),
      meaning: clean(row.meaning, MAX_MEANING),
      usage: clean(row.usage, MAX_USAGE),
    }))
    .filter((word: any) => {
      if (!isWordEntry(word.term, word.meaning)) return false;
      const key = word.term.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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
function planPrompt(words: any[], bpm: number, topic: string) {
  return [
    "You are preparing a rap in Ebembe, the Babembe language, for a voice that sings it over a fast Afro-Zaga / Bongo Flava beat at " +
      bpm +
      " BPM.",
    "The list below is the whole of the Ebembe you may use, one word per line as term = meaning:",
    wordList(words),
    "Step one — plan the words: choose up to " +
      MAX_PLAN +
      " of those words that suit the theme and can carry a rap on it, and return them in plan exactly as the list spells them.",
    "Step two — offer " +
      MAX_IDEAS +
      " different angles on that theme, three if you can: a different way into it, a different mood or a different scene, never three versions of one idea.",
    "For each idea give:",
    "- name: its angle in at most 5 words, in Kiswahili, so the person can tell the ideas apart at a glance.",
    '- hook: the idea\'s hook as one or two short Ebembe lines (section "HOOK"), at most 8 Ebembe words each, plain spelling.',
    "- hook_swahili: the same hook in Kiswahili.",
    "- words_used: the Ebembe words from plan that this idea really builds on, spelled exactly as the list spells them.",
    "- lines: the hook written out line by line, each line a bar with its section and its swahili meaning.",
    "Rules, all of them strict:",
    ...SPELLING,
    "The theme, when one is given, is: " + (topic || "everyday Babembe life"),
  ].join("\n");
}

/** The chosen angle written out in full, against the very words its plan named. */
function writePrompt(words: any[], idea: any, bars: number, bpm: number, topic: string) {
  return [
    "You write one rap in Ebembe, the Babembe language, for a voice that sings it over a fast Afro-Zaga / Bongo Flava beat at " +
      bpm +
      " BPM.",
    "Return exactly " +
      bars +
      ' lines in total, in this order: a hook of 4 lines (section "HOOK"), then the body (section "VERSE 1"), then the hook again (section "HOOK").',
    "This rap is one chosen angle, so stay on it: " +
      (idea?.name || "the theme") +
      ".",
    idea?.hook ? "Its hook is already set — keep it and build the rap around it: " + idea.hook : "",
    idea?.swahili ? "That hook means: " + idea.swahili : "",
    "The list below is the whole of the Ebembe you may use, one word per line as term = meaning:",
    wordList(words),
    "Rules, all of them strict:",
    ...SPELLING,
    "- Each line is one bar of the beat: short, punchy and rhythmic, at most 8 Ebembe words. Repetition, chant and call-and-answer are welcome, and a hook repeats.",
    "- Give swahili: the same line in Kiswahili so a listener learns the meaning. Keep it short.",
    "- In words_used list the Ebembe terms you actually used, exactly as spelled in the list.",
    "The theme, when one is given, is: " + (topic || "everyday Babembe life"),
  ]
    .filter(Boolean)
    .join("\n");
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

    const bars = Math.min(MAX_LINES, Math.max(8, Number(payload?.bars) || 16));
    const bpm = Math.min(160, Math.max(60, Number(payload?.bpm) || 112));
    const topic = clean(payload?.topic, 140);
    const known = knownMap(words);

    if (action === "plan") {
      const out: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: planPrompt(words, bpm, topic),
        response_json_schema: IDEAS_SCHEMA,
      });

      const plan = confirmedList(out?.plan, known).slice(0, MAX_PLAN);
      const planned = new Set(plan.map((term) => term.toLowerCase()));

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

      if (!ideas.length) {
        return Response.json({ error: UNAVAILABLE, words: words.length }, { status: 502 });
      }

      return Response.json({
        plan: plan.map((term) => ({ term, meaning: meaningOf(term, words) })),
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
        topic
      ),
      response_json_schema: LINES_SCHEMA,
    });

    const lines = readLines(out?.lines);
    if (!lines.length) {
      return Response.json({ error: UNAVAILABLE, words: words.length }, { status: 502 });
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