import { publishedDoc, textOf } from "./knowledgeDoc.ts";
import { clean } from "./knowledgeWords.ts";

/**
 * The admin's own engine of asks and replies.
 *
 * The admin's one document holds, beside its words and its rules, an engine of the conversation: an
 * ask, what that ask means, and the replies saved for it. An ask is answered from its own replies and
 * from nowhere else, each one exactly as the engine writes it — so a reply is never invented, never
 * re-worded into a sentence of the model's own, and never replaced by a form the engine does not save
 * for that ask.
 *
 * The whole engine is read from the approved document, and the ask one turn matches is handed on. Both
 * paths answer from here — the voices of a call, through the reading the app makes of each heard turn,
 * and the written answers, through the note this writes — so the same ask finds the same replies
 * whichever of them is answering. Nothing is a Kibembe form here that the admin's own document does
 * not hold: this module reads the engine, it never adds to it.
 */

export type EngineReply = { term: string; meaning: string };

export type EngineAsk = {
  /** the ask exactly as the engine writes it */
  ask: string;
  /** the forms of that ask, when the engine writes more than one on the same line */
  alt: string[];
  /** what the ask means */
  meaning: string;
  /** the replies the engine saves for it, in the order it writes them */
  replies: EngineReply[];
  /** true when the engine saves no reply of its own for it, only its own general replies */
  general: boolean;
};

// The engine's own general replies: what it saves for an ask that carries no reply of its own. They
// are given exactly as the engine writes them, and only where nothing else is held for the turn.
export const ENGINE_GENERAL_REPLIES = [
  "Ee ee — Yes.",
  "Sawa — Okay / alright.",
  "Shi ke — I do not know.",
  "Nalola — I am looking / checking.",
  "Ka leka — Wait, let me check.",
  "Oto ela — Please repeat.",
];

/**
 * How an ask is heard and how a reply is given — the rule every voice and every written answer of the
 * app is handed, so the engine is answered the same way wherever the person is speaking.
 */
export const ASK_REPLY_RULES = [
  "KUKUULIZA NA KUJIBU — HOW AN ASK IS HEARD, AND HOW A REPLY IS GIVEN",
  "- The admin's own engine of asks and replies stands in the document: an ask, what it means, and the replies saved for that ask. When what the person says is one of those asks — said in Kibembe, or asked in Kiswahili or English with the same meaning — the reply comes from that ask's own replies and from nowhere else.",
  "- One of the replies the ask holds is the reply, given exactly as the engine writes it: the same words and the same spelling, nothing added to it, nothing left out of it, never re-worded, never re-translated, and never replaced by another form. A reply built by joining two of them, or shortened, is not the engine's reply.",
  "- A reply is never invented and never taken from another ask. The person is never told which reply was chosen, never shown the list of them, and never told that an engine or a list was read.",
  "- Where an ask holds more than one reply, any of them may be given, and the one given stands whole. When the same ask comes again in one call, another of its own replies is given rather than the same line twice — apart from a repeat ask, where that very line is given back as it stood.",
  "- Where the person asks in another language, the Kibembe reply is still the engine's own form, said exactly as it stands, and its own meaning is what the answer says in the language they used.",
  "- Where an ask carries no reply of its own, answer naturally in Kibembe from the confirmed words, on the person's own subject. Only where nothing else is held for the turn may one of the engine's own general replies stand: Ee ee — Yes. / Sawa — Okay / alright. / Shi ke — I do not know. / Nalola — I am looking / checking. / Ka leka — Wait, let me check. / Oto ela — Please repeat.",
  "- Never say the rule out loud, never explain the engine, and never say that a reply was chosen from a list: the reply itself is the whole answer, and nothing is said on top of it.",
].join("\n");

// a bullet line opens a reply; the engine writes its replies with one
const BULLET = /^[•·*‣]\s+/;
// how much of the engine is read, and how long one part of it may be
const MAX_ASKS = 3000;
const MAX_REPLIES = 12;
const MAX_ASK = 140;
const MAX_TERM = 70;
const MAX_MEANING = 120;
// how long the parsed engine is held while the document is unchanged
const HOLD_MS = 5000;

// The plain words of a question: they carry no meaning of their own, so the meaning of an ask is
// matched by the words it really turns on.
const PLAIN = new Set([
  "the", "and", "for", "are", "was", "were", "with", "that", "this", "from", "you", "your",
  "his", "her", "its", "our", "their", "them", "they", "have", "has", "had", "will", "would",
  "can", "could", "should", "shall", "does", "did", "doing", "done", "about", "into", "not",
  "but", "all", "any", "some", "there", "here", "then", "than", "also", "what", "when", "where",
  "which", "who", "whom", "how", "why", "yes", "no", "okay", "ok", "alright", "fine", "please",
  "give", "tell", "say", "says", "said", "get", "got", "let", "may", "might", "must", "one",
  "two", "am", "is", "be", "been", "being", "do", "me", "my", "mine", "we", "us", "it", "to",
  "of", "in", "on", "at", "as", "by", "or", "if", "so", "up", "out", "now", "very", "just",
  "good", "well", "much", "many", "more", "most", "want", "need", "like", "know",
]);

/** A line as the words it is made of, folded: accents and apostrophes flattened, small letters. */
function fold(value: any): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .toLowerCase();
}

/** The words of a line, as they are compared one with another. */
function wordsOf(value: any): string[] {
  return fold(value).match(/[a-z0-9]+/g) || [];
}

/**
 * Whether a line can be the ask of a block: a phrase of the conversation rather than a heading, a
 * note, a placeholder, or a line of the document's own shape.
 */
function usableHead(line: string): boolean {
  const text = String(line || "").trim();
  if (!text || text.length > MAX_ASK) return false;
  if (/^[#(\-*>]/.test(text)) return false;
  if (/^(?:q|a|sw|en|kibembe|english|swahili)\s*[:.]\s/i.test(text)) return false;
  if (text.includes("=") || text.includes("|")) return false;
  if (text.replace(/[^\p{L}]/gu, "").length < 2) return false;
  return true;
}

/** One bullet line as the reply it carries: the form itself, then what it means. */
function replyOf(line: string): EngineReply | null {
  const body = clean(String(line || "").replace(BULLET, ""), MAX_TERM + MAX_MEANING + 8);
  if (!body) return null;
  const cut = body.match(/^(.*?)\s+[—–-]\s+(.*)$/);
  const term = clean(cut ? cut[1] : body, MAX_TERM);
  if (!term) return null;
  return { term, meaning: cut ? clean(cut[2], MAX_MEANING) : "" };
}

/** The ask a block's head lines carry, or nothing when they are not an ask at all. */
function askOf(head: string[]): EngineAsk | null {
  const lines = head.map((line) => clean(line, MAX_ASK)).filter(usableHead);
  if (!lines.length) return null;

  const first = lines[0];
  // the engine sometimes writes a few forms of the same ask on the one line, apart by a slash: any
  // of them is that ask being said
  const alt = first
    .split(/\s*\/\s*/)
    .map((form) => clean(form, MAX_ASK))
    .filter((form) => form && form.replace(/[^\p{L}]/gu, "").length >= 2);
  if (!alt.length) return null;

  const meaning = lines.length > 1 && fold(lines[1]) !== fold(first) ? lines[1] : "";
  return { ask: first, alt, meaning, replies: [], general: false };
}

/** Whether a reply set is the engine's own general set, and nothing else. */
function generalSet(replies: EngineReply[]): boolean {
  const want = ENGINE_GENERAL_REPLIES.map((one) => fold(one).replace(/\s+/g, " "));
  const have = replies.map((one) => fold(`${one.term} — ${one.meaning}`).replace(/\s+/g, " "));
  if (have.length !== want.length) return false;
  return want.every((one) => have.includes(one));
}

/**
 * The whole engine, read out of the admin's document: every ask it holds, with its meaning and the
 * replies saved for it. A reply is never a form of its own: it stands under the ask it answers.
 */
export function engineAsks(text: any): EngineAsk[] {
  const out: EngineAsk[] = [];
  const seen = new Set<string>();
  let head: string[] = [];
  let block: EngineAsk | null = null;

  const keep = (ask: EngineAsk) => {
    const key = wordsOf(ask.ask).join(" ");
    if (!key || seen.has(key)) return;
    seen.add(key);
    ask.general = generalSet(ask.replies);
    out.push(ask);
  };

  const done = () => {
    if (block && block.replies.length) keep(block);
    block = null;
    head = [];
  };

  textOf(text)
    .replace(/\r/g, "")
    .split("\n")
    .forEach((raw) => {
      if (out.length >= MAX_ASKS) return;
      const line = raw.trim();
      if (!line) return;

      if (BULLET.test(line)) {
        if (!block) block = askOf(head);
        const reply = block ? replyOf(line) : null;
        if (!reply || !block) return;
        // one form stands once in a block, however it was written
        const key = wordsOf(reply.term).join(" ");
        if (!key || block.replies.some((one) => wordsOf(one.term).join(" ") === key)) return;
        if (block.replies.length < MAX_REPLIES) block.replies.push(reply);
        return;
      }

      // a line that is not a reply closes the block above it and opens the next ask
      if (block) done();
      head.push(line);
      // only the two lines standing nearest the replies are the ask and its meaning
      if (head.length > 2) head.shift();
    });

  done();
  return out;
}

/** Where the ask's own words stand in the turn as one run, or -1 when they do not. */
function runAt(said: string[], want: string[]): number {
  for (let at = 0; at + want.length <= said.length; at += 1) {
    let row = true;
    for (let step = 0; step < want.length; step += 1) {
      if (said[at + step] !== want[step]) {
        row = false;
        break;
      }
    }
    if (row) return at;
  }
  return -1;
}

/** Whether the ask's words all stand in the turn, in their own order, with the person's words between. */
function inOrder(said: string[], want: string[]): boolean {
  let at = 0;
  for (const word of want) {
    at = said.indexOf(word, at);
    if (at < 0) return false;
    at += 1;
  }
  return true;
}

/** How much one ask is the turn: 0 when it is not that ask at all. */
function scoreOf(ask: EngineAsk, said: string[]): number {
  for (const form of ask.alt) {
    const want = wordsOf(form);
    if (!want.length) continue;
    // one word on its own is the ask only when it is the whole turn
    if (want.length === 1) {
      if (said.length === 1 && said[0] === want[0]) return 5;
      continue;
    }
    if (runAt(said, want) >= 0) return 5 + want.length / 10;
    if (want.length >= 3 && inOrder(said, want)) return 3 + want.length / 10;
  }

  // the ask asked in another language: its own meaning is what the turn carries
  const gloss = wordsOf(ask.meaning).filter((word) => word.length > 2 && !PLAIN.has(word));
  if (gloss.length && gloss.every((word) => said.includes(word))) {
    if (gloss.length >= 2 || said.length <= 5) return 1.5 + gloss.length / 10;
  }
  return 0;
}

/**
 * The ask one turn is, nearest first: the ask itself as the engine writes it, then a form of it said
 * with the person's own words between, then the ask asked in another language. An ask that carries
 * replies of its own stands above one that carries only the engine's general replies, so a turn that
 * is both is answered with the reply written for it.
 */
export function engineFor(rows: EngineAsk[], said: any): EngineAsk | null {
  const words = wordsOf(said);
  if (!words.length) return null;

  let best: EngineAsk | null = null;
  let bestScore = 0;
  for (const ask of rows) {
    const score = scoreOf(ask, words) + (ask.general ? 0 : 0.5);
    if (score > bestScore) {
      bestScore = score;
      best = ask;
    }
  }
  return bestScore >= 1.5 ? best : null;
}

/**
 * The ask of one turn as the voice or the written answer is told: what was said, which ask it is, and
 * the replies the engine saves for it — one of which is the reply, given exactly as it stands.
 */
export function engineNote(said: any, ask: EngineAsk): string {
  const turn = clean(said, 240);
  const which = `It is one of the app's own asks, saved in the engine as "${ask.ask}"${
    ask.meaning ? ` — ${ask.meaning}` : ""
  }.\n`;

  if (ask.general || !ask.replies.length) {
    return (
      "HOW TO REPLY TO THIS TURN\n" +
      `One turn was just said: "${turn}"\n` +
      which +
      "The engine saves no reply of its own for it: answer naturally in Kibembe, from the confirmed words, on the person's own subject. Only where nothing else is held for the turn may one of the engine's own general replies stand, exactly as it is written: " +
      ENGINE_GENERAL_REPLIES.join(" / ") +
      "\n"
    );
  }

  const list = ask.replies
    .map((reply) => `- ${reply.term}${reply.meaning ? ` — ${reply.meaning}` : ""}`)
    .join("\n");

  return (
    "HOW TO REPLY TO THIS TURN\n" +
    `One turn was just said: "${turn}"\n` +
    which +
    "The replies the engine saves for this ask are these, exactly as they stand:\n" +
    list +
    "\nOne of them is the reply: give it exactly as it stands — the same words, the same spelling, nothing added to it and nothing left out of it. It is never re-worded, never turned into a new sentence of your own, and never replaced by another form. " +
    "The reply is the whole answer: say nothing on top of it, never read the list out, and never say a reply was chosen or that a list was read. Where the person is not speaking Kibembe, the reply is still the engine's own form, and its meaning is what the answer says in the language they used.\n"
  );
}

// the parsed engine is held for a moment, the way the document itself is held: a live call asks on
// every turn, and the same engine is not parsed again for each one of them
let held: { at: number; key: string; rows: EngineAsk[] } = { at: 0, key: "", rows: [] };

/** The whole engine as the app holds it: read from the approved document, and held for a moment. */
export async function engineAsksOf(base44: any): Promise<EngineAsk[]> {
  let text = "";
  try {
    text = await publishedDoc(base44);
  } catch (error: any) {
    return held.rows;
  }
  if (!text) return held.rows;

  const key = `${text.length}:${text.slice(-64)}`;
  if (held.rows.length && held.key === key && Date.now() - held.at < HOLD_MS) return held.rows;

  const rows = engineAsks(text);
  held = { at: Date.now(), key, rows };
  return rows;
}

/** One turn of the conversation as the engine reads it: the ask it is, and the note that answers it. */
export async function engineTurn(
  base44: any,
  said: any
): Promise<{ ask: EngineAsk | null; note: string }> {
  const turn = clean(said, 240);
  if (!turn) return { ask: null, note: "" };
  const ask = engineFor(await engineAsksOf(base44), turn);
  return { ask, note: ask ? engineNote(turn, ask) : "" };
}