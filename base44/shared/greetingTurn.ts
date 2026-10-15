import { secrets } from "base44:runtime";
import { geminiText } from "./gemini.ts";
import { ANSWER_LANGUAGE } from "./languageRules.ts";
import { TRUTH_RULES } from "./truthRules.ts";

/**
 * Who answers a greeting.
 *
 * A greeting is a turn of its own kind: it is short, it opens a conversation, and there is no question
 * in it to be looked up. The app answers it with one AI kept for greetings alone — the greetings AI —
 * and that AI is handed the greetings the admin has saved and nothing else, so a greeting is answered
 * from the confirmed forms rather than from everything this app knows at once. That is what keeps a
 * greeting accurate: too much knowledge in front of one short hello is what makes an answer wander.
 *
 * Where the greetings AI cannot answer — its account is out of room, the service is away for a moment,
 * or it says plainly that the app holds no greeting that fits — the very same greeting is put to a
 * second configured AI, the reading service the app's other answers stand on. Only where neither of
 * them can answer is the person told plainly that no greeting answer could be confirmed.
 *
 * Nothing here decides by itself what a greeting is: the forms are the admin's own saved words, read
 * from the Word Bank, and a Kibembe greeting is never invented.
 */

/** What the person is told where neither AI could answer a greeting at all. */
export const GREETING_UNCONFIRMED =
  'The greeting could not be answered just now — no greeting answer could be confirmed. Please try again.';

/** One greeting the admin saved: the form itself, and what it means. */
export type GreetingForm = { term: string; meaning: string };

/** The answer as it comes back: the words, and whether the app's own forms really answered it. */
type GreetingOut = { reply: string; confident: boolean; language: string };

/** The AI kept for greetings, and the room one greeting answer is given. */
const SPECIALIST_MODEL = "gpt-4.1-mini";
const MAX_TURN = 300;
const MAX_LAST = 300;
const MAX_REPLY = 320;
const MAX_FORMS = 40;
const MAX_FORM = 90;
const MAX_TERM = 70;

/** How many words a turn may be made of and still be read as a greeting rather than as a question. */
const MAX_GREETING_WORDS = 8;

/**
 * A meaning that says the saved form is a greeting: the words the app's own greetings carry —
 * "How did you sleep?", "Welcome back", "Nice to see you", "See you later" — and the plain greetings
 * of the app's other two languages.
 */
const AS_GREETING =
  /greeting|salutation|hello|hi\b|welcome|how (?:are|did|was) you|good (?:morning|afternoon|evening|day|night)|sleep well|nice to see|long time no see|see you|take care|congratul|happy birthday|shikamoo|marahaba|jambo|habari|salaam|salamu|karibu|mambo/i;

/**
 * The greetings of Kiswahili and English, which need no saving: they are the plain words of those two
 * languages, and a greeting said in them is still a greeting. A Kibembe greeting is never here — it is
 * one of the forms the admin saved, or it is nothing.
 */
const PLAIN_RUNS: string[][] = [
  ["hello"],
  ["hi"],
  ["hey"],
  ["hei"],
  ["greetings"],
  ["welcome"],
  ["morning"],
  ["afternoon"],
  ["evening"],
  ["good", "morning"],
  ["good", "afternoon"],
  ["good", "evening"],
  ["good", "night"],
  ["how", "are", "you"],
  ["how", "was", "your", "day"],
  ["nice", "to", "see", "you"],
  ["good", "to", "see", "you"],
  ["long", "time", "no", "see"],
  ["see", "you"],
  ["see", "you", "later"],
  ["sleep", "well"],
  ["have", "a", "good", "day"],
  ["take", "care"],
  ["congratulations"],
  ["happy", "birthday"],
  ["jambo"],
  ["habari"],
  ["mambo"],
  ["shikamoo"],
  ["marahaba"],
  ["salaam"],
  ["salamu"],
  ["salama"],
  ["hujambo"],
  ["hamjambo"],
];

/**
 * The words that carry no business of their own in a short turn: a greeting stands with them and is
 * still only a greeting. A word outside this set — and outside the greetings themselves — is what makes
 * a turn something the greetings AI must not answer.
 */
const FILLER = new Set([
  "a", "an", "the", "and", "or", "to", "of", "for", "in", "on", "at", "with", "it", "is", "are", "am",
  "was", "were", "be", "been", "you", "your", "yours", "we", "us", "our", "my", "me", "i", "he", "she",
  "they", "them", "there", "here", "so", "very", "much", "many", "all", "just", "now", "today",
  "tonight", "this", "that", "again", "too", "also", "please", "how", "doing", "going", "things",
  "life", "day", "friend", "friends", "brother", "sister", "sir", "madam", "bro", "man", "guys",
  "everyone", "everybody", "family", "morning", "afternoon", "evening", "night",
  // Kiswahili's own plain words: they stand around a greeting without adding anything to it
  "yako", "wako", "lako", "zako", "ako", "etu", "sana", "je", "tu", "tena", "pia", "na", "ni", "wa",
  "ya", "za", "la", "kwa", "bwana", "dada", "kaka", "ndugu", "rafiki", "mzuri", "nzuri", "asubuhi",
  "jioni", "usiku", "mchana",
]);

/** A line as the words it is made of, folded: accents flattened, small letters, punctuation aside. */
function wordsOf(value: any): string[] {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .match(/[a-z0-9']+/g) || [];
}

/** One line flattened to a single run of words. */
function tidy(value: any, room: number): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, room);
}

/**
 * The greetings the admin saved, out of the whole Word Bank: the forms whose own meaning says they are
 * greetings. A form saved without a meaning is not one — nothing is a greeting here on a guess.
 */
export function greetingForms(rows: any[]): GreetingForm[] {
  const out: GreetingForm[] = [];
  const seen = new Set<string>();
  for (const row of Array.isArray(rows) ? rows : []) {
    const term = tidy(row?.term, MAX_TERM);
    const meaning = tidy(row?.meaning, MAX_FORM);
    if (!term || !meaning) continue;
    if (!AS_GREETING.test(meaning) && !AS_GREETING.test(term)) continue;
    const key = wordsOf(term).join(" ");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ term, meaning });
    if (out.length >= MAX_FORMS) break;
  }
  return out;
}

/** Which of a turn's words are covered by a greeting run — a saved form, or a plain greeting. */
function coveredWords(words: string[], forms: GreetingForm[]): boolean[] {
  const covered = new Array(words.length).fill(false);
  const runs = [...PLAIN_RUNS, ...forms.map((form) => wordsOf(form.term))];
  for (const run of runs) {
    if (!run.length) continue;
    for (let at = 0; at + run.length <= words.length; at += 1) {
      let row = true;
      for (let step = 0; step < run.length; step += 1) {
        if (words[at + step] !== run[step]) {
          row = false;
          break;
        }
      }
      if (row) for (let step = 0; step < run.length; step += 1) covered[at + step] = true;
    }
  }
  return covered;
}

/**
 * Whether a turn is a greeting and nothing else: it is short, it carries one of the greetings the app
 * holds — a form the admin saved, or a plain greeting of Kiswahili or English — and every other word of
 * it is a plain word that adds no question. A turn with anything else in it is not a greeting, and is
 * answered exactly as it was before this specialist existed.
 */
export function isGreetingTurn(said: any, forms: GreetingForm[]): boolean {
  const words = wordsOf(said);
  if (!words.length || words.length > MAX_GREETING_WORDS) return false;
  const covered = coveredWords(words, forms);
  if (!covered.some(Boolean)) return false;
  return words.every((word, at) => covered[at] || FILLER.has(word));
}

/** The answer as the person reads it: one short run of plain words, cut at a sentence when it runs long. */
function asAnswer(value: any): string {
  const line = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!line) return "";
  if (line.length <= MAX_REPLY) return line;
  const cut = line.slice(0, MAX_REPLY);
  const at = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
  const short = at > MAX_REPLY * 0.4 ? cut.slice(0, at + 1) : cut.slice(0, cut.lastIndexOf(" "));
  return short.trim();
}

/** The greetings AI's own standing orders: greetings are what it answers, and nothing else is. */
const ROLE = [
  "You are the greetings AI of this app: the one AI kept for greetings and salutations alone.",
  "A greeting has just been said to you. You answer that greeting and nothing else. You are not the app's",
  "teacher and not its knowledge assistant: you never answer a question, never explain anything, never",
  "teach, and never look anything up.",
  "How a greeting is answered:",
  "- The greetings the admin of this app saved are handed to you above. A greeting said in Kibembe is",
  "  answered with one of those forms and with nothing else: use it exactly as it is written there, letter",
  "  for letter. Never write a Kibembe word, spelling or meaning of your own, and never pass a word of",
  "  another language off as Kibembe.",
  "- Where the person greeted you in Kiswahili or English, answer in the plain words of that language, in",
  "  your own words, however short — those two languages need no saved form.",
  "- Where the greeting is Kibembe and none of the saved forms answers it, set confident to false and",
  "  leave reply empty. Never invent a Kibembe form to fill the place, and never answer a Kibembe",
  "  greeting in another language instead.",
  "- One short greeting is the whole answer: the greeting said back, and at most one short courtesy after",
  "  it. Never a lesson, never an explanation, never a list, never a question that asks the person for",
  "  anything, and never another turn's subject.",
  "- Never repeat a line you have already given in this conversation.",
  "- Plain text only: no headings, no lists, no markdown, no brackets, no pronunciation notes, and never",
  "  the name of a language.",
  ANSWER_LANGUAGE,
  TRUTH_RULES,
].join("\n");

/** The shape the greetings AI answers in: the greeting itself, and whether the app's own forms answered it. */
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

/** Everything the greetings AI is handed: the saved forms, the admin's rule book, and the turn itself. */
function askFor({ said, rows, rules, lastAgent }: any): string {
  const forms = greetingForms(rows);
  const list = forms.length
    ? forms.map((form) => `- ${form.term}${form.meaning ? ` = ${form.meaning}` : ""}`).join("\n")
    : "- (the app holds no saved greeting at all)";
  const held = tidy(lastAgent, MAX_LAST);

  return [
    "THE GREETINGS THE ADMIN OF THIS APP SAVED — the only Kibembe greetings that exist for you:",
    list,
    rules
      ? "\nSHERIA ZA LUGHA YA KIBEMBE — the admin's own rule book for reading, pronouncing, writing and using Kibembe. It stands above your own habit:\n" +
        tidy(rules, 6000)
      : "",
    held ? `\nYour own last answer in this conversation, which is never given again: "${held}"` : "",
    `\nThe greeting said to you: "${tidy(said, MAX_TURN)}"`,
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
function readOut(raw: any): GreetingOut | null {
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
 * The greetings AI itself: the app's own OpenAI account, asked for one greeting answer and nothing else.
 * The account is read here on the server and never sent to the app.
 */
async function specialist(apiKey: string, prompt: string): Promise<GreetingOut | null> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: SPECIALIST_MODEL,
      instructions: ROLE,
      input: prompt,
      text: { format: { type: "json_schema", name: "greeting_reply", strict: true, schema: SHAPE } },
      max_output_tokens: 300,
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) {
    const said = await response.text().catch(() => "");
    throw new Error(`the greetings AI answered ${response.status} ${said.slice(0, 200)}`);
  }
  return readOut(outText(await response.json()));
}

/**
 * One greeting answered.
 *
 * The greetings AI is asked first, on its own account and with the admin's saved greetings in front of
 * it. Where it cannot answer, or says plainly that the app holds no greeting that fits, the second AI —
 * the reading service the app's other answers stand on — is asked the very same thing. Where neither of
 * them answers, the person is told plainly rather than left with a line nobody confirmed.
 */
export async function greetingAnswer(
  base44: any,
  { said, rows, rules, lastAgent }: any
): Promise<{ reply: string; via: "specialist" | "fallback" | "none" }> {
  const prompt = askFor({ said, rows, rules, lastAgent });

  const apiKey = secrets.get("OPENAI_API_KEY");
  if (apiKey) {
    try {
      const out = await specialist(apiKey, prompt);
      if (out?.confident && out.reply) return { reply: out.reply, via: "specialist" };
      if (out) console.log("The greetings AI did not confirm an answer for this turn.");
    } catch (error: any) {
      console.error("The greetings AI could not answer:", error?.message);
    }
  }

  try {
    const out = readOut(
      await geminiText({ base44, group: "answer", prompt, response_json_schema: SHAPE })
    );
    if (out?.confident && out.reply) return { reply: out.reply, via: "fallback" };
  } catch (error: any) {
    console.error("The second AI could not answer the greeting:", error?.message);
  }

  return { reply: GREETING_UNCONFIRMED, via: "none" };
}