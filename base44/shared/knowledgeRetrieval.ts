import { docSections, docStamp, publishedDoc, textOf } from "./knowledgeDoc.ts";
import { bankRows } from "./wordBank.ts";
import { keyTokens } from "./answerKey.ts";
import { alikeTerms, spellingsOf } from "./soundsAlike.ts";
import { MAX_MEANING, MAX_TERM, MAX_USAGE, clean } from "./knowledgeWords.ts";

/**
 * The one search the app makes over its own knowledge.
 *
 * A voice that hears and answers on its own account is handed a fixed block as its call opens, and
 * that block can hold only a part of a document as large as the admin's — the admin's one document
 * runs to hundreds of thousands of characters, and a voice can carry a few thousand of them. So the
 * search is made per turn instead: what the person has just said is searched against the whole of the
 * approved document — every word, every phrase, every rule and everything else the admin wrote — and
 * against the confirmed Word Bank, and only the few parts the turn really reaches ride back with the
 * answer.
 *
 * The document is cut into small pieces before it is searched, so a line written at its very end is
 * found exactly as a line written at its top: nothing is out of reach because it stands far down.
 *
 * Two searches stand behind it, together: the words of the turn itself, and the confirmed words it
 * reaches by sound — so a Kibembe word said in the person's own way still finds the line that holds
 * it. The Word Bank stays the only source of a Kibembe spelling and a Kibembe meaning; the document
 * is read for its content and its rules. A turn that reaches nothing is told so plainly, and nothing
 * is invented for it.
 *
 * Every path that answers a voice turn reads from here, so the same question finds the same thing
 * whichever voice is on the line — and a document the admin has just published is read as it is, at
 * the very next turn.
 */

// how much of the room one turn's knowledge may take, and how much of it the words keep for themselves
const ROOM = 6000;
const WORDS_SHARE = 1800;
// how many pieces of the document one turn is ever handed, and how long one piece may be
const MAX_PIECES = 5;
const PIECE = 900;
// how much one piece has to answer the turn before it is handed over at all: one word of the turn
// standing in the piece as a word of its own, or two of them merely mentioned in it
const MIN_SCORE = 2;
// how many confirmed words the turn is handed
const MAX_NEAR = 6;
// the longest a turn's own words are read to be
const MAX_QUESTION = 600;

const HEAD =
  "\n# MAARIFA YA MWENYEJI — the parts of the admin's own knowledge this turn reaches, searched for it just now:\n" +
  "Sehemu hizi zimefutwa kutoka kwenye hati nzima ya admin kwa ajili ya turn hii: ni maarifa ya app " +
  "hii, na jibu litoke kwenye hizi kwanza. Neno la Kibembe lisiloandikwa hapa halijathibitishwa: " +
  "usilibuni, usilikisie, wala usilitafsiri — sema kwa ufupi kwamba halipo, au uliza swali moja fupi " +
  "la kufafanua. Usiseme kamwe kwamba umetafuta wakati hukutafuta.\n";

const WORDS_HEAD =
  "\n# MANENO YA KIBEMBE YALIYOTHIBITISHWA — the confirmed words and expressions this turn reaches:\n" +
  "Neno la Kibembe linaandikwa na kusemwa jinsi lilivyoandikwa hapa, na maana yake inatoka hapa pekee. " +
  "Neno lisilo hapa halijathibitishwa: litaje kama lilivyosikika, usibuni maana yake.\n";

const NONE =
  "\n# MAARIFA YA MWENYEJI — nothing of this turn stands in the admin's own document or in the confirmed Word Bank.\n" +
  "Hakuna kilichopatikana kwa uhakika kuhusu hilo: sema kwa ufupi kwamba hujapata taarifa ya " +
  "kuthibitishwa, au uliza swali moja fupi la kufafanua. Usibuni neno la Kibembe, usilikisie, na " +
  "usijibu kwa jambo lingine lisilohusiana.\n";

type Piece = { body: string; text: string };

/**
 * The document cut into the pieces a turn is searched against: every part of it, one small piece at
 * a time, each keeping the heading it stands under. A line written at the very end of the document
 * therefore stands in a piece of its own and is found exactly as a line written at its top.
 */
function piecesOf(text: string): Piece[] {
  const out: Piece[] = [];
  docSections(text).forEach((section) => {
    const title = section.title ? `## ${section.title}` : "";
    let body = "";
    const flush = () => {
      const written = body.trim();
      if (written) out.push({ body: `${title}\n${written}`.trim(), text: written.toLowerCase() });
      body = "";
    };
    section.body.split("\n").forEach((line: string) => {
      if (body.length + line.length + 1 > PIECE) flush();
      body += line + "\n";
    });
    flush();
  });
  return out;
}

/** How much one piece answers the turn: the words of the turn it holds. */
function scoreOf(piece: Piece, tokens: string[], near: string[]): number {
  let score = 0;
  for (const token of tokens) {
    if (piece.text.indexOf(token) < 0) continue;
    score += 1;
    // a word of the turn standing in the piece as a word of its own weighs more than a mention
    if (new RegExp(`(?:^|[^\\p{L}])${token}(?:$|[^\\p{L}])`, "u").test(piece.text)) score += 3;
  }
  // a confirmed word the turn reaches by sound — said in the person's own way — points at the piece
  // that holds it, exactly as the word itself would
  for (const spelling of near) {
    if (new RegExp(`(?:^|[^\\p{L}])${spelling}(?:$|[^\\p{L}])`, "u").test(piece.text)) score += 4;
  }
  // a piece copied out of an older source file answers only where nothing else does
  if (piece.text.indexOf("[older source file]") >= 0) score /= 4;
  return score;
}

/** The confirmed words of this turn as one line each, within the room they are given. */
function wordsBlockOf(list: any[], room: number): string {
  let body = "";
  for (const row of list) {
    const term = clean(row?.term, MAX_TERM);
    if (!term) continue;
    const meaning = clean(row?.meaning, MAX_MEANING);
    const usage = clean(row?.usage, MAX_USAGE);
    const line = `- ${term}${meaning ? ` = ${meaning}` : " = ?"}${usage ? ` · ${usage}` : ""}\n`;
    if (body.length + line.length > room) break;
    body += line;
  }
  return body;
}

// The turn's own search is held for a moment, the way the document itself is held: a live call asks
// on every turn, and the same question asked twice in one pause is not searched for twice.
const HOLD_MS = 5000;
let held: { at: number; key: string; ready: boolean; block: string; stamp: string; found: boolean } = {
  at: 0,
  key: "",
  ready: false,
  block: "",
  stamp: "",
  found: false,
};

/**
 * What one turn of a voice call is handed out of the app's own knowledge.
 *
 * The whole approved document is searched — its rules, its words, its phrases and everything else
 * the admin wrote — and the confirmed Word Bank beside it, and only the few pieces the turn reaches
 * ride back, nearest first, with the confirmed words it reaches. `found` says whether the turn
 * reached anything at all, so a turn that reached nothing is answered as such rather than from a
 * guess.
 */
export async function retrieveKnowledge(
  base44: any,
  question: any,
  room = ROOM,
  /** the words already read for this turn, so the very same list is never read twice */
  already?: any[]
) {
  const said = textOf(question).slice(0, MAX_QUESTION);
  // read in this order, and never two at once: each of these reuses what the one before it has just
  // read, so a live call does not pay for the same read on every turn
  const text = await publishedDoc(base44);
  const stamp = await docStamp(base44);
  // The list may be handed over as it was read, or as the read that is still running: either way the
  // very same words are used, and the read is never made twice.
  const given = already ? await already : null;
  const bank = given && given.length ? given : await bankRows(base44).catch(() => []);

  const doc = String(text || "").trim();
  const rows = Array.isArray(bank) ? bank : bank?.items || [];
  if (!doc && !rows.length) return { block: "", stamp, found: false };

  const key = `${room}:${said}:${stamp}:${doc.length}`;
  if (held.ready && held.key === key && Date.now() - held.at < HOLD_MS) {
    return { block: held.block, stamp: held.stamp, found: held.found };
  }

  const tokens = Array.from(new Set(keyTokens(said))).slice(0, 24);
  // the confirmed words this turn reaches by sound, and only a real likeness: the nearest spellings
  // are never put forward as words
  const near = tokens.length ? alikeTerms(said, rows, MAX_NEAR) : [];
  const wordsBody = wordsBlockOf(
    near.filter((one: any) => typeof one?.tier !== "number" || one.tier <= 2),
    Math.min(WORDS_SHARE, Math.floor(room / 3))
  );
  const sounds = near
    .filter((one: any) => typeof one?.tier !== "number" || one.tier <= 2)
    .flatMap((one: any) => spellingsOf(one))
    .map((spelling: string) => spelling.toLowerCase().replace(/[^\p{L}\p{N}']+/gu, ""))
    .filter((spelling: string) => spelling.length > 2)
    .slice(0, 8);

  const chosen: string[] = [];
  if (tokens.length) {
    const scored = piecesOf(doc).map((piece) => ({ piece, score: scoreOf(piece, tokens, sounds) }));
    scored.sort((a, b) => b.score - a.score);
    // the pieces keep the room the words took, so a long piece never crowds them out
    const bodyRoom = room - wordsBody.length - HEAD.length - (wordsBody ? WORDS_HEAD.length : 0);
    let used = 0;
    for (const row of scored) {
      if (chosen.length >= MAX_PIECES) break;
      if (row.score < MIN_SCORE) break;
      if (used + row.piece.body.length > bodyRoom) continue;
      chosen.push(row.piece.body);
      used += row.piece.body.length;
    }
  }

  const found = chosen.length > 0 || !!wordsBody;
  const block = found
    ? HEAD + chosen.join("\n") + "\n" + (wordsBody ? WORDS_HEAD + wordsBody : "")
    : NONE;

  held = { at: Date.now(), key, ready: true, block, stamp, found };
  return { block, stamp, found };
}