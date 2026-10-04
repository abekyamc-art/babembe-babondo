import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

const UNAVAILABLE = "Mistari haikuweza kutengenezwa. Jaribu tena baada ya sekunde chache.";
const EMPTY_LIST =
  "Hakuna maneno ya Kibembe yaliyohifadhiwa bado. Ongeza maneno kwenye Assistant knowledge kwanza.";
const MAX_WORDS = 240;
const MAX_TERM = 40;
const MAX_MEANING = 70;
const MAX_USAGE = 90;
const MAX_LINES = 32;

const SCHEMA = {
  type: "object",
  properties: {
    lines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          section: { type: "string" },
          ebembe: { type: "string" },
          swahili: { type: "string" },
        },
        required: ["section", "ebembe", "swahili"],
      },
    },
    words_used: { type: "array", items: { type: "string" } },
  },
  required: ["lines", "words_used"],
};

function clean(value: any, max: number): string {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return text.slice(0, max);
}

// a meaning that lists variants, quotes a rule or carries a number is not a meaning
const NOT_A_MEANING = /[\/;=]|\s[-–—]\s|\d|[.!?]/;

/**
 * A rapped word has to be a word: a whole spelling of at least three letters, with a
 * short meaning beside it. A rule, a heading, a syllable fragment or a page marker that
 * was saved as an entry is not one, and it never reaches the rapper.
 */
function isWordEntry(term: string, meaning: string): boolean {
  if (!term || !meaning) return false;
  if (term.length > 40 || meaning.length > 60) return false;
  if (term.split(/\s+/).length > 3 || meaning.split(/\s+/).length > 5) return false;
  if (term.replace(/[^\p{L}]/gu, "").length < 3) return false;
  if (!/^[\p{L}\p{N}'’&.\- ]+$/u.test(term)) return false;
  if (/^\d+\s*[.)]/.test(term)) return false;
  // a heading stands in capitals: no real Ebembe word is written that way
  if (term.length > 1 && !/[a-zà-ÿ]/.test(term)) return false;
  if (NOT_A_MEANING.test(term) || NOT_A_MEANING.test(meaning)) return false;
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

function buildPrompt(words: any[], bars: number, bpm: number, topic: string) {
  const list = words.map((word: any) => word.term + " = " + (word.meaning || "")).join("\n");
  return [
    "You write one rap in Ebembe, the Babembe language, for a voice that sings it over a fast Afro-Zaga / Bongo Flava beat at " +
      bpm +
      " BPM.",
    "Return exactly " +
      bars +
      ' lines in total, in this order: a hook of 4 lines (section "HOOK"), then the body (section "VERSE 1"), then the hook again (section "HOOK").',
    "The list below is the whole of the Ebembe you may use, one word per line as term = meaning:",
    list,
    "Rules, all of them strict:",
    "- Use ONLY the Ebembe words in that list, spelled exactly as they are written there, in plain spelling with no hyphens between syllables. Never invent a word, never change a spelling, never add a word that is not in the list.",
    "- A word's meaning tells you where it fits: build each line so it says something that makes sense in Ebembe word order.",
    "- Each line is one bar of the beat: short, punchy and rhythmic, at most 8 Ebembe words. Repetition, chant and call-and-answer are welcome, and a hook repeats.",
    "- The verb prefixes na- (I), a- (he or she) and ba- (they) may be joined to a listed verb, exactly as the list shows.",
    "- Write every Ebembe word as the list spells it. A verb prefix that the list itself writes with a dash keeps its dash and joins a listed verb (a-lola, na-tenda, ba-onda). Never split one word into syllables with dashes, and never join two unrelated words with one.",
    "- Never use a Kiswahili or an English word inside ebembe: Kiswahili belongs only in swahili, and no English at all.",
    "- The list may be short. Repeat its words, change their order, and build each line from the words you are allowed rather than reaching for a word you do not have.",
    "- Give swahili: the same line in Kiswahili so a listener learns the meaning. Keep it short.",
    "- Never write a pronunciation guide, a syllable breakdown, or any text in brackets, dashes or slashes.",
    "- Never write the section name inside ebembe or swahili.",
    "- In words_used list the Ebembe terms you actually used, exactly as spelled in the list.",
    "The theme of the rap, when one is given, is: " + (topic || "everyday Babembe life"),
  ].join("\n");
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

    // the studio and the composer read the same confirmed list
    if (payload?.action !== "compose") {
      return Response.json({ words, count: words.length });
    }

    if (!words.length) {
      return Response.json({ error: EMPTY_LIST, words: [] });
    }

    const bars = Math.min(MAX_LINES, Math.max(8, Number(payload?.bars) || 16));
    const bpm = Math.min(160, Math.max(60, Number(payload?.bpm) || 112));
    const topic = clean(payload?.topic, 140);

    const out: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: buildPrompt(words, bars, bpm, topic),
      response_json_schema: SCHEMA,
    });

    const raw = Array.isArray(out?.lines) ? out.lines : [];
    const lines = raw
      .map((line: any) => ({
        section: clean(line?.section, 14).toUpperCase() || "VERSE",
        ebembe: plainLine(line?.ebembe),
        swahili: plainLine(line?.swahili),
      }))
      .filter((line: any) => line.ebembe)
      .slice(0, MAX_LINES);

    if (!lines.length) {
      return Response.json({ error: UNAVAILABLE }, { status: 502 });
    }

    const used = Array.isArray(out?.words_used)
      ? Array.from(
          new Set(
            out.words_used
              .map((word: any) => clean(word, MAX_TERM))
              .filter((word: string) => word)
          )
        ).slice(0, 60)
      : [];

    return Response.json({ lines, words_used: used, words: words.length });
  } catch (error: any) {
    console.error("Rap lines failed:", error?.message);
    return Response.json({ error: UNAVAILABLE }, { status: 500 });
  }
}