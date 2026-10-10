import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { MAX_MEANING, MAX_TERM, MAX_USAGE, clean } from "../../shared/knowledgeWords.ts";
import { bankRows, knowledgeStamp, wordListBlock } from "../../shared/wordBank.ts";
import { docPhraseRows, docWholeBlock, publishedDoc } from "../../shared/knowledgeDoc.ts";
import { askAgainLine, notHeldLine } from "../../shared/notHeld.ts";
import { retrieveKnowledge } from "../../shared/knowledgeRetrieval.ts";
import { pronunciationBlock, recordedEvidence } from "../../shared/pronunciation.ts";
import { engineAsksOf, engineReply } from "../../shared/phraseEngine.ts";
import { isRepeatAsk, repeatNote } from "../../shared/repeatAsk.ts";
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
import { withHeard, withRevision } from "../../shared/voiceBank.ts";
import { langAsked, langLine, langName, langOf } from "../../shared/langMode.ts";
import { LANGUAGE_FALLBACK, strongFlag } from "../../shared/languageGate.ts";

// A turn of speech carries at least a word: two letters is the least a word of this app's languages
// is written with.
const FEWEST_LETTERS = 2;

/**
 * Whether what the ears wrote is a turn of speech at all, rather than a breath of the room written
 * down as words. The fragments and stray marks a capture returns when nobody spoke are not the
 * person's turn, and nothing is answered from them.
 */
function isRealTurn(text: string): boolean {
  const line = String(text || "").trim();
  if (!line) return false;
  return line.replace(/[^\p{L}\p{N}]/gu, "").length >= FEWEST_LETTERS;
}

// One spoken turn is a sentence or two: anything much longer is not a turn of this call.
const MAX_SAID = 400;
const MAX_AGENT = 400;
const PATTERNS = 300;
// the longest a reply the app holds itself may be: one line of talk, and no more
const MAX_SAY = 400;
// how much of the confirmed word bank rides into a call as it opens: the whole bank where it fits,
// and the words the call can carry where it does not
const WORDS_BUDGET = 6000;
// and how much of the admin's document rides with them: the document runs to hundreds of thousands
// of characters, and a voice given more than it can hold reads none of the rules that stand past its
// room — so the call is handed the document's rules whole and the parts that matter, and no more
const DOC_BUDGET = 8000;
// how much of the readings of the confirmed words the call carries: the words the person has given a
// reading to, and the ways their own approved recordings were written down
const PRONUNCIATION_BUDGET = 2600;
// and how much of the search over the whole document rides with one turn: the parts that turn reaches
const KNOWLEDGE_ROOM = 6000;
// how many of the document's own phrases are read with its words: the greetings and the everyday lines
// of a conversation, so a confirmed phrase said whole is understood as the phrase it is
const MAX_PHRASES = 600;

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
 * A turn the app's own knowledge holds nothing of is handed over as exactly that: the reading says so
 * plainly, and no answer is written for it at all. The voice answering such a turn is not asked to
 * answer it on its own account, because that is where a reply in a language nobody here speaks comes
 * from — that turn is left unanswered rather than answered from a guess.
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

// The ways a word is said, and the past of a word, are kept in the app's own voice bank: the same
// list every reader of the knowledge is pointed at, so a way of saying a word that the person
// confirms here, or that one of their own recordings was approved as, is heard by every one of them
// and can never drift apart from the word it belongs to.

/**
 * The reply the app itself holds for one turn, when it holds one.
 *
 * Where the turn is one of the admin's own asks, one of the replies saved for that ask is chosen here,
 * by the app, and handed over whole — so the reply that comes back is the engine's own form rather than
 * a sentence written for the turn. Where the turn is a saved question with its own answer, that answer
 * is the reply. Nothing is held for a turn the app holds no reply for: an ordinary turn is answered by
 * the voice itself out of the confirmed words, which is what the rules it carries are for.
 *
 * A turn being answered in Kiswahili or English is never forced to a Kibembe line: there the reply's
 * own meaning is what the answer says in the language the person used, as the reading already tells it.
 */
function replyFor(reading: any, lastAgent: string, lang: string): string {
  if (!reading || lang !== "kibembe") return "";
  if (reading.kind === "engine" && reading.ask) return engineReply(reading.ask, lastAgent);
  if (reading.kind === "pattern") return clean(reading.answer, MAX_SAY);
  return "";
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
  const now = new Date().toISOString();
  const fields: any = {
    kind: "word",
    term: held || term,
    meaning: meaning || clean(known?.meaning, MAX_MEANING),
    guide: guide || clean(known?.guide, 60),
    usage: clean(known?.usage, MAX_USAGE),
    // the person's own way of saying the word, and the form the ears wrote wrongly: both are this one
    // word coming out, so both are kept under it — and neither is ever the word itself
    heard: withHeard(known, held ? term : "", misheard),
    // the form that stood before this correction is kept, so the newest confirmed form is the word
    // and every older one can still be traced back to
    revisions: withRevision(known, now),
    // where the word came from, so a correction the person gave in a call is told apart from a
    // recording of their own that was approved, and from a word a dictionary file brought in
    source: clean(known?.source, 120) || "confirmed in a call",
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
    // the language in force, chosen by the person and carried turn after turn: the rules of that
    // language ride to the voice with the rest of the guide, and a turn that plainly asks for another
    // language changes it from the very next word
    const mode = langOf(payload?.lang);
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
      // The call is handed three things as it opens, read together rather than one after the other:
      // the confirmed words, the admin's one knowledge document, and how those words are really said.
      const [words, doc, evidence] = await Promise.all([
        bankRows(base44),
        docWholeBlock(base44, DOC_BUDGET),
        recordedEvidence(base44),
      ]);
      return Response.json({
        // The readings of the confirmed words ride with them: the corrections the person themselves
        // confirmed lead, and the ways their own approved recordings were written down stand behind
        // them as evidence — so the voice says the Kibembe the way it is really said here.
        note: `${firstRules()}\n\n${langLine(mode)}${wordListBlock(words, "", WORDS_BUDGET)}${pronunciationBlock(
          words,
          "",
          PRONUNCIATION_BUDGET,
          evidence
        )}${doc}`,
        matched: null,
        // nothing has been said yet: there is no reading to be sure or unsure of
        sure: true,
        saved: "",
        mode,
      });
    }

    // The person has asked for their own last answer again — "Omo tenda bile?". That line is already in
    // the app's own hand: it is the line the app itself put before them, sent back with this turn. It
    // goes back whole, to be said again word for word, and no reading is made of the ask at all — so
    // nothing of it can be turned into a lesson, a translation or a new answer written for the ask.
    if (isRepeatAsk(said)) {
      return Response.json({
        note: repeatNote(said, lastAgent),
        // the line the ask is asking for is the app's own, and it goes back whole: the voice is told to
        // say that very line again and nothing else, so it is never re-worded, never shortened and
        // never turned into a lesson. Where the app holds no line at all to give back — the first turn
        // of a call — nothing is written to fill the place: the admin's own confirmed line asking for
        // the turn again is what is said.
        say: clean(lastAgent, MAX_SAY) || askAgainLine(),
        // the app holds that very line itself, so this turn is answered from its own hand and never by
        // the voice on its own account
        verified: true,
        // an ask is not a word and not a phrase: there is no reading to be sure or unsure of
        matched: null,
        sure: true,
        saved: "",
        mode,
      });
    }

    // The reading is made from the app's own knowledge, which is admin-held: the whole bank is read
    // here because only the app can, and only the reading of this person's own turn goes back. The
    // admin's own engine of asks and replies is read with them, out of the very same document: what
    // the person said may be one of its asks, and that ask's own replies are then the reply — given
    // exactly as the engine writes it, rather than a sentence written for the turn.
    //
    // A turn said in another language altogether is a red flag, and this app speaks three: nothing is
    // answered for it. What is said instead is the app's own line naming the three languages — handed
    // over as the whole answer, so the person is never left in silence and never hears the other
    // language — and the call goes straight back to listening. A whole turn is what is held to that
    // bar: a single form of another language may be a word of the three the ears wrote down in another
    // spelling, and the app never refuses a person's own words over one form alone.
    if (strongFlag(said)) {
      return Response.json({
        note: "",
        // the app's own line, whole: the seat is made to say exactly this and nothing else
        say: LANGUAGE_FALLBACK,
        verified: true,
        blocked: true,
        matched: null,
        sure: true,
        saved: "",
        mode,
      });
    }

    // All four reads are made together, never one after the other: the search over the whole approved
    // document reads the very same word list that is being read here, so that read is handed to it as
    // it is still running rather than made a second time. What rides back is the few parts of the
    // document this turn reaches, nearest first — the same search every voice of a call is handed — and
    // a turn that reaches nothing is told so plainly rather than answered from a guess.
    const wordsRead = bankRows(base44);
    const [words, patterns, engine, search, phrases] = await Promise.all([
      wordsRead,
      patternRows(base44),
      engineAsksOf(base44).catch(() => []),
      retrieveKnowledge(base44, said, KNOWLEDGE_ROOM, wordsRead)
        .then((found) => ({ block: String(found?.block || ""), found: found?.found === true }))
        .catch(() => ({ block: "", found: false })),
      // The phrases the admin's own document confirms of more than one word: the greetings and the
      // everyday lines of a conversation. The word list keeps to one word, so a greeting said whole —
      // "Oto ela", "Shi ke", "Walolalabile" — is read here as the confirmed phrase it is.
      publishedDoc(base44)
        .then((text) => docPhraseRows(text).slice(0, MAX_PHRASES))
        .catch(() => []),
    ]);

    const reading = readTurn(said, words, patterns, engine, phrases);
    const note = reading ? turnNote(said, reading) : "";
    // Whether the app really holds anything of this turn: a reading of it — the ask it is, the word or
    // phrase it is, the saved phrase whose answer belongs to it — or a part of the admin's own knowledge
    // the search truly reached. Nothing else is knowledge: a search that reached nothing is not, and
    // neither is a reading that was never made.
    const verified = !!reading || search.found;
    // the parts of the document the search reached, and nothing at all where it reached none: a plain
    // line saying nothing was found is not knowledge and is never handed over as if it were
    const known = search.found ? search.block : "";

    // Whether the app is sure of what it heard. A turn is unsure when what came back is not a turn
    // of speech at all — the fragments and stray marks the ears write for a breath of room noise —
    // and that one is shown to the person instead of being answered, since the only thing that can
    // put it right is them. A turn that reads as real speech is answered exactly as it stands: the
    // app's own knowledge not holding one of its words is no reason to hold back an ordinary
    // question, and asking for a knowledge match here is what left ordinary talk unanswered. Where
    // the knowledge does hold a word of the turn, the reading rides in with it all the same.
    const sure = isRealTurn(said);

    // The person may plainly ask for another language mid-call. That ask is honoured at once: the
    // language in force changes from this turn on, and the voice is told so before it answers, so
    // nothing has to be confirmed and no turn is answered in the language they have just left.
    const asked = langAsked(said);
    const lang = asked || mode;
    // The reply the app holds itself, when it holds one. It goes to the voice as the whole answer, so
    // the reply is said exactly as the app's own words — never started well and then carried on in a
    // language nobody here speaks. A turn putting something right is never forced to a saved line, and
    // neither is a turn being answered in Kiswahili or English.
    let say = "";
    if (put || confirming || looksLikeFix(said)) {
      // a turn putting something right is read as a correction and never answered from a held line
      say = "";
    } else {
      say = replyFor(reading, lastAgent, lang);
      // Nothing confirmed is held for this turn at all — no word, no phrase, no saved ask and no part
      // of the admin's document the search truly reached. What is said is the app's own confirmed line
      // and nothing else: never a Kibembe sentence built to cover the gap, which is where a form nobody
      // confirmed gets spoken as though it were taught. A turn that is not speech at all is left alone:
      // it is shown to the person, and the only thing that can put it right is them.
      //
      // The line stands only where the app's own knowledge was really read: a read the store refused
      // leaves no knowledge in hand, and that is never the same thing as the app holding nothing — it
      // is never answered as a "I do not know", and the turn is left to the voice as it always was.
      if (!say && !verified && sure && (words.length || phrases.length)) {
        say = notHeldLine([...words, ...phrases]);
      }
    }
    // A reply the app holds itself that carries another language is thrown away rather than said: the app
    // speaks three languages, and a saved line in a fourth is a red flag even when it is saved. What is
    // spoken instead is the app's own line naming the three, so the person is never left with nothing and
    // never hears the other language. A saved line is held to the same bar as the person's own turn: a
    // whole line in another language carries several of those forms, and one alone is never enough to
    // throw away the admin's own wording.
    let blocked = false;
    if (strongFlag(say)) {
      say = LANGUAGE_FALLBACK;
      blocked = true;
    }
    const languageLine = asked
      ? `${langLine(lang)}\nThe person has just plainly asked for ${langName(asked)}. Answer in it from this very word on, and keep answering in it until they ask for another language.\n`
      : "";

    let saved = "";
    let proposal: any = null;
    if (put) {
      if (confirming) saved = await keep(base44, words, patterns, said, put);
      else if (proposing) proposal = await propose(base44, words, said, put);
    } else if (!confirming && looksLikeFix(said)) {
      saved = await remember(base44, words, patterns, said, lastAgent);
    }

    return Response.json({
      // Nothing of the app's own rode with this turn, so nothing is handed over in its place: the
      // reading block is left empty rather than filled with words the app does not hold.
      note: verified ? `${note}${languageLine}${known}` : "",
      // The one line the app holds for this turn, or the app's own confirmed line for a turn it holds
      // nothing of — "Shi ke" (I do not know) — so what the person hears is a confirmed Kibembe line
      // rather than a sentence written to cover a gap.
      say,
      // the app's own word on whether it holds anything of this turn: it is what the answer is gated on
      verified,
      // whether this turn, or the reply held for it, was in a language this app does not speak: a blocked
      // turn is answered with the app's own line alone, and nothing is generated for it
      blocked,
      matched: reading,
      sure,
      saved,
      proposal,
      // the language now in force: the screen keeps it for the next turn, and a later call opens in it
      mode: lang,
    });
  } catch (error: any) {
    console.error("The turn could not be read for the home call:", error?.message);
    return Response.json({ error: READ_FAILED }, { status: 500 });
  }
}