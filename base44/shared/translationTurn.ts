import { secrets } from "base44:runtime";
import { geminiText } from "./gemini.ts";
import { TRANSLATE_RULES } from "./ebembeTranslation.ts";
import { KIBEMBE_GUIDE } from "./kibembeGuide.ts";
import { ANSWER_LANGUAGE } from "./languageRules.ts";
import { TRUTH_RULES } from "./truthRules.ts";

/**
 * Who answers a translation.
 *
 * A translation is a turn of its own kind, and it is the one turn whose every word has to be a word the
 * app already holds: a word the admin has reviewed and saved, or the person reading it will not be
 * understood and the word will not be recognised when it is said back. So the asking is not answered
 * from everything the app knows at once. It is answered by one AI kept for translations alone — the
 * translation AI — and that AI is handed the app's own Word Bank and the admin's rule book for
 * translating into Kibembe, and nothing else.
 *
 * Where the translation AI cannot answer — its account is out of room, the service is away for a
 * moment, or the Word Bank really holds no word for what was asked for — the very same asking is put to
 * a second configured AI. Where neither of them can answer it, the person is told plainly that no
 * confirmed translation could be found, rather than being given a word the app has not confirmed.
 *
 * Nothing here invents Kibembe: where the Bank holds no word for a thing, the translation is refused
 * rather than filled out with a guessed, borrowed or built form.
 */

/** What the person is told where no confirmed translation could be found at all. */
export const TRANSLATION_UNCONFIRMED =
  'That translation could not be answered just now — the app holds no confirmed Kibembe word for it yet. Please try again.';

/** One word the admin saved: the form itself, and what it means. */
export type BankWord = { term: string; meaning: string };

/** The answer as it comes back: the translation, and whether the Word Bank really carries it. */
type TranslationOut = { reply: string; confident: boolean; language: string };

/** The AI kept for translations, and the room one translation answer is given. */
const SPECIALIST_MODEL = "gpt-4.1-mini";
const MAX_TURN = 300;
const MAX_LAST = 300;
// A translation is given whole — the Kibembe, how it sounds, the Kiswahili and the English — so it is
// given more room than a line of talk.
const MAX_REPLY = 900;
const MAX_ROW = 70;
const MAX_ROWS = 240;
const BANK_ROOM = 24000;

/** How many words a turn may be made of and still be read as one translation ask rather than as talk. */
const MAX_WORDS = 14;

/** An explicit translation ask: it is about translating, whatever else the turn holds. */
const VERB =
  /(\btranslat|\btafsiri|\btafsir\b|how do (you|i) (say|write)|how is .{0,40}? said|\bjinsi ya kusema|\bkwa kibembe\b|\bkwa ebembe\b)/i;

/** The turn names the language the translation is into. */
const NAMED = /(kibembe|ebembe)/i;

/**
 * A turn that asks for a whole telling rather than for a word or a phrase: a story, a song, a proverb.
 * Those belong to the assistant that holds the telling, which is where the app has always answered
 * them, and not here.
 */
const TELLING =
  /(story|stories|song|songs|tale|tales|telling|sing|rap|proverb|proverbs|history|news|letter|book|video|film|wimbo|nyimbo|hadithi|ngano|methali)/i;

/** The words that carry no ask of their own: they stand around a translation ask without being one. */
const STOP = new Set([
  "translate", "translation", "translated", "translator", "tafsiri", "tafsiria", "say", "says", "said",
  "saying", "write", "writing", "written", "mean", "means", "meaning", "maana", "word", "words", "neno",
  "maneno", "phrase", "kibembe", "ebembe", "bembe", "english", "kiingereza", "swahili", "kiswahili",
  "how", "what", "does", "do", "the", "a", "an", "in", "into", "to", "for", "of", "is", "are", "you",
  "i", "me", "my", "we", "please", "can", "could", "would", "give", "tell", "ya", "kwa", "na", "ni",
  "hii", "hilo", "this", "that", "it", "and",
]);

/** A line as the words it is made of, folded: accents flattened, small letters, punctuation aside. */
function wordsOf(value: any): string[] {
  return (
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .match(/[a-z0-9']+/g) || []
  );
}

/** One line flattened to a single run of words. */
function tidy(value: any, room: number): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, room);
}

/** Whether the app's own Word Bank really holds a word of this turn. */
function holdsWord(rows: any[], word: string): boolean {
  for (const row of Array.isArray(rows) ? rows : []) {
    const text = `${row?.term || ""} ${row?.meaning || ""}`.normalize("NFD").toLowerCase();
    if (text.includes(word)) return true;
  }
  return false;
}

/**
 * Whether a turn is asking for a Kibembe translation and nothing else.
 *
 * It has to name the language, it has to be a short turn — a translation ask is a word or a phrase, not
 * a paragraph — and it either says plainly that it is a translation, or it carries a word the app's own
 * Word Bank really holds. A turn that asks for a whole telling, or that asks about something the Bank
 * has never held, is not a translation turn: it is answered exactly as it was before this AI existed.
 */
export function isTranslationTurn(said: any, rows: any[]): boolean {
  const line = String(said ?? "").trim();
  if (!line || line.length > 600) return false;
  if (!NAMED.test(line)) return false;
  if (TELLING.test(line)) return false;
  const words = wordsOf(line);
  if (!words.length || words.length > MAX_WORDS) return false;
  if (VERB.test(line)) return true;
  return words.some((word) => word.length > 2 && !STOP.has(word) && holdsWord(rows, word));
}

/**
 * The Word Bank as this turn is handed it: the words the turn itself names stand first — so the word
 * that was asked about is always in front of the AI, however large the Bank is — and the rest of the
 * Bank stands behind them, inside the room one turn is given.
 */
export function bankForTurn(rows: any[], said: any): BankWord[] {
  const wanted = wordsOf(said).filter((word) => word.length > 2 && !STOP.has(word));
  const hits: BankWord[] = [];
  const rest: BankWord[] = [];
  const seen = new Set<string>();

  for (const row of Array.isArray(rows) ? rows : []) {
    const term = tidy(row?.term, MAX_ROW);
    const meaning = tidy(row?.meaning, MAX_ROW);
    if (!term && !meaning) continue;
    const key = `${term} = ${meaning}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const text = `${term} ${meaning}`.normalize("NFD").toLowerCase();
    (wanted.some((word) => text.includes(word)) ? hits : rest).push({ term, meaning });
    if (hits.length + rest.length >= MAX_ROWS) break;
  }

  const out: BankWord[] = [];
  let used = 0;
  for (const row of [...hits, ...rest]) {
    const size = row.term.length + row.meaning.length + 4;
    if (used + size > BANK_ROOM) break;
    used += size;
    out.push(row);
  }
  return out;
}

/**
 * The terms of the Bank this turn is really about: the words of the turn standing in a term or in a
 * meaning the admin saved. They are what a translation of this turn has to be made of.
 */
export function bankTermsFor(rows: any[], said: any): string[] {
  const wanted = wordsOf(said).filter((word) => word.length > 2 && !STOP.has(word));
  if (!wanted.length) return [];
  const out: string[] = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const term = tidy(row?.term, MAX_ROW);
    if (!term || out.includes(term)) continue;
    const text = `${term} ${tidy(row?.meaning, MAX_ROW)}`.normalize("NFD").toLowerCase();
    if (wanted.some((word) => text.includes(word))) out.push(term);
  }
  return out;
}

/**
 * Whether an answer really uses one of the Bank's own terms. It is the one thing checked on the way
 * back: a word the app does not hold is never given to a person, however well the service wrote it.
 */
function carriesTerm(reply: string, terms: string[]): boolean {
  const said = String(reply || "").normalize("NFD").toLowerCase();
  return terms.some((term) => {
    const form = term.normalize("NFD").toLowerCase();
    // a term written in parts — "mbulu-suele" — is read the same however its parts are spaced
    return said.includes(form) || said.includes(form.replace(/-/g, " ")) || said.includes(form.replace(/-/g, ""));
  });
}

/** The answer as the person reads it: the whole translation, cut at a sentence where it runs long. */
function asAnswer(value: any): string {
  const line = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!line) return "";
  if (line.length <= MAX_REPLY) return line;
  const cut = line.slice(0, MAX_REPLY);
  const at = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
  const short = at > MAX_REPLY * 0.4 ? cut.slice(0, at + 1) : cut.slice(0, cut.lastIndexOf(" "));
  return short.trim();
}

/** The translation AI's own standing orders: the Bank it is handed is the only Kibembe it may write. */
const ROLE = [
  "You are the translation AI of this app: the one AI kept for Kibembe word and phrase translations.",
  "A person has asked how something is said or written in Kibembe. You answer that one translation and",
  "nothing else: you are not the app's teacher, not its story teller and not its general assistant, and",
  "you never look anything up and never answer a question that is not this translation.",
  "The words of the app's own Word Bank are handed to you above. They are the only Kibembe that exists",
  "for you: every word of your translation is a word written there, spelled exactly as it is written",
  "there, and the meaning it carries there is the meaning it carries in your line.",
  "KUTAFSIRI KWA KIBEMBE — the admin's own rule book for translating into Kibembe, which stands above",
  "everything else you would do, and whose own order for giving a translation is the order you give it",
  "in, even where the general language rules below say otherwise:",
  TRANSLATE_RULES,
  "- Where the Word Bank really carries what was asked for, set confident to true and give the whole",
  "  translation, in that order, in plain text.",
  "- Where the Word Bank carries no word for what was asked for, set confident to false and leave reply",
  "  empty. Never invent a Kibembe word to fill the gap out of your own knowledge, never borrow one from",
  "  another Bantu language, never build one by analogy from another word's ending, and never answer the",
  "  ask in another language and pass it off as Kibembe.",
  "- One word asked about is answered with what the Bank says it means, so the person sees the word they",
  "  were given standing in the Bank itself.",
  "- Never repeat a line you have already given in this conversation.",
  KIBEMBE_GUIDE,
  ANSWER_LANGUAGE,
  TRUTH_RULES,
].join("\n");

/** The shape the translation AI answers in: the translation, and whether the Bank really carries it. */
const SHAPE = {
  type: "object",
  properties: {
    reply: { type: "string" },
    confident: { type: "boolean" },
    language: { type: "string", enum: ["ebembe", "swahili", "english"] },
  },
  required: ["reply", "confident", "language"],
  additionalProperties: false,
};

/** Everything the translation AI is handed: the Bank, the admin's rule book, and the asking itself. */
function askFor({ said, rows, rules, lastAgent }: any): string {
  const bank = bankForTurn(rows, said);
  const list = bank.length
    ? bank.map((row) => `- ${row.term}${row.meaning ? ` = ${row.meaning}` : ""}`).join("\n")
    : "- (the app's Word Bank holds nothing at all)";
  const held = tidy(lastAgent, MAX_LAST);
  const book = tidy(rules, 6000);

  return [
    "THE APP'S OWN WORD BANK — the confirmed words of this app, and the only Kibembe you may write:",
    list,
    book
      ? "\nSHERIA ZA LUGHA YA KIBEMBE — the admin's own rule book for reading, pronouncing, writing and " +
        "using Kibembe. It stands above your own habit:\n" +
        book
      : "",
    held ? `\nYour own last answer in this conversation, which is never given again: "${held}"` : "",
    `\nWhat the person asked for: "${tidy(said, MAX_TURN)}"`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** The words out of a structured answer, however the service handed them back. */
function outText(data: any): string {
  const direct = String(data?.output_text || "").trim();
  if (direct) return direct;
  const items = Array.isArray(data?.output) ? data.output : [];
  for (const item of items) {
    const parts = Array.isArray(item?.content) ? item.content : [];
    for (const part of parts) {
      const text = String(part?.text || "").trim();
      if (text) return text;
    }
  }
  return "";
}

/** One answer read into the shape the app asked for, or nothing where it came back unreadable. */
function readOut(raw: any): TranslationOut | null {
  const shape =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        })()
      : raw;
  if (!shape || typeof shape !== "object") return null;
  return {
    reply: asAnswer(shape.reply),
    confident: shape.confident === true,
    language: ["ebembe", "swahili", "english"].includes(String(shape.language))
      ? String(shape.language)
      : "ebembe",
  };
}

/**
 * The translation AI itself: the app's own OpenAI account, asked for one translation and nothing else.
 * The account is read here on the server and never sent to the app.
 */
async function specialist(apiKey: string, prompt: string): Promise<TranslationOut | null> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: SPECIALIST_MODEL,
      instructions: ROLE,
      input: prompt,
      text: { format: { type: "json_schema", name: "translation_reply", strict: true, schema: SHAPE } },
      max_output_tokens: 700,
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) {
    const said = await response.text().catch(() => "");
    throw new Error(`the translation AI answered ${response.status} ${said.slice(0, 200)}`);
  }
  return readOut(outText(await response.json()));
}

/**
 * One translation answered.
 *
 * The translation AI is asked first, on its own account, with the app's Word Bank and the admin's rule
 * book for translating in front of it. Where it cannot answer, or says plainly that the Bank holds no
 * word for what was asked for, the second AI — the reading service the app's other answers stand on —
 * is asked the very same thing. Where neither of them answers, the person is told plainly that no
 * confirmed translation could be found, rather than being given a word the app has not confirmed.
 */
export async function translationAnswer(
  base44: any,
  { said, rows, rules, lastAgent }: any
): Promise<{ reply: string; via: "specialist" | "fallback" | "none" }> {
  // The Bank is the whole of what may be given. Where it holds no word for what was asked for — or
  // where the Bank itself could not be read for this turn — nothing is put to any AI at all: the answer
  // is that the app holds no confirmed word for it yet, rather than a word written from a service's own
  // knowledge and passed off as Kibembe.
  const terms = bankTermsFor(rows, said);
  if (!terms.length) {
    console.log("The Word Bank holds no word for this turn — no AI was asked for it.");
    return { reply: TRANSLATION_UNCONFIRMED, via: "none" };
  }

  const prompt = askFor({ said, rows, rules, lastAgent });

  const apiKey = secrets.get("OPENAI_API_KEY");
  if (apiKey) {
    try {
      const out = await specialist(apiKey, prompt);
      if (out?.confident && out.reply && carriesTerm(out.reply, terms)) {
        return { reply: out.reply, via: "specialist" };
      }
      if (out) {
        console.log("The translation AI did not confirm a translation for this turn, or did not use it.");
      }
    } catch (error: any) {
      console.error("The translation AI could not answer:", error?.message);
    }
  }

  try {
    const out = readOut(
      await geminiText({ base44, group: "answer", prompt, response_json_schema: SHAPE })
    );
    if (out?.confident && out.reply && carriesTerm(out.reply, terms)) {
      return { reply: out.reply, via: "fallback" };
    }
  } catch (error: any) {
    console.error("The second AI could not answer the translation:", error?.message);
  }

  return { reply: TRANSLATION_UNCONFIRMED, via: "none" };
}