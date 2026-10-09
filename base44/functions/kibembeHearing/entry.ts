import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { MAX_MEANING, MAX_TERM, MAX_USAGE, clean } from "../../shared/knowledgeWords.ts";
import { bankRows, knowledgeStamp, wordListBlock } from "../../shared/wordBank.ts";
import { docWholeBlock } from "../../shared/knowledgeDoc.ts";
import {
  FIX_SCHEMA,
  SAYS_SCHEMA,
  firstRules,
  fixPrompt,
  isConfirmedTerm,
  looksLikeFix,
  readTurn,
  sameTerm,
  savedEntry,
  saysPrompt,
  turnNote,
} from "../../shared/kibembeFirst.ts";
import { heardForms } from "../../shared/soundsAlike.ts";

// One spoken turn is a sentence or two: anything much longer is not a turn of this call.
const MAX_SAID = 400;
const MAX_AGENT = 400;
const PATTERNS = 300;
// how much of the confirmed word bank rides into a call as it opens: the whole bank where it fits,
// and the words the call can carry where it does not
const WORDS_BUDGET = 6000;
// and how much of the admin's document rides with them: the document runs to hundreds of thousands
// of characters, and a voice given more than it can hold reads none of the rules that stand past its
// room — so the call is handed the document's rules whole and the parts that matter, and no more
const DOC_BUDGET = 8000;

const READ_FAILED = "That turn could not be read just now.";

/**
 * What the home call hears.
 *
 * The voices on a home call hear the person themselves and answer on their own accounts, so this is
 * the app's own reading of the call: asked with nothing, it hands back the rules the call follows —
 * Kibembe first, answered in Kibembe, the Word Bank as the only source of its words — which the call
 * carries from the moment it opens. Asked with one heard turn, it reads that turn against the
 * admin's confirmed Kibembe — the word or phrase exactly as the bank writes it, or the saved phrase
 * whose answer belongs to it — and hands back the reading as the voice answering it is told. What
 * the person said is never rewritten: a word the bank does not hold is left exactly as it was heard.
 *
 * A turn that puts a word, a sound or an answer right is read once more, and what the person
 * confirmed is saved into the app's own Word Bank: the word as they say it, the form the ears got
 * wrong, and the answer to give. Nothing is ever guessed into the bank. The saved words are what
 * the hearing service of every later call is pointed at as well, so the Kibembe the person confirms
 * is understood the first time it is said next.
 *
 * A turn the person puts right on the screen — their own words in place of what the ears wrote — is
 * read the same way, but it is not saved by being read: the app answers with what it would keep, and
 * it is the person's own answer to that offer which writes it into the bank. A word that is only
 * another way of saying one already saved keeps that word's own confirmed spelling and joins the
 * variation to it, so a pronunciation never becomes a second word.
 */

// The admin's saved questions and the answers to give for them, held while the store is unchanged —
// the same way the words themselves are held, so every turn of a call is not a read of the bank.
const HELD_MS = 60000;
let held: { at: number; stamp: string; rows: any[]; ready: boolean } = {
  at: 0,
  stamp: "",
  rows: [],
  ready: false,
};

/** The saved question-and-answer pairs, read once and held while the store is unchanged. */
async function patternRows(base44: any): Promise<any[]> {
  const stamp = await knowledgeStamp(base44);
  if (held.ready && stamp && held.stamp === stamp && Date.now() - held.at < HELD_MS) {
    return held.rows;
  }
  try {
    const page = await base44.asServiceRole.entities.AssistantKnowledge.filter(
      { kind: "qa" },
      { limit: PATTERNS, fields: ["question", "answer"] }
    );
    held = { at: Date.now(), stamp, rows: page?.items || [], ready: true };
    return held.rows;
  } catch (error: any) {
    console.error("The saved answers could not be read for the call:", error?.message);
    return held.rows;
  }
}

// How many ways one word may keep being said differently: enough for the accents and the near
// spellings a word is said in, and never so many that the entry stops being one word.
const MAX_HEARD = 8;

/** The ways one word is already known to be said, besides its own confirmed spelling. */
function keptForms(row: any): string[] {
  return heardForms(row)
    .map((form: string) => clean(form, MAX_TERM))
    .filter(Boolean);
}

/**
 * The ways one word is known to be said, with what has just been confirmed joined to them. Each form
 * has to be something a person really says — a word, or a run of three words at most — and the word's
 * own confirmed spelling is never written into the list: every variation belongs to that spelling.
 */
function withForms(row: any, ...forms: string[]): string[] {
  const out = keptForms(row);
  forms.forEach((form) => {
    const said = clean(form, MAX_TERM);
    if (!said || said.split(/\s+/).length > 3) return;
    if (said.replace(/[^\p{L}]/gu, "").length < 3) return;
    if (sameTerm(row?.term, said)) return;
    if (out.some((kept) => sameTerm(kept, said))) return;
    if (out.length >= MAX_HEARD) return;
    out.push(said);
  });
  return out;
}

/** The saved word or phrase a confirmed form belongs to, or nothing when the app holds no such word. */
function place(words: any[], term: string, canonical: string) {
  const named = canonical && isConfirmedTerm(canonical) ? savedEntry(words, canonical) : null;
  return named || savedEntry(words, term);
}

/** One correction, as the app's own reading of it. Nothing is written down by this. */
async function readCorrection(base44: any, prompt: string, schema: any): Promise<any> {
  try {
    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema,
    });
    return res && typeof res === "object" ? res : null;
  } catch (error: any) {
    console.error("The correction could not be read:", error?.message);
    return null;
  }
}

/**
 * A correction written into the app's own Word Bank.
 *
 * A word the app already holds keeps its own confirmed spelling: the person's way of saying it, and
 * the form the ears wrote wrongly, are kept with that word as ways of saying it — so a pronunciation
 * is never made into a second word. A word the app does not hold is saved as the person gave it. Only
 * what the person gave is written: the word as they say it, its meaning when they gave one, the form
 * the ears got wrong, and the answer to give when they gave that. Nothing is ever guessed into the
 * bank.
 */
async function saveFix(base44: any, words: any[], patterns: any[], fix: any): Promise<string> {
  const term = clean(fix?.term, MAX_TERM);
  if (!isConfirmedTerm(term)) return "";

  const known = place(words, term, clean(fix?.canonical, MAX_TERM));
  const meaning = clean(fix?.meaning, MAX_MEANING);
  const guide = clean(fix?.guide, 60);
  const written = clean(fix?.misheard, MAX_TERM);
  // the wrong form is the ears' own short text for this word and nothing else: a sentence nobody
  // said as a word is never written down as one
  const misheard =
    written && written.split(/\s+/).length <= 3 && written.replace(/[^\p{L}]/gu, "").length >= 3
      ? written
      : "";
  const answer = clean(fix?.answer, 200);

  const held = clean(known?.term, MAX_TERM);
  const fields = {
    kind: "word",
    term: held || term,
    meaning: meaning || clean(known?.meaning, MAX_MEANING),
    guide: guide || clean(known?.guide, 60),
    usage: clean(known?.usage, MAX_USAGE),
    // the person's own way of saying the word, and the form the ears wrote wrongly: both are this one
    // word coming out, so both are kept under it
    heard: withForms(known, held ? term : "", misheard),
  };

  if (known?.id) await base44.asServiceRole.entities.AssistantKnowledge.update(known.id, fields);
  else await base44.asServiceRole.entities.AssistantKnowledge.create(fields);

  // the answer the person confirmed rides with the phrase it belongs to, so the answer that was
  // accepted is the one given the next time the phrase is said
  if (answer) {
    const said = held || term;
    const asked = (patterns || []).find((row: any) => sameTerm(row?.question, said));
    const pair = { kind: "qa", question: said, answer };
    if (asked?.id) await base44.asServiceRole.entities.AssistantKnowledge.update(asked.id, pair);
    else await base44.asServiceRole.entities.AssistantKnowledge.create(pair);
  }

  return fields.term;
}

/**
 * A spoken turn that puts a word, a sound or an answer right: read once, and written down only when
 * the person's own words really carry the correction.
 */
async function remember(
  base44: any,
  words: any[],
  patterns: any[],
  said: string,
  lastAgent: string
): Promise<string> {
  const fix = await readCorrection(base44, fixPrompt(said, lastAgent), FIX_SCHEMA);
  if (!fix?.confirmed) return "";
  return saveFix(base44, words, patterns, fix);
}

/**
 * What the app would keep from the person's own words, put in place of the ears' writing of a turn.
 * Nothing is saved here: this is the offer the person is shown, and their own answer is what saves it.
 */
async function propose(
  base44: any,
  words: any[],
  said: string,
  written: string
): Promise<any | null> {
  const fix = await readCorrection(base44, saysPrompt(written, said), SAYS_SCHEMA);
  const term = clean(fix?.term, MAX_TERM);
  if (!isConfirmedTerm(term)) return null;
  const known = place(words, term, clean(fix?.canonical, MAX_TERM));
  return { term, canonical: clean(known?.term, MAX_TERM) };
}

/** The person has said the offer should be kept: their own words go into the Word Bank now. */
async function keep(
  base44: any,
  words: any[],
  patterns: any[],
  said: string,
  written: string
): Promise<string> {
  const fix = (await readCorrection(base44, saysPrompt(written, said), SAYS_SCHEMA)) || {};
  // the form the ears wrote for this turn is a way the same word came out, so it is kept with it
  if (!clean(fix.misheard, MAX_TERM)) fix.misheard = written;
  return saveFix(base44, words, patterns, fix);
}

export default async function (req: Request): Promise<Response> {
  try {
    // the reading behind a call is only made for a signed-in person
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    let payload: any = {};
    try {
      payload = await req.json();
    } catch (err) {
      payload = {};
    }

    const said = clean(payload?.text, MAX_SAID);
    const lastAgent = clean(payload?.lastAgent, MAX_AGENT);
    // The app's own ears wrote this turn wrongly and the person has put their own words in its place
    // on the screen. Their words are read, and they are saved only once the person has answered the
    // app's own offer to keep them: a pronunciation is learned from a confirmation, never a guess.
    const put = clean(payload?.heard, MAX_SAID);
    const confirming = payload?.confirmed === true;
    const proposing = payload?.propose === true;

    // Nothing said yet: the call is opening, so the rules of the call ride with it — and the
    // confirmed words those rules are read against, so a sound that is close to one of them can be
    // taken for it inside the call itself. The bank stays whole on the server: what rides in is the
    // block one call can carry.
    if (!said) {
      const words = await bankRows(base44);
      // The admin's one knowledge document rides into the call too — its rules whole, the parts that
      // matter and a slice of every other part — so a voice answering on its own account answers
      // from what the admin approved, inside the room a voice can hold. The call is handed it once,
      // as it opens.
      const doc = await docWholeBlock(base44, DOC_BUDGET);
      return Response.json({
        note: `${firstRules()}${wordListBlock(words, "", WORDS_BUDGET)}${doc}`,
        matched: null,
        saved: "",
      });
    }

    // The reading is made from the app's own knowledge, which is admin-held: the whole bank is read
    // here because only the app can, and only the reading of this person's own turn goes back.
    const [words, patterns] = await Promise.all([bankRows(base44), patternRows(base44)]);

    const reading = readTurn(said, words, patterns);
    const note = reading ? turnNote(said, reading) : "";

    let saved = "";
    let proposal: any = null;
    if (put) {
      if (confirming) saved = await keep(base44, words, patterns, said, put);
      else if (proposing) proposal = await propose(base44, words, said, put);
    } else if (!confirming && looksLikeFix(said)) {
      saved = await remember(base44, words, patterns, said, lastAgent);
    }

    return Response.json({ note, matched: reading, saved, proposal });
  } catch (error: any) {
    console.error("The turn could not be read for the home call:", error?.message);
    return Response.json({ error: READ_FAILED }, { status: 500 });
  }
}