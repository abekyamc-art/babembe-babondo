import { MAX_TERM, MAX_USAGE, PREFIXES, clean, glossOf } from "./knowledgeWords.ts";
import { engineFor, engineNote } from "./phraseEngine.ts";
import { heardForms, strongTerms, tight } from "./soundsAlike.ts";
import { keyMatches } from "./answerKey.ts";
import { KIBEMBE_GUIDE } from "./kibembeGuide.ts";

/**
 * How a home call hears and answers Kibembe.
 *
 * The voices on a home call hear the person themselves and answer out loud on their own accounts,
 * so the rules of the call are handed to them here, in the app's own words, as the call opens.
 *
 * The rules are also what the app's own reading works by: a turn is matched against the confirmed
 * Kibembe of the admin's own Word Bank — the word or phrase exactly as the bank writes it, or the
 * saved phrase whose answer belongs to it — so a voice far from the phone, a quiet voice and a fast
 * voice are all heard as Kibembe, and a word the bank holds is understood the moment it is said.
 *
 * A turn is never rewritten. What the person said is kept in their own words, and a word the bank
 * does not hold is never swapped for another one that merely sounds like it.
 */

/**
 * The rules of the call as they ride into it, whole: Gloire's own current guide, which carries the
 * reading, the times and tenses, the matching, the teaching, the reactions and the app's own
 * language rules with it.
 */
export function firstRules(): string {
  return KIBEMBE_GUIDE;
}

/** One turn's own words, as they are compared with the saved ones. */
function saidWords(value: any): string[] {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((word) => word.length > 1);
}

/** Whether one heard word is a saved word, alone or wearing a prefix the list allows it. */
function sameWord(heard: string, want: string): boolean {
  if (heard === want) return true;
  return PREFIXES.some((prefix) => prefix.length > 1 && heard === prefix + want);
}

/**
 * Whether one saved term is exactly what was heard: the word itself for a single word, and its
 * words said in a row — or all of them, with the person's own words between them — for a phrase.
 * Nothing when it is not the same word or phrase.
 */
function saidTerm(term: string, said: string[]): string {
  const want = saidWords(term);
  if (!want.length || !said.length) return "";
  if (want.length === 1) return said.some((word) => sameWord(word, want[0])) ? "exact" : "";

  for (let at = 0; at + want.length <= said.length; at += 1) {
    let row = true;
    for (let step = 0; step < want.length; step += 1) {
      if (!sameWord(said[at + step], want[step])) {
        row = false;
        break;
      }
    }
    if (row) return "exact";
  }

  return want.every((word) => said.some((heard) => sameWord(heard, word))) ? "phrase" : "";
}

/** What one turn is, from the app's own knowledge. Nothing when nothing is close enough. */
export function readTurn(
  heard: string,
  words: any[],
  patterns: any[] = [],
  /** the admin's own engine of asks and replies, as the app's document holds it */
  engine: any[] = []
): any {
  const said = saidWords(heard);
  if (!said.length) return null;

  // 0) The admin's own engine of asks and replies. An ask saved there is answered from the replies the
  // engine writes for it and from nowhere else, so the reply the person is given is the engine's own
  // form, whole, rather than a sentence written for the turn. A repeat ask never reaches here: that
  // line is given back as it stood before any reading is made of it at all.
  const engineAsk = engine.length ? engineFor(engine, heard) : null;
  if (engineAsk) {
    return { kind: "engine", ask: engineAsk, term: engineAsk.ask, meaning: engineAsk.meaning, how: "engine" };
  }

  // 1) a Kibembe word or phrase exactly as the app's own Word Bank writes it. The longest phrase
  // wins, so "ole bile" is taken as the whole phrase and not as the single word inside it.
  let exact: any = null;
  for (const row of words || []) {
    const term = clean(row?.term, MAX_TERM);
    if (!term) continue;
    // the word as the bank writes it, and every way it is known to come out: a confirmed variation
    // is this same word being said, never a word of its own
    let how = "";
    let span = 0;
    for (const spelling of [term, ...heardForms(row)]) {
      const found = saidTerm(spelling, said);
      if (!found) continue;
      span = Math.max(span, saidWords(spelling).length);
      if (found === "exact") {
        how = "exact";
        break;
      }
      how = "phrase";
    }
    if (!how) continue;
    span = Math.max(span, saidWords(term).length);
    const better =
      !exact || (how === "exact" && exact.how !== "exact") || (how === exact.how && span > exact.span);
    if (better) {
      exact = {
        term,
        // a saved line whose translation turned into a run of forms still carries its real gloss
        // first, so the reading carries that gloss and never the forms
        meaning: glossOf(term, row?.meaning),
        usage: clean(row?.usage, MAX_USAGE),
        how,
        span,
      };
    }
  }
  if (exact) return { kind: "word", heard: "", ...exact };

  // 2) the closest saved Kibembe phrase or answer: the question that was asked, with its answer.
  // Nothing is ever read in place of the person's own words: a word the bank does not hold is left
  // exactly as it was heard rather than taken for the saved word it sounds nearest to.
  const asked = keyMatches(patterns || [], heard, 1);
  if (asked.length) {
    return { kind: "pattern", term: asked[0].said, answer: asked[0].answer, how: "pattern" };
  }

  // 3) A pronunciation that is a strong match to one confirmed word, and only a strong one: the same
  // word said in the person's own way — an accent, a letter, a syllable or the same consonants apart.
  // It is marked as heard that way rather than as the bank's own spelling, so the voice answers from
  // the confirmed meaning while the words themselves are left exactly as they were said. A word that
  // merely resembles a saved one is never taken: that would be answering a word nobody said, and the
  // voice answering the call is the one that weighs a wider resemblance, with the whole bank in hand.
  const near = strongTerms(heard, words || [])[0];
  if (near) {
    return {
      kind: "near",
      term: near.term,
      heard: near.said,
      meaning: glossOf(near.term, (words || []).find((row: any) => sameTerm(row?.term, near.term))?.meaning),
      usage: clean(
        (words || []).find((row: any) => sameTerm(row?.term, near.term))?.usage,
        MAX_USAGE
      ),
      how: "near",
    };
  }

  return null;
}

/**
 * The reading of one turn as the voice answering it is told: what was said, and the saved Kibembe
 * word or phrase it is, so a word the bank holds is answered from its own meaning. A turn the bank
 * does not hold has no reading at all: what the person said is left exactly as they said it.
 */
export function turnNote(heard: string, reading: any): string {
  if (!reading) return "";
  const said = clean(heard, 240);

  // The admin's own engine of asks and replies: one of the replies saved for that ask is the reply,
  // and it is given exactly as the engine writes it — never re-worded and never replaced.
  if (reading.kind === "engine" && reading.ask) return engineNote(said, reading.ask);

  if (reading.kind === "pattern") {
    return (
      "HOW TO HEAR THIS TURN\n" +
      `One turn was just said: "${said}"\n` +
      `It is the saved Kibembe phrase "${reading.term}", and the answer saved for it is: "${reading.answer}"\n` +
      "Give that answer, in Kibembe, in your own voice — in fresh words, never the same sentence you have already used in this call.\n"
    );
  }

  // A turn that strongly matches a confirmed word is that word being said another way: the voice
  // answers from the confirmed meaning, and never tells the person their speaking was wrong.
  if (reading.kind === "near") {
    const sound = reading.meaning ? ` It means: ${reading.meaning}.` : "";
    const howUsed = reading.usage ? ` How it is used: ${reading.usage}.` : "";
    return (
      "HOW TO HEAR THIS TURN\n" +
      `One turn was just said: "${said}"\n` +
      `By its sound and by what is being talked about, this is the app's confirmed Kibembe word or phrase "${reading.term}", said in the person's own way — not a different word.${sound}${howUsed}\n` +
      "Answer it naturally in Kibembe, from that meaning, in your own fresh words: never correct how they said it, never say it was not understood, and never ask whether they meant another word. Where the answer turns on exactly what they meant, ask one short Kibembe question first and answer as soon as they have said it.\n"
    );
  }

  const meaning = reading.meaning ? ` It means: ${reading.meaning}.` : "";
  const usage = reading.usage ? ` How it is used: ${reading.usage}.` : "";

  return (
    "HOW TO HEAR THIS TURN\n" +
    `One turn was just said: "${said}"\n` +
    `The app's own Kibembe Word Bank already holds this word or phrase as "${reading.term}", written exactly as the bank writes it.${meaning}${usage}\n` +
    "Keep the person's own words as they said them and answer in Kibembe, naturally, from the meaning above — in your own fresh words, never the same answer twice in one call, apart from the one line they have asked to hear again, which is given back exactly as it stood. Where the turn is not clear, answer from the part that is clear and ask one short Kibembe question about the one thing you are not sure of.\n"
  );
}

// A turn carrying one of these is the person putting something right — a word, a sound or an
// answer. Nothing else is read for a correction, so an ordinary turn never leans on the model.
const FIX_WORDS =
  /\b(siyo|sivyo|sio|hapana|kosa|badala|ninamaanisha|namaanisha|no|not|wrong|instead|correction|actually)\b/i;

/** Whether one heard turn sounds like the person putting something right. */
export function looksLikeFix(heard: string): boolean {
  const said = String(heard ?? "").trim();
  if (!said || said.length > 240) return false;
  return FIX_WORDS.test(said);
}

/** The reading a possible correction is asked for: only what the person confirmed is ever saved. */
export function fixPrompt(heard: string, lastAgent: string): string {
  return [
    "You keep the record of a Kibembe (Ebembe) voice call for the app's own Word Bank.",
    "The person has just spoken a turn that sounds like a correction of a word, of a pronunciation, of a sound, or of an answer.",
    "",
    `The assistant's own last line was: "${clean(lastAgent, 400) || "(nothing was said before this turn)"}"`,
    `The person's turn was: "${clean(heard, 400)}"`,
    "",
    "Decide whether the person really put something right, and write down only what they confirmed.",
    "- A person who only says a word again, or asks a question, is not correcting anything: answer confirmed=false.",
    "- Never invent a word, a meaning, a sound or a reading they did not give, and never guess at a spelling: a field nobody gave stays empty.",
    "- Write the Kibembe word or phrase exactly as the person said it, and its meaning only when they gave one.",
    "- The form the ears wrote wrongly is the short wrong text the ears wrote for this same word on this turn — one, two or three words at most, never a sentence the assistant said and never a different meaning. Leave it empty when no such wrong form was given.",
    "- The answer to give is only the answer the person said should be given.",
    "- A correction that is only another way of saying a word or phrase this app already holds is NOT a new word: write that saved form exactly as the app writes it in canonical, and the way the person said it in term.",
    "- Leave canonical empty only when the person's word is really one the app does not hold. Never make a second word out of an accent, a letter, a syllable or a sound of one the app already has.",
  ].join("\n");
}

/** What a confirmed correction is written down as, so nothing but a real one is ever saved. */
export const FIX_SCHEMA = {
  type: "object",
  properties: {
    confirmed: {
      type: "boolean",
      description: "true only when the person really put a word, a sound or an answer right",
    },
    term: {
      type: "string",
      description: "the confirmed Kibembe word or phrase, written as the person said it",
    },
    meaning: { type: "string", description: "its meaning, only when the person gave one" },
    guide: {
      type: "string",
      description: "how it is said, syllables joined by dashes, only when the person gave that",
    },
    misheard: {
      type: "string",
      description: "the wrong form the ears wrote or the assistant said, when there is one",
    },
    answer: {
      type: "string",
      description: "the answer to give when this word or phrase is said, only when the person gave one",
    },
    canonical: {
      type: "string",
      description:
        "the saved Kibembe word or phrase this correction is another way of saying, written exactly as the app holds it; empty when it is a word the app does not hold",
    },
  },
  required: ["confirmed", "term"],
};

/**
 * What the person's own words are, when they have put the app's own writing of one of their turns
 * right on the screen. Nothing is saved from this: it is what the person is shown before they say
 * whether it should be kept, and only their answer saves it.
 */
export const SAYS_SCHEMA = {
  type: "object",
  properties: {
    term: {
      type: "string",
      description: "the word or phrase the person says they really said, written as they wrote it",
    },
    canonical: {
      type: "string",
      description:
        "the saved Kibembe word or phrase this is another way of saying, written exactly as the app holds it; empty when the app does not hold it",
    },
    meaning: { type: "string", description: "its meaning, only when the person gave one" },
    guide: {
      type: "string",
      description: "how it is said, syllables joined by dashes, only when they gave that",
    },
    answer: {
      type: "string",
      description: "the answer to give when it is said, only when they gave one",
    },
  },
  required: ["term"],
};

/** The reading a turn the person has put right is asked for: what their words are, and where they belong. */
export function saysPrompt(heard: string, said: string): string {
  return [
    "You keep the record of a Kibembe (Ebembe) voice call for the app's own Word Bank.",
    "The app's own ears wrote one of the person's turns down wrongly, and the person has put their own words in its place on the screen.",
    "",
    `What the ears wrote for that turn: "${clean(heard, 400) || "(nothing was written for this turn)"}"`,
    `What the person says they really said: "${clean(said, 400)}"`,
    "",
    "Write down the person's own words, and only what they gave.",
    "- The word or phrase goes in term, written exactly as the person wrote it.",
    "- When that word or phrase is only another way of saying one this app already holds — an accent, a letter, a syllable or a sound apart — write the saved form exactly as the app holds it in canonical. A pronunciation of a saved word is never made into a second word.",
    "- Leave canonical empty when the app does not hold this word at all.",
    "- Never invent a meaning, a reading, a spelling or an answer: a field nobody gave stays empty.",
  ].join("\n");
}

/** A confirmed spelling has to be a word or a short phrase, and nothing else. */
export function isConfirmedTerm(term: string): boolean {
  if (!term || term.length > MAX_TERM) return false;
  if (!/^[\p{L}][\p{L}'’\- ]*$/u.test(term)) return false;
  return term.replace(/[^\p{L}]/gu, "").length >= 3;
}

/** The same spelling, however it was written, so a word already saved is never saved twice. */
export function sameTerm(a: any, b: any): boolean {
  const left = tight(a);
  return !!left && left === tight(b);
}

/**
 * The saved word or phrase a confirmed form belongs to: the entry that holds that spelling, the entry
 * that keeps it among the ways it is said, or the one confirmed word it is a strong way of saying —
 * never a word that merely shares some of its sounds. Nothing when the app holds no such word: only
 * then is a form saved as a word of its own.
 */
export function savedEntry(rows: any[], term: string): any {
  const said = clean(term, MAX_TERM);
  if (!said) return null;

  const held = (rows || []).find(
    (row: any) =>
      sameTerm(row?.term, said) || heardForms(row).some((form: string) => sameTerm(form, said))
  );
  if (held) return held;

  const near = strongTerms(said, rows || [])[0];
  if (!near) return null;
  return (rows || []).find((row: any) => sameTerm(row?.term, near.term)) || null;
}