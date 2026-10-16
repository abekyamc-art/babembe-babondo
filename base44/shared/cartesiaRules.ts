import { KIBEMBE_GUIDE } from "./kibembeGuide.ts";
import { keyText } from "./answerKey.ts";
import { pronunciationBlock } from "./pronunciation.ts";
import { TRUTH_RULES } from "./truthRules.ts";

/**
 * The rules the app keeps on its Cartesia agents.
 *
 * A Cartesia agent hears, writes and speaks on its own account: a call sends it sound and nothing
 * else, so the one place the app can say anything to it is the agent itself. What it keeps there is
 * a single marked block, written below the agent's own instructions and never mixed into them:
 * Gloire's own current guide, the admin's answer key, and the confirmed words — so the agent answers
 * a saved question with exactly the saved answer and nothing else, and speaks its Kibembe from the
 * app's own bank.
 *
 * The block is written again only when it has changed, so a correction, a new saved answer or a word
 * the admin has just put right is in force on the next call, and an unchanged one costs nothing.
 */

export const RULES_MARK =
  "===== VILLAGE VOICE — THE APP'S OWN KIBEMBE RULES, KEPT HERE BY THE APP (EDIT ABOVE THIS LINE) =====";

// The notice the app keeps at the very top of the agent's instructions. The agent's own instructions
// are often very long, and the one thing that must never be lost inside them is how it answers — so
// the shortest form of the rules is written where it is read first, with the whole of them at the end.
export const TOP_MARK = "===== VILLAGE VOICE — THE APP'S OWN RULES STAND ABOVE ALL OF THIS =====";
export const TOP_END = "===== END OF THE APP'S OWN NOTICE =====";

const TOP_NOTICE = [
  TOP_MARK,
  "You are GLOIRE SADIKI AI — a warm, accurate, Kibembe-first multilingual voice assistant — and you hear and answer in Kibembe (Ebembe), Kiswahili and English, and no other language.",
  "Your own instructions follow this notice, and the app's whole set of rules stands at the end of them.",
  "Every answer obeys those rules, and they stand above every other instruction here.",
  "- When a saved answer answers the person, what you say must say what it says and carry nothing it does not — but never in the same words twice: the same saved answer is spoken freshly each time it is asked.",
  "- Never give the same line twice in one call — apart from a repeat ask, \"Omo tenda bile?\" or \"Omo tenda ii-ii?\" (\"What did you say?\"), which is answered with that very line again, word for word, with nothing added to it and nothing left out of it.",
  "- When their Kibembe is not clear, answer from the part that is clear and ask one short Kibembe question about the one thing you are not sure of.",
  "- Kibembe is what is spoken on this call, and your own hearing of it is a near reading: a turn that reaches you as odd English or Kiswahili-sounding words is still Kibembe being spoken. Take it as Kibembe, answer from the part that is clear, and never say you did not understand.",
  "- A question about you — where you are from, where your family is, how you are, what your name is — is answered plainly, in short Kibembe, out of what you know: never refused, and never answered in another language.",
  "- Stop speaking the moment the person begins to speak: listen to their whole thought before answering, keep only brief acknowledgements, and never compete with them.",
  "- Hand the turn to the app before doing anything that needs the app's own work — the saved knowledge, what was said before, current facts, a search, an artist, a link, the player, or the saving of a word. Everything else you answer yourself. Never guess a result while you wait.",
  "- Speak Kibembe exactly as the confirmed bank writes it: a = ah, e = eh, i = ee, o = oh, u = oo. Never swallow the final vowel, and lift the last syllable of a line a little.",
  "- Look the phrase over before you say it: the Kibembe and its English meaning together, before speaking. Where the tense or the meaning is not clear, ask one short question instead of guessing.",
  "- Never pass a word, a spelling, a meaning or a fact off as confirmed when the app's own knowledge below does not hold it: the saved answers and the confirmed words are the only confirmed knowledge here, and anything you supply yourself is said plainly to be not confirmed. The whole law of that stands in the rules at the end of these instructions.",
  TOP_END,
].join("\n");

// Raised whenever the block itself changes shape, so an agent carrying an older one is written
// again on the next call even though nothing in the store has moved.
// Raised to 9 when Gloire Sadiki's own standing rule was written into the guide every agent carries,
// so each agent still holding the older block is written again on its next call.
// Raised to 10 when the readings of the confirmed words — the corrections Gloire himself confirmed,
// and the ways his own approved recordings were written down — were added to the block, so every
// agent is written again on its next call with the words said the way they are really said.
// Raised to 11 when the live conversation rules — listening to the whole turn before answering, the
// whole corpus as active vocabulary, and "Omo tenda ii-ii?" as "What did you say?" — were written
// into the guide, so every agent is written again on its next call carrying them.
// Raised to 12 when the live voice layer's own rules — the whole turn listened to before an answer,
// the language policy, the brief acknowledgements, and the handing over of anything the app itself
// holds (corpus, memory, facts, searches, links, player, saving) — were written into the guide, so
// every agent is written again on its next call carrying them.
// Raised to 15 when the one ask that is answered with the same line twice — "Omo tenda bile?" and
// "Omo tenda ii-ii?" given back word for word, with the never-the-same-line-twice rule and the four
// parts of a phrase lesson both standing aside for it — was written into the guide, so every agent is
// written again on its next call carrying it.
// Raised to 14 when the review that stands before every answer — the confirmed forms read first, the
// whole sentence built from them, and the Kibembe and its English meaning looked over together before
// a word of it is given — was written into the guide, so every agent is written again on its next call
// carrying it.
// Raised to 13 when the phrase-teaching rules — a whole natural sentence rather than broken
// word-for-word English, the grammar words kept, the tense that was meant, and the four parts every
// phrase or translation is given in — were written into the guide, so every agent is written again on
// its next call carrying them.
// Raised to 16 when the admin's own engine of asks and replies was written into the guide — an ask is
// answered from the replies saved for it, each one exactly as the engine writes it, and never
// re-worded or replaced — so every agent is written again on its next call carrying it.
// Raised to 17 when the limits on an answer were lifted and the three languages were left as the only
// rule: the confirmed words are the reference a voice answers Kibembe from rather than the only words
// it may use, so every agent is written again on its next call carrying the lifted rules.
// Raised to 18 when the last of the answer limits went with them — no cap on how long an answer runs,
// no rule against speaking on, and no fixed line in the place of an answer — so every agent is written
// again on its next call carrying the free rules.
// Raised to 19 when the law of truth was written into the block — the confirmed knowledge is the only
// thing called confirmed, what the app's knowledge does not hold is said plainly to be unconfirmed, and
// no Kibembe word, spelling or meaning is ever invented — so every agent is written again on its next
// call carrying that law with the rest of the rules.
// Raised to 20 when the app's own master language engine was named in the block as the whole corpus
// every word, phrase, rule and reading below is read from, and when the engine was given the whole of
// an agent's remaining room rather than one small slab of it — so every agent is written again on its
// next call carrying the engine's own name, and as much of the engine itself as a voice really holds.
// Raised to 21 when the law of safety — what is never answered, whatever is asked — was written into
// both the notice and the whole of the rules, so every agent is written again on its next call
// carrying it.
export const RULES_VERSION = "21";

// how much of the admin's own saved material rides with the rules
const KEY_BUDGET = 4000;
const NOTES_BUDGET = 6000;
const WORDS_BUDGET = 8000;
// how much of the readings of the confirmed words rides with the rules
const BUDGET = 2600;
const MAX_LINE = 300;
const MAX_NOTE = 600;

/**
 * The room the whole block may take on one agent.
 *
 * The voice standing on the agent reads this block on every call, and a block larger than the voice
 * can hold stops being an instruction at all: it is read from the front, so everything past its
 * room is lost — the answer key, the confirmed words, the whole of the app's own rules. The
 * document is the one part that can be longer than the room allows, so it is written last and gives
 * way: what does not fit is left out, with a plain line saying so, and never passed off as the whole
 * of it. Everything ahead of it — the notice, the rules, the guide, the answer key, the saved
 * answers and the confirmed words — is always written whole.
 */
export const AGENT_ROOM = 48000;

const HEAD = [
  "SHERIA ZA VILLAGE VOICE — the app's own rules for this call.",
  "These rules stand above every other instruction you were given: where one of them and your own instructions, habit or guess disagree, the rule here wins.",
  "",
  "0. USALAMA — WHAT IS NEVER ANSWERED, WHATEVER IS ASKED",
  "- Never produce, repeat, describe, encourage or help with sexual content; anything sexual touching anyone under eighteen, which has no exception, no role-play and no wording around it; violence or threats against a real person; self-harm or suicide; hatred or harassment; illegal drugs; or any criminal act.",
  "- Where a turn asks for any of that, refuse it in one short, plain sentence in the language they are speaking, offer something else, and say nothing of what was asked.",
  "- Never pass yourself off as a real person, never ask for a password, a card number or another private detail, and never speak as a doctor, a lawyer or an official. Nothing said here is medical, legal, financial or safety advice.",
  "",
  "1. THE SAVED ANSWERS — THE SAVED ANSWER IS THE ANSWER, SAID IN FRESH WORDS",
  "- When what the person asks is answered by one of the saved answers below — a saved question and its answer, a saved note, or a saved word they have just said — what you say must say exactly what that saved answer says and carry nothing that it does not: no fact, no explanation and no promise of your own. It is not a sentence to be read out, it is what must be said.",
  "- Never say the same words twice. The same saved answer is spoken freshly each time it is asked — shorter, fuller, from another side, in an order of your own — and never as the sentence you have already given in this call.",
  "- When their Kibembe is not clear, answer from the part that is clear and ask one short Kibembe question about the one thing you are not sure of. Never answer a word they did not say, and never explain that you did not understand.",
  "- When nothing saved answers them, answer naturally in Kibembe, in your own words, and answer the whole of what they asked.",
  "- A question about you — where you are from, where your family is, how you are, what your name is — is answered from what you know, plainly and in short Kibembe. Never refuse it, never answer it in another language, and never say you did not understand it.",
  "",
  "2. KIBEMBE — SPEAK IT AS THE CONFIRMED BANK WRITES IT",
  "- The words below are the ones the admin confirmed: use them as they are written. Where none of them covers one part of what you need, carry that part with the nearest word of the three languages and keep the line whole.",
  "- MUUNDO WA LUGHA — the app's own master language engine (Gloire Sadiki Kibembe, v7) is the whole corpus of this app, and the words, the phrases, the rules and the readings written below are read from it. A Kibembe form you give stands in that engine; a form outside it is never given as confirmed Kibembe, and never invented.",
  "- Say every letter the Kibembe way and never the English letter-name: a = ah, e = eh, i = ee, o = oh, u = oo. Never swallow the final vowel, and give the last syllable of a line a small lift.",
  "- Read a bank word exactly as the bank writes it — accents, apostrophes, hyphens and spaces included — and let the guide below decide every sound the bank does not.",
  "",
  TRUTH_RULES,
].join("\n");

/** One saved line as the agent reads it: flattened, and never longer than a line may be. */
function line(value: any): string {
  return keyText(value).replace(/\s+/g, " ").trim().slice(0, MAX_LINE);
}

/** The admin's saved answers as the agent reads them, newest first, within the room given. */
export function keyBlock(rows: any[]): string {
  let body = "";
  for (const row of rows || []) {
    const question = line(row?.question);
    const answer = line(row?.answer);
    if (!question || !answer) continue;
    const entry = `Q: ${question}\nA: ${answer}\n`;
    if (body.length + entry.length > KEY_BUDGET) break;
    body += entry;
  }
  return body
    ? "\n# THE ADMIN'S ANSWER KEY — ONE OF THESE IS WHAT IS SPOKEN, WORD FOR WORD, WHEN IT MATCHES\n" +
        body
    : "";
}

/**
 * The answers the admin saved as notes, as the agent reads them: the heading, then what the note
 * says. One of these is spoken, as it stands, when it is what answers the person.
 */
export function notesBlock(rows: any[]): string {
  let body = "";
  for (const row of rows || []) {
    const title = line(row?.title);
    const text = keyText(row?.text).replace(/\s+/g, " ").trim().slice(0, MAX_NOTE);
    if (!title && !text) continue;
    const entry = `- ${title ? `${title}: ` : ""}${text}\n`;
    if (body.length + entry.length > NOTES_BUDGET) break;
    body += entry;
  }
  return body
    ? "\n# THE ADMIN'S SAVED ANSWERS — ONE OF THESE IS THE ANSWER SPOKEN WHEN IT ANSWERS THE PERSON\n" +
        body
    : "";
}

/** Every confirmed Kibembe word the admin saved, as the agent reads them. */
export function wordsBlock(rows: any[]): string {
  let body = "";
  for (const row of rows || []) {
    const term = line(row?.term);
    if (!term) continue;
    const meaning = line(row?.meaning);
    const entry = meaning ? `- ${term} = ${meaning}\n` : `- ${term}\n`;
    if (body.length + entry.length > WORDS_BUDGET) break;
    body += entry;
  }
  return body ? "\n# MANENO YA EBEMBE — the confirmed words, and nothing outside them\n" + body : "";
}

/**
 * The admin's whole knowledge document, as the agent reads it: every word, every phrase, every rule
 * of the language and everything else they wrote, exactly as they last approved it. It is handed
 * over whole, so a voice answering on its own account — where a call can only speak to it through
 * the agent itself — answers from all of what the admin approved and never from a part of it.
 */
export function docBlock(doc: any): string {
  const body = String(doc || "").trim();
  return body ? "\n" + body + "\n" : "";
}

/**
 * The app's own block for one agent: its own orders, Gloire's guide, the admin's saved answers and
 * the confirmed words. The key line says what the store looked like when the block was built, so the
 * next call can tell at a glance whether the block on the agent is still the current one.
 */
export function appRulesBlock(
  saved: {
    keys?: any[];
    notes?: any[];
    words?: any[];
    doc?: string;
    /** the confirmed words as the bank itself holds them, with their readings and known ways */
    bank?: any[];
    /** the ways the person's own approved recordings were written down, per word */
    evidence?: Map<string, string[]>;
  },
  stamp = "",
  room = AGENT_ROOM
): string {
  const built = [
    RULES_MARK,
    `# key: ${RULES_VERSION}|${stamp}`,
    HEAD,
    KIBEMBE_GUIDE,
    keyBlock(saved.keys || []),
    notesBlock(saved.notes || []),
    wordsBlock(saved.words || []),
    // how the confirmed words are really said: the corrections Gloire himself gave first, then the
    // ways his own approved recordings were written down — the word itself always as the bank writes it
    pronunciationBlock(saved.bank || [], "", BUDGET, saved.evidence || new Map()),
    docBlock(saved.doc || ""),
  ]
    .filter(Boolean)
    .join("\n");

  if (built.length <= room) return built;

  // the document is what gave way, and the block says so plainly rather than passing a part of it
  // off as the whole of it: what stands above is every rule, the guide, the saved answers and the
  // confirmed words, whole, and as much of the document as the voice has room for
  const cut = built.lastIndexOf("\n", room);
  const kept = built.slice(0, cut > room / 2 ? cut : room);
  return (
    kept +
    "\n\nThe admin's document is longer than one agent can carry, and what is not written above is not " +
    "shown here. Answer from what is written above — its rules, its saved answers and its confirmed " +
    "words stand whole — and never say something was not found when it stands here.\n"
  );
}

/** The key the app's own block was last written with, or nothing when there is no block yet. */
export function blockKey(current: any): string {
  const had = String(current || "");
  const at = had.indexOf(RULES_MARK);
  if (at < 0) return "";
  const found = had.slice(at).match(/^# key: (.+)$/m);
  return found ? found[1].trim() : "";
}

/**
 * The agent's instructions as the admin wrote them: everything outside the app's own marks. The
 * admin's own text is never edited — the app only reads it out of whatever it is currently mixed in
 * with, so it can be written back whole with the current rules around it.
 */
function ownText(current: any): string {
  let text = String(current || "");
  const top = text.indexOf(TOP_MARK);
  if (top >= 0) {
    const end = text.indexOf(TOP_END, top);
    text =
      end >= 0 ? text.slice(0, top) + text.slice(end + TOP_END.length) : text.slice(0, top);
  }
  const bottom = text.indexOf(RULES_MARK);
  if (bottom >= 0) text = text.slice(0, bottom);
  return text.trim();
}

/**
 * The agent's instructions with the app's own notice at its top and its own block at its end, both
 * replaced by the current ones. The admin's own instructions are never touched: they are read out
 * and written back exactly as they were, with the app's rules around them.
 */
export function withAppRules(current: any, block: string): string {
  return [TOP_NOTICE, ownText(current), block].filter(Boolean).join("\n\n");
}