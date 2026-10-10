/**
 * The one knowledge document the admin keeps, and the only place the app's knowledge is read from.
 *
 * Everything the admin knows stands in a single document written under its own headings: the words
 * of Ebembe and what they mean, the phrases, the rules of reading and writing the language, and
 * anything else the assistant must know. The published text of that document is the whole knowledge
 * of the app: every AI — the voices of a call, the written Kibembe chat, the Base44 answer, the Rap
 * Studio — reads the same words and the same rules from here, so a line the admin approves reaches
 * all of them together, and a line still in the draft reaches none of them.
 *
 * The document's shape:
 *
 *   # WORDS
 *   ole (oh-leh) = hello | greeting said on arriving
 *   kata = to cut
 *
 *   # PHRASES
 *   ole bile = good morning
 *
 *   # RULES
 *   a = ah, e = eh, i = ee, o = oh, u = oo
 *
 *   # KNOWLEDGE
 *   Q: Babembe ni nani?
 *   A: ...
 *
 * The reading is forgiving: a heading may be written in capital letters or with #, in English or in
 * Kiswahili, and a part the admin files under a heading of their own name rides with the rest of the
 * knowledge. A line beginning with # is a note to the admin and is never read as knowledge, and a
 * line in brackets is a placeholder. Everything else is knowledge.
 */

const DOC_KEY = "main";

// what one line may hold: a spelling, its meaning, and how it is used — the same room the saved
// word entries were always allowed, so nothing gathered in from them is cut short
const MAX_TERM = 40;
const MAX_MEANING = 110;
const MAX_USAGE = 90;

/** Which part of the document a heading names, in the names an admin is likely to write. */
const SHAPES: [string, RegExp][] = [
  [
    "words",
    /^(?:the )?(?:words?|word list|vocabulary|maneno|maneno ya ebembe|ebembe words|kibembe words|misamiati)$/i,
  ],
  [
    "phrases",
    /^(?:the )?(?:phrases?|expressions?|sayings?|sentences?|proverbs?|misemo|msemo|sentensi|methali)$/i,
  ],
  [
    "rules",
    /^(?:the )?(?:rules?|rule book|grammar|reading|reading key|sheria|kanuni|sarufi|matamshi|namna ya kusoma)$/i,
  ],
  [
    "knowledge",
    /^(?:the )?(?:knowledge|notes?|questions?|questions and answers|q ?& ?a|qa|world|general|more|maarifa|maelezo|maswali|maswali na majibu)$/i,
  ],
];

export type DocSection = { id: string; title: string; body: string };

/** A value as the text it is, or nothing at all: a field that was never written is never a word. */
export function textOf(value: any): string {
  return typeof value === "string" ? value : "";
}

/** The rows of a page, whether the store handed back a list or a page of them. */
export function rowsOf(page: any): any[] {
  return Array.isArray(page) ? page : page?.items || [];
}

/** One written line, its runs of space flattened, held to the room it is allowed. */
export function clean(value: any, max: number): string {
  return textOf(value).replace(/\s+/g, " ").trim().slice(0, max);
}

/** Whether a line opens a new part of the document, and which part it names. */
function headingId(line: string): string | null {
  const raw = line.trim();
  if (!raw) return null;
  const hashed = raw.match(/^#{1,6}\s*(.+?)\s*#*$/);
  const name = (hashed ? hashed[1] : raw).replace(/[:.\s]+$/, "").trim();
  if (!name || name.length > 48) return null;
  // a line that carries a meaning is never a heading
  if (!hashed && (name.includes("=") || name.includes("|"))) return null;

  for (const [id, shape] of SHAPES) {
    if (shape.test(name)) return id;
  }
  // a heading the admin wrote in their own words and in capitals is a heading of its own
  if (!hashed) {
    const letters = name.replace(/[^\p{L}]/gu, "");
    if (letters.length < 3) return null;
    if (name === name.toUpperCase() && letters !== letters.toLowerCase()) return "knowledge";
  }
  return null;
}

/** The document cut into its parts, in the order they are written. */
export function docSections(text: any): DocSection[] {
  const out: DocSection[] = [];
  let current: DocSection | null = null;

  textOf(text)
    .replace(/\r/g, "")
    .split("\n")
    .forEach((raw) => {
      const id = headingId(raw);
      if (id) {
        const title = raw.trim().replace(/^#{1,6}\s*/, "").replace(/[:.\s]+$/, "").trim();
        current = { id, title, body: "" };
        out.push(current);
        return;
      }
      if (!current) {
        current = { id: "knowledge", title: "", body: "" };
        out.push(current);
      }
      const line = raw.trimEnd();
      if (line.trim()) current.body += line + "\n";
    });

  return out;
}

/** One written line as a word: its spelling, the reading that is the voice's alone, what it means
 *  and how it is used. A line with no meaning yet is the word on its own, as it always was. */
function wordRowOf(raw: string, at: string): any | null {
  const line = raw.trim().replace(/\s+/g, " ");
  // a note to the admin, a placeholder, or a part of the document's own shape: never a word
  if (!line || line.startsWith("#") || line.startsWith("(") || line.startsWith("//")) return null;

  const cut = line.indexOf("=");
  const left = cut >= 0 ? line.slice(0, cut) : line;
  const right = cut >= 0 ? line.slice(cut + 1) : "";

  // a reading written between brackets beside the word is for the voice alone
  const held = left.match(/\(([^()]*)\)/);
  const term = clean(left.replace(/\([^()]*\)/g, " "), MAX_TERM);
  if (!term) return null;
  // a line with no meaning is a word still to be explained: it is never a sentence
  if (cut < 0 && /[.!?;:,]$/.test(term)) return null;

  const bar = right.indexOf("|");
  const meaning = clean(bar >= 0 ? right.slice(0, bar) : right, MAX_MEANING);
  const usage = clean(bar >= 0 ? right.slice(bar + 1) : "", MAX_USAGE);

  const row: any = {
    term,
    meaning,
    usage,
    guide: held ? clean(held[1], MAX_USAGE) : "",
    source: "document",
  };
  // a word written here is the newest word the app holds, so it is the one a live turn reaches first
  if (at) {
    row.updated_date = at;
    row.created_date = at;
  }
  return row;
}

/** Every word and phrase the document holds, in the order they are written, each spelling once. */
export function docWordRows(text: any, at = ""): any[] {
  const rows: any[] = [];
  const seen = new Set<string>();

  docSections(text).forEach((section) => {
    if (section.id !== "words" && section.id !== "phrases") return;
    section.body.split("\n").forEach((raw) => {
      const row = wordRowOf(raw, at);
      if (!row) return;
      const key = row.term.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      rows.push(row);
    });
  });

  return rows;
}

/** The rules the document states: how Kibembe is read, written and used. */
export function docRules(text: any): string {
  const lines: string[] = [];
  docSections(text).forEach((section) => {
    if (section.id !== "rules") return;
    section.body.split("\n").forEach((raw) => {
      const line = raw.trim();
      if (!line || line.startsWith("#")) return;
      lines.push(line);
    });
  });
  return lines.join("\n");
}

/** The rest of the document: what is filed under the knowledge heading, and whatever the admin
 *  wrote under a heading of their own name. The words and the rules are left out — they ride in
 *  their own sections, read by the AIs that build Kibembe. */
export function docKnowledge(text: any): string {
  const parts: string[] = [];

  docSections(text).forEach((section) => {
    if (section.id === "words" || section.id === "phrases" || section.id === "rules") return;
    const lines = section.body
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => {
        const body = line.trim();
        return body && !body.startsWith("#") && !body.startsWith("(");
      });
    if (!lines.length) return;
    parts.push(section.title ? `## ${section.title}\n${lines.join("\n")}` : lines.join("\n"));
  });

  return parts.join("\n\n");
}

/** A long text cut to the room one turn has, always cut between two lines. */
function trimLines(text: string, budget: number): string {
  if (text.length <= budget) return text;
  const cut = text.lastIndexOf("\n", budget);
  return text.slice(0, cut > budget / 2 ? cut : budget);
}

// The document is larger than one record may hold, so its text is kept in parts and read back as
// one. The parts are small enough to stay well inside what a record carries.
const MAX_PARTS = 200;

/** How long a held copy of the document is kept while nothing is written to the store. */
const HOLD_MS = 5000;
let held: { at: number; state: any; published: string } | null = null;

/** The document's own state: when its working copy was saved, and when it was approved. */
async function stateRow(base44: any) {
  const page = await base44.asServiceRole.entities.KnowledgeDoc.filter(
    { key: DOC_KEY, kind: "state" },
    { limit: 1 }
  );
  return rowsOf(page)[0] || null;
}

/** One text of the document, read back out of its parts: the working copy, or the approved one. */
export async function readDocText(base44: any, kind: string): Promise<string> {
  return readParts(base44, kind);
}

/** One text of the document, read back out of its parts in their own order. */
async function readParts(base44: any, kind: string) {
  const rows: any[] = [];
  let cursor = "";

  while (rows.length < MAX_PARTS) {
    const options: any = { sort: "part", limit: MAX_PARTS, fields: ["part", "text"] };
    if (cursor) options.cursor = cursor;
    const page = await base44.asServiceRole.entities.KnowledgeDoc.filter(
      { key: DOC_KEY, kind },
      options
    );
    const items = rowsOf(page);
    items.forEach((row: any) => rows.push(row));
    const next = page?.has_more ? page?.next_cursor : "";
    if (!next) break;
    cursor = next;
  }

  return rows
    .sort((a: any, b: any) => Number(a.part || 0) - Number(b.part || 0))
    .map((row: any) => textOf(row.text))
    .join("");
}

/** The document and its approved text, held for a moment so a live call does not read it on every
 *  turn — and read again at once the moment the admin publishes something new. */
async function loadDoc(base44: any) {
  if (held && Date.now() - held.at < HOLD_MS) return held;
  try {
    const state = await stateRow(base44);
    const published = state ? await readParts(base44, "published") : "";
    held = { at: Date.now(), state, published };
    return held;
  } catch (error: any) {
    // A read the store refused — a rate limit, a moment of trouble — never empties the knowledge.
    // The document already read stands, and the moment it was read is moved on so a store that is
    // refusing reads is not asked again on every turn of the same call. A document that was never
    // read at all is still nothing, and is said as such.
    console.error("The knowledge document could not be read:", error?.message);
    if (!held) throw error;
    held = { ...held, at: Date.now() };
    return held;
  }
}

/** The approved document: the whole knowledge every AI answers from, and never a draft. */
export async function publishedDoc(base44: any): Promise<string> {
  try {
    return (await loadDoc(base44)).published;
  } catch (error: any) {
    // a document that could not be read never holds up an answer: what was saved before it stands
    console.error("The knowledge document could not be read:", error?.message);
    return "";
  }
}

/** Whether the document has moved, so every held copy of the knowledge is dropped at once. */
export async function docStamp(base44: any): Promise<string> {
  try {
    const { state, published } = await loadDoc(base44);
    if (!state) return "";
    return `${state.published_at || ""}:${state.updated_date || ""}:${published.length}`;
  } catch (error: any) {
    return "";
  }
}

/** The rules of the approved document, whole. */
export async function docRulesText(base44: any): Promise<string> {
  return docRules(await publishedDoc(base44));
}

// The head the rest of the document rides under: the admin's own words, and the rule that they are
// the app's own knowledge rather than something found elsewhere.
export const DOC_HEAD =
  "\nMAARIFA MENGINE YA MWENYEJI — the rest of the admin's own document:\n" +
  "Haya ni maneno ya admin mwenyewe, na ni maarifa ya app hii: yafuate kama yalivyoandikwa, " +
  "usiyabadilishe wala usiyaache.\n";

// The block the rest of the document rides as, held for the same short moment as the document
// itself: a live call asks for it on every turn, and the document it came from is already held.
let heldBlock: { at: number; key: string; text: string } = { at: 0, key: "", text: "" };

/** The rest of the approved document, cut to the room one turn has. */
export async function docKnowledgeBlock(base44: any, budget = 6000): Promise<string> {
  const text = await publishedDoc(base44);
  if (!text) return "";
  const key = `${budget}:${text.length}:${text.slice(-64)}`;
  if (heldBlock.text && heldBlock.key === key && Date.now() - heldBlock.at < HOLD_MS) {
    return heldBlock.text;
  }
  const body = trimLines(docKnowledge(text), budget).trim();
  const block = body ? DOC_HEAD + body + "\n" : "";
  heldBlock = { at: Date.now(), key, text: block };
  return block;
}

// The whole approved document, handed over as one: its words, its phrases, its rules and everything
// else the admin wrote, exactly as they approved it. This is what every AI that answers is given, so
// a line the admin publishes reaches all of them together — the voices of a call, the written chat,
// the Base44 answer and the Rap Studio — and a line still in the draft reaches none of them.
//
// The document is handed over whole. The ceiling below is not a share of it: it is a guard against a
// runaway document, and where it is reached the block says so plainly rather than passing a part of
// the document off as the whole of it.
export const DOC_WHOLE_ROOM = 240000;

export const DOC_WHOLE_HEAD =
  "\nTHE ADMIN'S ONE KNOWLEDGE DOCUMENT — the whole of it, exactly as the admin last approved it. " +
  "This is the app's own knowledge, and it stands above everything else you were told: every word, " +
  "every phrase, every rule of the language and everything else the admin has written. Where one of " +
  "its lines and anything else disagree, this document wins, and nothing is knowledge of this app " +
  "that is not written here.\n";

const DOC_WHOLE_CUT =
  "\n[The document goes on beyond this line, and the part above is as much of it as one answer has " +
  "room for.]\n";

// held for the same short moment the document itself is held, so a live call asks for the whole of
// it without reading or trimming it again on every turn
let heldWhole: { at: number; key: string; text: string } = { at: 0, key: "", text: "" };

// The words a question is made of: what a turn is answered from is chosen by these, so the words
// that carry the meaning of a question are kept and the ones every question carries are set aside.
const PLAIN = new Set([
  "the", "and", "for", "with", "that", "this", "these", "those", "what", "when", "where", "which",
  "who", "how", "why", "you", "your", "yours", "his", "her", "hers", "him", "she", "they", "them",
  "are", "was", "were", "does", "did", "doing", "not", "can", "could", "would", "should", "please",
  "tell", "say", "says", "said", "about", "word", "words", "meaning", "means", "translate", "again",
  "kwa", "na", "ya", "wa", "ni", "je", "hii", "hilo", "yake", "yangu", "mimi", "wewe", "sisi", "habari",
  "kibembe", "ebembe", "english", "swahili", "kiswahili", "bemba", "asante", "tafadhali",
]);

/** The words a question is made of, as the parts of the document are looked for by them. */
function askedWords(question: string): string[] {
  const out: string[] = [];
  String(question || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'’ ]/gu, " ")
    .split(/\s+/)
    .forEach((raw) => {
      const word = raw.replace(/^['’]+|['’]+$/g, "").trim();
      if (word.length < 3 || PLAIN.has(word) || out.includes(word)) return;
      out.push(word);
    });
  return out.slice(0, 24);
}

/** How much one part of the document answers a question: the words of the question it holds. */
function answersOf(body: string, words: string[]): number {
  const text = String(body || "").toLowerCase();
  let score = 0;
  words.forEach((word) => {
    if (text.indexOf(word) < 0) return;
    score += 1;
    // a word of the question standing in the part as a word of its own weighs more than a mention
    if (new RegExp(`(?:^|[^\\p{L}])${word}(?:$|[^\\p{L}])`, "u").test(text)) score += 3;
  });
  return score;
}

/**
 * What one turn is handed out of a document larger than the room it has.
 *
 * The rules ride first, whole, because they are the law of the language. Then the parts the question
 * itself names, the fullest first — the part of a word, the line that holds the phrase, the note the
 * question is about. What is left of the room is given to the parts the question did not name, a slice
 * each, so no part of the document is ever passed off as absent from what an AI was handed; and the
 * block says plainly how many of the document's parts it is holding.
 */
function piecesForQuestion(text: string, question: string, room: number) {
  const sections = docSections(text);
  const pieces = sections.map((section, at) => ({
    at,
    rules: section.id === "rules",
    body: `${section.title ? `## ${section.title}\n` : ""}${section.body.trim()}`,
  }));
  const picked = new Map<number, string>();
  let used = 0;

  const add = (piece: { at: number; body: string }) => {
    if (!piece.body.trim() || used + piece.body.length > room) return false;
    picked.set(piece.at, piece.body);
    used += piece.body.length;
    return true;
  };

  pieces.filter((piece) => piece.rules).forEach(add);

  const words = askedWords(question);
  if (words.length) {
    pieces
      .filter((piece) => !piece.rules)
      .map((piece) => ({ piece, score: answersOf(piece.body, words) }))
      .filter((row) => row.score > 0)
      // a part that is a copy of an older file answers only when nothing else does
      .map((row) => ({
        ...row,
        score: row.piece.body.indexOf("[older source file]") >= 0 ? row.score / 4 : row.score,
      }))
      .sort((a, b) => b.score - a.score || a.piece.at - b.piece.at)
      .forEach((row) => add(row.piece));
  }

  // the room that is left goes to the parts the question did not name, so all of the document stands
  const left = pieces.filter((piece) => !picked.has(piece.at));
  const roomLeft = room - used;
  const each = left.length ? Math.max(240, Math.floor(roomLeft / left.length)) : 0;
  left.forEach((piece) => {
    if (used >= room || each <= 0) return;
    if (piece.body.length <= each) {
      add(piece);
      return;
    }
    const slice = piece.body.slice(0, each);
    picked.set(piece.at, `${slice}\n[the rest of this part stands in the document, unread here]\n`);
    used += slice.length;
  });

  return {
    body: [...picked.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, body]) => body)
      .join("\n"),
    shown: picked.size,
    total: pieces.length,
  };
}

/** The whole approved document as one block — what every AI that answers is handed. */
export async function docWholeBlock(
  base44: any,
  budget = DOC_WHOLE_ROOM,
  question = ""
): Promise<string> {
  const text = await publishedDoc(base44);
  if (!text) return "";
  const key = `${budget}:${text.length}:${text.slice(-64)}:${question.slice(0, 120)}`;
  if (heldWhole.text && heldWhole.key === key && Date.now() - heldWhole.at < HOLD_MS) {
    return heldWhole.text;
  }

  let body = "";
  let note = "";
  if (text.length <= budget) {
    body = text.trim();
  } else {
    const picked = piecesForQuestion(text, question, budget - 1600);
    body = picked.body.trim();
    note = `\n[${picked.shown} of the ${picked.total} parts of the admin's document are shown above: its rules whole, the parts this turn names, and a slice of every other part.]\n`;
  }

  const block = body ? DOC_WHOLE_HEAD + body + (note || (text.length > budget ? DOC_WHOLE_CUT : "")) : "";
  heldWhole = { at: Date.now(), key, text: block };
  return block;
}