import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { MAX_MEANING, MAX_TERM, MAX_USAGE, clean } from "../../shared/knowledgeWords.ts";
import { bankRows, knowledgeStamp, wordListBlock } from "../../shared/wordBank.ts";
import {
  FIX_SCHEMA,
  firstRules,
  fixPrompt,
  isConfirmedTerm,
  looksLikeFix,
  readTurn,
  sameTerm,
  turnNote,
} from "../../shared/kibembeFirst.ts";

// One spoken turn is a sentence or two: anything much longer is not a turn of this call.
const MAX_SAID = 400;
const MAX_AGENT = 400;
const PATTERNS = 300;
// how much of the confirmed word bank rides into a call as it opens: the whole bank where it fits,
// and the words the call can carry where it does not
const WORDS_BUDGET = 6000;

const READ_FAILED = "That turn could not be read just now.";

/**
 * What the home call hears.
 *
 * The voices on a home call hear the person themselves and answer on their own accounts, so this is
 * the app's own reading of the call: asked with nothing, it hands back the rules the call follows —
 * Kibembe first, answered in Kibembe, the Word Bank as the only source of its words — which the call
 * carries from the moment it opens. Asked with one heard turn, it reads that turn against the
 * admin's confirmed Kibembe in the app's fixed order — the word or phrase as the bank writes it,
 * then the confirmed word the sound is closest to, then the saved phrase whose answer belongs to it
 * — and hands back the reading as the voice answering it is told.
 *
 * A turn that puts a word, a sound or an answer right is read once more, and what the person
 * confirmed is saved into the app's own Word Bank: the word as they say it, the form the ears got
 * wrong, and the answer to give. Nothing is ever guessed into the bank. The saved words are what
 * the hearing service of every later call is pointed at as well, so the Kibembe the person confirms
 * is understood the first time it is said next.
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

/** The word's own line of use, with the form the ears got wrong at its head — never written twice. */
function withHeardForm(usage: any, misheard: string): string {
  const base = clean(usage, MAX_USAGE);
  if (!misheard) return base;
  if (base.toLowerCase().includes(misheard.toLowerCase())) return base;
  // the form the ears got wrong leads the line, so it survives the cut the field is held to
  return clean(`Also heard as ${misheard}. ${base}`, MAX_USAGE);
}

/**
 * What the person put right, saved into the app's own Word Bank.
 *
 * Only a turn that really carries a correction is read at all, and only what the person confirmed
 * is written: the word as they say it, its meaning when they gave one, the form the ears wrote
 * wrongly, and the answer to give when they gave that. A word already saved is joined to rather
 * than copied, and a correction nobody really made is written down nowhere.
 */
async function remember(
  base44: any,
  words: any[],
  patterns: any[],
  said: string,
  lastAgent: string
): Promise<string> {
  let fix: any = null;
  try {
    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: fixPrompt(said, lastAgent),
      response_json_schema: FIX_SCHEMA,
    });
    fix = res && typeof res === "object" ? res : null;
  } catch (error: any) {
    console.error("The correction could not be read:", error?.message);
    return "";
  }

  const term = clean(fix?.term, MAX_TERM);
  if (!fix?.confirmed || !isConfirmedTerm(term)) return "";

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

  const known = (words || []).find((row: any) => sameTerm(row?.term, term));
  const fields = {
    kind: "word",
    term,
    meaning: meaning || clean(known?.meaning, MAX_MEANING),
    guide: guide || clean(known?.guide, 60),
    usage: withHeardForm(known?.usage, misheard),
  };

  if (known?.id) await base44.asServiceRole.entities.AssistantKnowledge.update(known.id, fields);
  else await base44.asServiceRole.entities.AssistantKnowledge.create(fields);

  // the answer the person confirmed rides with the phrase it belongs to, so the answer that was
  // accepted is the one given the next time the phrase is said
  if (answer) {
    const asked = (patterns || []).find((row: any) => sameTerm(row?.question, term));
    const pair = { kind: "qa", question: term, answer };
    if (asked?.id) await base44.asServiceRole.entities.AssistantKnowledge.update(asked.id, pair);
    else await base44.asServiceRole.entities.AssistantKnowledge.create(pair);
  }

  return term;
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

    // Nothing said yet: the call is opening, so the rules of the call ride with it — and the
    // confirmed words those rules are read against, so a sound that is close to one of them can be
    // taken for it inside the call itself. The bank stays whole on the server: what rides in is the
    // block one call can carry.
    if (!said) {
      const words = await bankRows(base44);
      return Response.json({
        note: `${firstRules()}${wordListBlock(words, "", WORDS_BUDGET)}`,
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
    if (looksLikeFix(said)) {
      saved = await remember(base44, words, patterns, said, clean(payload?.lastAgent, MAX_AGENT));
    }

    return Response.json({ note, matched: reading, saved });
  } catch (error: any) {
    console.error("The turn could not be read for the home call:", error?.message);
    return Response.json({ error: READ_FAILED }, { status: 500 });
  }
}