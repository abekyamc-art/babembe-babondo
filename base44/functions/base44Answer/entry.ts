import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { geminiText } from "../../shared/gemini.ts";
import { secrets } from "base44:runtime";
import { alikeTerms } from "../../shared/soundsAlike.ts";
import { glossOf, knowledgeWordRows } from "../../shared/knowledgeWords.ts";
import { rulesText } from "../../shared/knowledgeRules.ts";
import { knowledgeStamp } from "../../shared/wordBank.ts";
import { docWholeBlock } from "../../shared/knowledgeDoc.ts";
import { storyCatalogueBlock } from "../../shared/storyCatalogue.ts";
import { keyLineEn, keyMatches } from "../../shared/answerKey.ts";
import { lookupForTurn, lookupSource } from "../../shared/freshLookup.ts";
import { withoutCues } from "../../shared/cues.ts";
import { ANSWER_LANGUAGE, SOURCE_RULES } from "../../shared/languageRules.ts";
import { TRUTH_RULES } from "../../shared/truthRules.ts";
import { KIBEMBE_GUIDE } from "../../shared/kibembeGuide.ts";
import { engineTurn } from "../../shared/phraseEngine.ts";
import { isRepeatAsk, lastOwnLine } from "../../shared/repeatAsk.ts";
import { correctEbembe, earsKnowledge, writeDown } from "../../shared/openAiEars.ts";

/**
 * The Base44 AI call. What the person said is heard, the answer is written by the app's own
 * AI from the knowledge it is handed, and the Kibembe of that answer is spoken back out loud
 * in the platform's own voice. The screen carries the same parts the app already shows —
 * Kibembe, how it sounds, Kiswahili, English — and the part belonging to the language the
 * person used leads them and is the part read aloud, so what comes out of the phone is the
 * language they are speaking.
 *
 * The knowledge is read here, whole, on every turn: the rule book the admin has in force and
 * every word they saved. Kibembe is answered from the admin's own language rather than from a
 * note that may have been trimmed on its way to the phone.
 */

// The platform voice every answer is read in — the warm, soft one, a spoken voice rather than a
// reading one — and the voice language each leading part is read on. The voice service holds no
// Bantu language at all, so Malay stands in for both Kibembe and Kiswahili: Malay sounds every
// letter the Bantu way — five pure vowels with no English letter-names, w and y voiced, ny and
// ng as the language reads them — and that is what carries an Ebembe accent. The spelling handed
// to it is still the rule book's, so a sound the voice cannot make is written right even when it
// cannot be said right. English is read on the service's own English.
const SPEECH_VOICE = "honey";
const SPEECH_LANG: Record<string, string> = { ebembe: "ms", swahili: "ms", english: "en" };
// which reading writes the answer is settled in one place now, in shared/gemini.ts
// the room one answer is given, and the room the voice line is read in: wide enough for a whole answer
// with its source named, so nothing the assistant writes is cut off on its way to the person
const MAX_ANSWER = 1800;
const MAX_SPOKEN = 900;
// the answer key rides ahead of the word list, so the saved answer is read before anything else
const KEY_ROWS = 200;
const KEY_BUDGET = 1200;
const MAX_QUESTION = 400;
const MAX_MEMORY = 12000;
const MAX_HISTORY = 1200;
const MAX_AUDIO_CHARS = 2500000;
// every saved word rides with every answer; this ceiling only guards against a runaway list
const WORDS_CEILING = 26000;
// how many of the saved words closest to what was heard ride ahead of the whole list
const LIKE_LIMIT = 6;
// The admin's one knowledge document rides with every answer whole — its words, its phrases, its
// rules and everything else they wrote — so no part of what they approved is left out of an answer.
// the catalogue of the admin's own stories, and of every name published with them, rides with the
// answer so a question about a song, a video or a channel is answered from its own name
const STORY_ROOM = 1500;
// a turn nothing could be made of: he asks again and the call goes on listening
const REASK = "Sema tena, nakusikiliza.";

const REPLY_SCHEMA = {
  type: "object",
  properties: {
    lang: { type: "string", enum: ["ebembe", "swahili", "english"] },
    ebembe: { type: "string" },
    guide: { type: "string" },
    swahili: { type: "string" },
    english: { type: "string" },
    say: { type: "string" },
  },
  required: ["lang", "ebembe", "say"],
};

const ROLE =
  "You are Babembe Babondo GS, a Kibembe (Ebembe) guide from the Babembe village, speaking out loud with a person on a phone call. " +
  "Their words were caught by a listening service, so their spelling may be rough: read them for what the person meant, and never correct their spelling out loud.";

const KNOWLEDGE_HEAD =
  "The knowledge saved for you by the admin of this app. The rules at its head stand above everything else here, and every answer obeys them:";

const HOW = [
  "Write every answer in exactly these parts:",
  "lang: which language the person's own words are in — ebembe, swahili or english — read from their words themselves, never from a phone setting and never from the language of your own last answer. Their language leads the answer: its part is written first and it is the part read aloud. When they change language mid-talk the next answer changes with them, and changes back when they change back.",
  ANSWER_LANGUAGE,
  "ebembe: the answer itself in Kibembe (Ebembe), the words a Babembe speaker really uses, written exactly as the rule book's reading key spells them, every letter sounded the Ebembe way rather than the English letter-name, with no hyphens between syllables.",
  "guide: how that same Kibembe sounds to an American ear, syllable by syllable joined with dashes.",
  "swahili: the same thing in everyday Kiswahili. english: the same thing in plain English. Every part says the same thing, and the one in the person's own language is the answer they are waiting for.",
  "say: only the part in the language the person just used, written exactly as that part is written on screen, apart from a letter the voice would otherwise read wrongly (ch for the c sound, and so on) — and on Kibembe, never an English sound-spelling such as ay, ee or oh. Plain running words with spaces between them: no brackets, no dashes, no hyphens, no pronunciation notes, no language names, and never the listening line.",
  "When the admin's saved questions hold one that matches what they said, the saved answer for it is what they must hear: your answer opens with that answer word for word, and the rest of the answer stays inside what it says — never wander into other knowledge, and never add what they were not asked.",
  "Answer as fully as the question needs, in your own words: every part says the whole of what is being answered, and no part is left standing half-written. A story or a long telling is told in full rather than cut short, and where it runs long it is still given whole.",
  "The saved words are the reference for the Kibembe you write: where a word stands in the knowledge, write it as it is saved there, and where nothing there covers one part of what you need, carry that part with the nearest word a Babembe speaker would use.",
  "Copy a saved word letter for letter where you use it, a b, h or w inside it included: a word that looks like a Kiswahili one is still written the way the list spells it (mabwe, never mawe).",
  "The rule book below decides how Kibembe is read, pronounced, written and used. Where one of its rules and your own habit disagree, the rule wins, and where it and a word on the list disagree, the list wins.",
  "Read, write and say every Ebembe word by the rule book's reading key, with the accent of a Babembe speaker from the village: Bantu vowels, every syllable sounded, no English letter-names.",
  "The pronunciation noted beside a saved word is for you alone: it shapes how you say that word, and is never written out and never spoken. What goes to the screen is the listening line; what goes to the voice is the say line.",
  "A word that only sounded like a saved word is that saved word — one letter apart, the same consonants with other vowels, or a saved word the hearing broke into two. Answer straight from its meaning, and never say the word was wrong or that you do not know it.",
  "Never ask the person whether they meant another word, and never repeat their own words back to them as your answer.",
  "Never say that you did not hear them or did not understand them, and never ask them to say it again.",
  "Never write a stage direction or an emotion cue between brackets — [curious], [laughs], (softly) — in any part: they are not words a person reads or hears.",
  "When they ask about a person, a place, an event or a thing that the knowledge below does not answer, answer from the material that comes back from the app's own lookup: who or what it is, where it is from, and what is known about it — naming where it came from, and saying plainly when it is not confirmed.",
  TRUTH_RULES,
  SOURCE_RULES,
  "Never repeat a line you have already given in this conversation: say something new — apart from a repeat ask (\"Omo tenda bile?\" or \"Omo tenda ii-ii?\"), where that very line is given again, word for word, in every part.",
].join("\n");

// The admin's own rule book rides ahead of every other kind of knowledge: how Kibembe is read,
// pronounced, written and used is decided by it before anything else, and it is handed over
// whole — its reading key and its tense tables included.
const RULES_HEAD =
  "\nSHERIA ZA LUGHA YA KIBEMBE — the admin's own rule book for reading, pronouncing, writing and using Kibembe. It is the reference for the language: where one of these rules and your own habit disagree, the rule wins.\n";

// Every word the admin saved, handed over whole: the vocabulary every answer is built from.
const WORDS_HEAD =
  "\nMANENO YA EBEMBE — every word the admin saved for you to know:\n" +
  "These are the words the admin holds, written exactly as they are here: use them as they stand, and where none of them covers one part of what you need, carry that part with the nearest word a Babembe speaker would use. Their meanings are what the person means when they say them. A word written with a \"?\" has no meaning saved yet: say the word, and give no meaning of your own for it.\n";

// The answer key for the turn: the saved questions that match what was just said, nearest first.
const KEY_HEAD =
  "\nTHE ANSWER KEY for what they just said — the questions the admin saved that match it, nearest first:\n" +
  "One of these answers what they just said. Its saved answer is what the person must hear: open your answer with that answer, word for word, without changing it and without putting anything before it. Then go on with that answer alone — never wander into other knowledge, and never add what they did not ask. Where none of these matches, ignore this section.\n";

// What was heard, matched against the whole saved list before the answer is written.
const LIKE_HEAD =
  "\nMANENO YANAYOKARIBIA ULILOSIKIA — the saved words closest to what was just heard:\n" +
  "The first one is the nearest: that is the word the person said, so answer straight from its meaning. Never tell them they were wrong, never offer another of these words instead, and never ask which one they meant.\n";

/**
 * The knowledge is held only while the store is unchanged: a live call asks on every turn, so the
 * rule book and the word list are not fetched again and again mid-conversation — and an edit the
 * admin makes is read again at once rather than a minute later.
 */
const CACHE_MS = 60000;
let cache: { at: number; stamp: string; rules: string; rows: any[]; keys: any[] } = {
  at: 0,
  stamp: "",
  rules: "",
  rows: [],
  keys: [],
};

/** The saved questions, read once with the rest of the knowledge: they are the answer key. */
async function answerRows(base44: any) {
  const page = await base44.asServiceRole.entities.AssistantKnowledge.filter(
    { kind: "qa" },
    { sort: "created_date", limit: KEY_ROWS, fields: ["kind", "question", "answer"] }
  );
  return Array.isArray(page) ? page : page?.items || [];
}

async function knowledgeFor(base44: any) {
  const stamp = await knowledgeStamp(base44);
  if (cache.rows.length && stamp && cache.stamp === stamp && Date.now() - cache.at < CACHE_MS) {
    return cache;
  }
  const loaded = await Promise.all([
    rulesText(base44),
    knowledgeWordRows(base44),
    answerRows(base44),
  ]);
  cache = { at: Date.now(), stamp, rules: loaded[0], rows: loaded[1], keys: loaded[2] };
  return cache;
}

/** The answer key for the turn, nearest first, as the writer reads it. */
function keySection(rows: any[], query: string): string {
  const matches = keyMatches(rows, query);
  if (!matches.length) return "";

  let body = "";
  for (const match of matches) {
    const line = keyLineEn(match);
    if (body.length + line.length > KEY_BUDGET) break;
    body += line;
  }
  return body ? KEY_HEAD + body : "";
}

function textOf(value: any, max = MAX_ANSWER): string {
  const text = typeof value === "string" ? value : "";
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * The line the voice reads: the words alone, with every dash, bracket and symbol that would be
 * read out as a word taken away, the sentences left standing with their own punctuation so the
 * voice's intonation follows them instead of running flat, and a full stop at the end so it
 * never trails off. It is held to about half a minute of speech.
 */
function voiceLine(value: any): string {
  const line = withoutCues(textOf(value, MAX_SPOKEN * 2))
    .replace(/[=·•*|_/\\<>{}[\]()"“”]/g, " ")
    .replace(/[-–—]+/g, " ")
    .replace(/\s*([,.!?;])\s*/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
  if (!line) return "";
  const short = closeAtSentence(line, MAX_SPOKEN);
  return /[.!?]$/.test(short) ? short : short + ".";
}

/** A line closed at the last sentence that fits the room given, never mid-sentence. */
function closeAtSentence(line: string, room: number) {
  if (line.length <= room) return line;
  const cut = line.slice(0, room);
  const at = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
  if (at > room * 0.4) return cut.slice(0, at + 1).trim();
  const space = cut.lastIndexOf(" ");
  return (space > 0 ? cut.slice(0, space) : cut).trim();
}

/** One line, its runs of space flattened, as the writer reads it. */
function tidy(value: any): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/** The recording of one spoken turn, as the bytes the listening service is handed. */
function audioOf(value: any): { bytes: Uint8Array; type: string } | null {
  const body = String(value?.b64 || "").replace(/^data:[^,]*,/, "").replace(/\s+/g, "");
  if (!body || body.length > MAX_AUDIO_CHARS) return null;
  try {
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return { bytes, type: String(value?.type || "audio/webm") };
  } catch (error: any) {
    console.error("The turn could not be read:", error?.message);
    return null;
  }
}

/**
 * What was said, written down by the app's own ears. OpenAI is the one reader of every voice
 * feature here, so a turn on this call is written by the same reader the other calls listen
 * through: it is pointed at the admin's saved words before it listens, and the turn comes back
 * placed on the app's own spelling of them, so the Kibembe answered here is the confirmed Kibembe.
 */
async function listen(base44: any, apiKey: string, bytes: Uint8Array, type: string): Promise<string> {
  const { terms, rows } = await earsKnowledge(base44);
  const heard = await writeDown({ apiKey, bytes, type, terms });
  return textOf(correctEbembe(heard, rows), MAX_QUESTION);
}

// The parts of every answer, in the app's own order: the Kibembe, how it sounds, Kiswahili,
// English. The part in the language the person used leads them; the rest keep that order.
const PARTS: [string, string][] = [
  ["ebembe", "Ebembe"],
  ["guide", "Inasikika"],
  ["swahili", "Kiswahili"],
  ["english", "English"],
];

/** The leading part first, the other three after it in the app's own order. */
function partsFor(lang: string): [string, string][] {
  const lead = PARTS.find(([key]) => key === lang) || PARTS[0];
  return [lead, ...PARTS.filter((part) => part !== lead)];
}

/** The answer as the screen shows it: the person's own language leading, the rest after it. */
function shown(out: any, lang: string): string {
  return partsFor(lang)
    // a cue written for a voice — [curious] — is taken out of the part before it is shown
    .map(([key, name]) => [name, withoutCues(textOf(out?.[key]))] as [string, string])
    .filter(([, value]) => value)
    .map(([name, value]) => name + ": " + value)
    .join("\n");
}

/** One saved word as the writer reads it: its spelling, then what it means. */
function wordLine(row: any): string {
  const term = tidy(row?.term);
  if (!term) return "";
  const meaning = glossOf(term, row?.meaning) || tidy(row?.meaning);
  const usage = tidy(row?.usage);
  if (!meaning) return `- ${term} = ?`;
  return `- ${term} = ${meaning}${usage ? ` · ${usage}` : ""}`;
}

/** Every saved word, or as many as the ceiling holds when the list has run away. */
function wordsSection(rows: any[]): string {
  const lines = rows.map(wordLine).filter(Boolean);
  let body = "";
  for (const line of lines) {
    if (WORDS_HEAD.length + body.length + line.length + 1 > WORDS_CEILING) break;
    body += line + "\n";
  }
  return body ? WORDS_HEAD + body : "";
}

/**
 * The saved words closest to what was heard, nearest first. The listening service knows no
 * Kibembe, so this is what turns its rough spelling back into the words the admin saved — a
 * word it broke in two, or heard with other vowels, still reaches its own meaning.
 */
function likeSection(rows: any[], heard: string): string {
  const said = tidy(heard);
  if (!said) return "";
  const near = alikeTerms(said, rows, LIKE_LIMIT);
  if (!near.length) return "";

  const lines = near.map((row: any) => {
    const term = tidy(row.term);
    const meaning = glossOf(term, row.meaning) || tidy(row.meaning);
    const usage = tidy(row.usage);
    return `- alisikia "${tidy(row.heard)}" → neno ni "${term}"${
      meaning ? ` = ${meaning}` : " — maana yake haijaandikwa bado"
    }${usage ? ` · ${usage}` : ""}`;
  });
  return LIKE_HEAD + lines.join("\n") + "\n";
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    let payload: any = {};
    try {
      payload = await req.json();
    } catch (err) {
      payload = {};
    }

    const typed = textOf(payload?.text, MAX_QUESTION);
    const audio = audioOf(payload?.audio);
    if (!typed && !audio) {
      return Response.json({ error: "Hakuna swali lililotumwa." }, { status: 400 });
    }

    // a spoken turn is heard first; a typed one is already in words
    let transcript = "";
    if (!typed) {
      const apiKey = secrets.get("OPENAI_API_KEY");
      if (!apiKey) return Response.json({ error: "Sauti haisikiki kwa sasa." }, { status: 500 });
      transcript = await listen(base44, apiKey, audio.bytes, audio.type);
      // a turn nothing was made of never closes the call: he asks again, quietly, and the
      // phone goes on listening. No words are put on screen as the person's own.
      if (!transcript) return Response.json({ reask: REASK, transcript: "" });
    }

    const asked = typed || transcript;

    // The turn is looked up before the answer is written: a question about a person, a place, a
    // piece of news or a story waits for the search, so nothing is answered without what was
    // asked for — and a search that found nothing says so plainly instead of being invented over.
    const lookup = await lookupForTurn(base44, asked);

    // The knowledge the writer answers from is read here, whole: the rule book in force and
    // every word the admin saved, so an answer never rests on a note that was trimmed on its
    // way to the phone.
    const loaded = await knowledgeFor(base44);
    const rulesSection = loaded.rules ? RULES_HEAD + loaded.rules + "\n" : "";
    const words = wordsSection(loaded.rows);
    const like = likeSection(loaded.rows, asked);
    // the answer key stands between the rules and the word list, so the saved answer is read
    // before the whole vocabulary is
    const key = keySection([...loaded.keys, ...loaded.rows], asked);
    // the rest of the admin's one document rides with the answer: the words and the rules have their
    // own sections above, and this is everything else they wrote — their notes, their questions and
    // answers, and whatever they filed under a heading of their own name
    // the document is handed over as the parts this question needs: its rules whole, the parts the
    // question itself names, and a slice of every other part
    const [doc, tales, engine] = await Promise.all([
      docWholeBlock(base44, undefined, asked),
      storyCatalogueBlock(base44, STORY_ROOM),
      // The admin's own engine of asks and replies is read here too, from the same document: the ask
      // this turn is, and the replies saved for it — one of which is the reply, given exactly as the
      // engine writes it rather than a sentence written for the turn.
      engineTurn(base44, asked),
    ]);

    const memory = textOf(payload?.memory, MAX_MEMORY);
    const history = textOf(payload?.history, MAX_HISTORY);

    // The person has asked for their own last answer again — "Omo tenda bile?". His own last line is
    // read off the talk so far and given back: the same Kibembe words, word for word, in every part of
    // this answer, with nothing added to it and nothing left out of it. Where no line of his own stands
    // — the very first turn of a call — no fixed line is invented to fill the place: the ask is answered
    // like any other, in his own words.
    const repeating = isRepeatAsk(asked);
    const own = repeating ? lastOwnLine(history) : "";
    const repeat = repeating
      ? `The person has just asked you to say that again — "Omo tenda bile?" means "What did you say?". Your own last line was, word for word: "${own}". That line is what they are given back: the Kibembe part is that line word for word, unchanged, and every other part says exactly what it says, with nothing added to it and nothing left out of it. Never write a new sentence, never explain what you said, and never answer it in other words. The rule that a line already given is never given again does not stand here: this is that same line being asked for.`
      : "";

    const prompt = [
      ROLE,
      KIBEMBE_GUIDE,
      HOW,
      rulesSection,
      key,
      words,
      like,
      doc,
      tales,
      lookup.material,
      memory ? KNOWLEDGE_HEAD + "\n" + memory : "",
      history ? "The talk so far, oldest first:\n" + history : "",
      repeat,
      // the engine's own reply for this ask, where the turn is one of its asks — a repeat ask is given
      // back exactly as it stood, so nothing of the engine rides with it
      repeating ? "" : engine.note,
      "What they just said: " + asked,
    ]
      .filter(Boolean)
      .join("\n\n");

    const out: any = await geminiText({
      base44,
      prompt,
      response_json_schema: REPLY_SCHEMA,
    });

    // the language the person used decides which part leads the answer, which part is read
    // aloud, and which voice language it is read on
    const lang =
      String(out?.lang) === "swahili" || String(out?.lang) === "english"
        ? String(out.lang)
        : "ebembe";
    const answer = shown(out, lang);
    // the voice reads the part in the person's own language; on Kibembe the writer's own
    // spoken line carries any letter the voice would otherwise read wrongly
    const say =
      lang === "ebembe"
        ? voiceLine(out?.say) || voiceLine(out?.ebembe)
        : voiceLine(out?.[lang]) || voiceLine(out?.say);
    if (!answer || !say) {
      return Response.json({ error: "Jibu halikukamilika. Jaribu tena." }, { status: 502 });
    }

    let audio_url = "";
    try {
      const made: any = await base44.asServiceRole.integrations.Core.GenerateSpeech({
        text: say,
        voice: SPEECH_VOICE,
        language_code: SPEECH_LANG[lang],
      });
      audio_url = made?.url || "";
    } catch (error: any) {
      // the words still reach the screen when the voice cannot be made
      console.error("The voice could not be made:", error?.message);
    }

    // Where this answer stands on something looked up on the internet, where it came from goes back
    // with it — named, with its own address — so the screen can show the source of what it says
    // instead of the person having to take the answer on trust.
    return Response.json({
      transcript,
      answer,
      say,
      audio_url,
      source: lookupSource(lookup.material),
    });
  } catch (error: any) {
    console.error("The Base44 answer failed:", error?.message);
    return Response.json({ error: "Jibu halikukamilika. Jaribu tena." }, { status: 500 });
  }
}