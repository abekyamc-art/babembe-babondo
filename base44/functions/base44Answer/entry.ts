import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { secrets } from "base44:runtime";
import { alikeTerms } from "../../shared/soundsAlike.ts";
import { glossOf, knowledgeWordRows } from "../../shared/knowledgeWords.ts";
import { rulesText } from "../../shared/knowledgeRules.ts";

/**
 * The Base44 AI call. What the person said is heard, the answer is written by the app's own
 * AI from the knowledge it is handed, and the Kibembe of that answer is spoken back out loud
 * in the platform's own voice. The screen carries the same parts the app already shows —
 * Kibembe, how it sounds, Kiswahili, English — while the voice reads the Kibembe alone,
 * plainly, so what comes out of the phone is the language itself.
 *
 * The knowledge is read here, whole, on every turn: the rule book the admin has in force and
 * every word they saved. Kibembe is answered from the admin's own language rather than from a
 * note that may have been trimmed on its way to the phone.
 */

// the platform voice the Kibembe is read in, and the ceilings one answer is kept inside
const SPEECH_VOICE = "river";
// the model the Admin's Base44 AI mode answers on, pinned so every answer is written by it
const ANSWER_MODEL = "gpt_6_sol";
// The hearing service knows no Kibembe at all. Swahili is the nearest language it does know,
// so the person's Kibembe comes back as Bantu sounds — the sounds the saved words are written
// in — instead of being forced into English nobody spoke. Naming it also stops the service
// from guessing at random.
const HEARING_LANG = "swa";
const MAX_ANSWER = 900;
const MAX_SPOKEN = 320;
const MAX_QUESTION = 400;
const MAX_MEMORY = 12000;
const MAX_HISTORY = 1200;
const MAX_AUDIO_CHARS = 2500000;
// every saved word rides with every answer; this ceiling only guards against a runaway list
const WORDS_CEILING = 26000;
// how many of the saved words closest to what was heard ride ahead of the whole list
const LIKE_LIMIT = 6;
// a turn nothing could be made of: he asks again and the call goes on listening
const REASK = "Sema tena, nakusikiliza.";

const REPLY_SCHEMA = {
  type: "object",
  properties: {
    ebembe: { type: "string" },
    guide: { type: "string" },
    swahili: { type: "string" },
    english: { type: "string" },
    say: { type: "string" },
  },
  required: ["ebembe", "say"],
};

const ROLE =
  "You are Babembe Babondo GS, a Kibembe (Ebembe) guide from the Babembe village, speaking out loud with a person on a phone call. " +
  "Their words were caught by a listening service, so their spelling may be rough: read them for what the person meant, and never correct their spelling out loud.";

const KNOWLEDGE_HEAD =
  "The knowledge saved for you by the admin of this app. The rules at its head stand above everything else here, and every answer obeys them:";

const HOW = [
  "Write every answer in exactly these parts, in this order:",
  "ebembe: the answer itself in Kibembe (Ebembe), the words a Babembe speaker really uses, spelled plainly with no hyphens between syllables.",
  "guide: how that same Kibembe sounds to an American ear, syllable by syllable joined with dashes.",
  "swahili: the same thing in everyday Kiswahili. english: the same thing in plain English.",
  "say: only the Kibembe part, written exactly as a voice should read it out — no brackets, no dashes, no pronunciation notes, no language names. One or two short sentences.",
  "Keep the whole answer short: this is talk, not an essay, and never more than three sentences of Kibembe.",
  "Build the Kibembe from the words saved in the knowledge, and write every one of them exactly as it is saved. Never invent a word, a plural, a tense or a meaning that the rules and the saved words do not confirm.",
  "The rule book below decides how Kibembe is read, pronounced, written and used. Where one of its rules and your own habit disagree, the rule wins, and where it and a word on the list disagree, the list wins.",
  "A word that only sounded like a saved word is that saved word — one letter apart, the same consonants with other vowels, or a saved word the hearing broke into two. Answer straight from its meaning, and never say the word was wrong or that you do not know it.",
  "Never ask the person whether they meant another word, and never repeat their own words back to them as your answer.",
  "Never say that you did not hear them or did not understand them, and never ask them to say it again.",
  "Never repeat a line you have already given in this conversation: say something new.",
].join("\n");

// The admin's own rule book rides ahead of every other kind of knowledge: how Kibembe is read,
// pronounced, written and used is decided by it before anything else, and it is handed over
// whole — its reading key and its tense tables included.
const RULES_HEAD =
  "\nSHERIA ZA LUGHA YA KIBEMBE — the admin's own rule book for reading, pronouncing, writing and using Kibembe. It is the highest authority on the language: every answer follows it, and where one of these rules and your own habit disagree, the rule wins. Never invent a word, a plural, a tense or a meaning it does not confirm.\n";

// Every word the admin saved, handed over whole: the vocabulary every answer is built from.
const WORDS_HEAD =
  "\nMANENO YA EBEMBE — every word the admin saved for you to know:\n" +
  "Build your Kibembe from these words and nothing else, written exactly as they are here. Their meanings are what the person means when they say them. A word written with a \"?\" has no meaning saved yet: say the word, but never invent a meaning for it.\n";

// What was heard, matched against the whole saved list before the answer is written.
const LIKE_HEAD =
  "\nMANENO YANAYOKARIBIA ULILOSIKIA — the saved words closest to what was just heard:\n" +
  "The first one is the nearest: that is the word the person said, so answer straight from its meaning. Never tell them they were wrong, never offer another of these words instead, and never ask which one they meant.\n";

/**
 * The knowledge is read once and kept for a moment: a live call asks on every turn, so the
 * rule book and the word list are not fetched again and again mid-conversation. An edit the
 * admin makes still lands within the minute.
 */
const CACHE_MS = 60000;
let cache: { at: number; rules: string; rows: any[] } = { at: 0, rules: "", rows: [] };

async function knowledgeFor(base44: any) {
  if (cache.rows.length && Date.now() - cache.at < CACHE_MS) return cache;
  const loaded = await Promise.all([rulesText(base44), knowledgeWordRows(base44)]);
  cache = { at: Date.now(), rules: loaded[0], rows: loaded[1] };
  return cache;
}

function textOf(value: any, max = MAX_ANSWER): string {
  const text = typeof value === "string" ? value : "";
  return text.replace(/\s+/g, " ").trim().slice(0, max);
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

/** What was said, as the listening service heard it, in the nearest language it knows. */
async function listen(apiKey: string, bytes: Uint8Array, type: string): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: type || "audio/webm" }), "turn");
  form.append("model_id", "scribe_v1");
  form.append("language_code", HEARING_LANG);
  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
  });
  if (!res.ok) throw new Error("hear-" + res.status);
  const data: any = await res.json();
  return textOf(data?.text, MAX_QUESTION);
}

/** The answer as the screen shows it: the parts, in the order the app always uses. */
function shown(out: any): string {
  const rows = [
    ["Ebembe", textOf(out?.ebembe)],
    ["Inasikika", textOf(out?.guide)],
    ["Kiswahili", textOf(out?.swahili)],
    ["English", textOf(out?.english)],
  ];
  return rows
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
      const apiKey = secrets.get("ELEVENLABS_API_KEY");
      if (!apiKey) return Response.json({ error: "Sauti haisikiki kwa sasa." }, { status: 500 });
      transcript = await listen(apiKey, audio.bytes, audio.type);
      // a turn nothing was made of never closes the call: he asks again, quietly, and the
      // phone goes on listening. No words are put on screen as the person's own.
      if (!transcript) return Response.json({ reask: REASK, transcript: "" });
    }

    const asked = typed || transcript;

    // The knowledge the writer answers from is read here, whole: the rule book in force and
    // every word the admin saved, so an answer never rests on a note that was trimmed on its
    // way to the phone.
    const loaded = await knowledgeFor(base44);
    const rulesSection = loaded.rules ? RULES_HEAD + loaded.rules + "\n" : "";
    const words = wordsSection(loaded.rows);
    const like = likeSection(loaded.rows, asked);

    const memory = textOf(payload?.memory, MAX_MEMORY);
    const history = textOf(payload?.history, MAX_HISTORY);

    const prompt = [
      ROLE,
      HOW,
      rulesSection,
      words,
      like,
      memory ? KNOWLEDGE_HEAD + "\n" + memory : "",
      history ? "The talk so far, oldest first:\n" + history : "",
      "What they just said: " + asked,
    ]
      .filter(Boolean)
      .join("\n\n");

    const out: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: ANSWER_MODEL,
      response_json_schema: REPLY_SCHEMA,
    });

    const answer = shown(out);
    // the voice reads the Kibembe itself; when the writer gave no separate spoken line the
    // Kibembe it wrote is read as it stands
    const say = (textOf(out?.say, MAX_SPOKEN) || textOf(out?.ebembe, MAX_SPOKEN)).trim();
    if (!answer || !say) {
      return Response.json({ error: "Jibu halikukamilika. Jaribu tena." }, { status: 502 });
    }

    let audio_url = "";
    try {
      const made: any = await base44.asServiceRole.integrations.Core.GenerateSpeech({
        text: say,
        voice: SPEECH_VOICE,
      });
      audio_url = made?.url || "";
    } catch (error: any) {
      // the words still reach the screen when the voice cannot be made
      console.error("The voice could not be made:", error?.message);
    }

    return Response.json({ transcript, answer, say, audio_url });
  } catch (error: any) {
    console.error("The Base44 answer failed:", error?.message);
    return Response.json({ error: "Jibu halikukamilika. Jaribu tena." }, { status: 500 });
  }
}