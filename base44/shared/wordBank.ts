import { MAX_MEANING, MAX_TERM, knowledgeWordRows } from "./knowledgeWords.ts";

/**
 * The saved knowledge as a live assistant reads it.
 *
 * A word the admin has just pasted in is meant to be usable the very next time the assistant
 * answers, and a live call asks for the knowledge on every turn — so the list is held from one turn
 * to the next and dropped the moment the store itself moves. How many entries there are and when
 * the newest of them was written are read first, two cheap reads; the whole list is read again as
 * soon as either changes. Any save, edit, clean or delete moves them, whoever made it: the admin's
 * panel, a pasted list, or the app's own lookups during a call.
 */

// how long a held copy is kept when nothing at all is written to the store
const MAX_HELD_MS = 60000;

/** What the saved knowledge looks like right now: how much of it there is, and its newest write. */
export async function knowledgeStamp(base44: any): Promise<string> {
  try {
    const [count, newest] = await Promise.all([
      base44.asServiceRole.entities.AssistantKnowledge.count({}),
      base44.asServiceRole.entities.AssistantKnowledge.filter(
        {},
        { sort: "-updated_date", limit: 1, fields: ["updated_date", "created_date"] }
      ),
    ]);
    const row = (Array.isArray(newest) ? newest : newest?.items || [])[0] || {};
    return `${Number(count) || 0}:${row.id || ""}:${row.updated_date || row.created_date || ""}`;
  } catch (error: any) {
    // a stamp that could not be read never holds a stale list: the caller reads the store whole
    console.error("The knowledge stamp could not be read:", error?.message);
    return "";
  }
}

let held: { at: number; stamp: string; rows: any[] } = { at: 0, stamp: "", rows: [] };

/**
 * Every saved word the admin holds — their own word entries, plus the words their saved documents
 * spell out themselves — read once and kept only while the store is unchanged.
 */
export async function bankRows(base44: any): Promise<any[]> {
  const stamp = await knowledgeStamp(base44);
  if (held.rows.length && stamp && held.stamp === stamp && Date.now() - held.at < MAX_HELD_MS) {
    return held.rows;
  }
  const rows = await knowledgeWordRows(base44);
  held = { at: Date.now(), stamp, rows };
  return held.rows;
}

// What the list rides under: the words are the app's own saved ones, and a word with no meaning
// saved yet is said as it is written and never explained.
export const WORDS_HEAD =
  "\nMANENO YA EBEME YALIYOHIFADHIWA — the words the admin has saved in this app (the app's own Word Bank):\n" +
  "Spell every Kibembe word exactly as it is written here, and take its meaning from here. " +
  'A word written with a "?" has no meaning saved yet: say the word, but never invent a meaning for ' +
  "it, and never say the ? to anyone.\n";

function oneLine(value: any, max: number): string {
  const text = typeof value === "string" ? value : "";
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

function tokensOf(value: any): string[] {
  return (oneLine(value, 500).toLowerCase().match(/[\p{L}\p{N}']+/gu) || []).filter(
    (word) => word.length > 2
  );
}

/**
 * The saved words as the list one turn is given, cut to what that turn can carry: the words the
 * turn itself is about first, then the words written most recently — the ones just pasted in, which
 * are what has to answer now — and then the list from the top. A list longer than one turn can hold
 * therefore still carries what matters, and the words are handed over in the order they are saved.
 */
export function wordListBlock(rows: any[], query: string, budget: number): string {
  const wanted = tokensOf(query);
  const seen = new Set<string>();
  const items: { term: string; line: string; at: number }[] = [];

  rows.forEach((row: any) => {
    const term = oneLine(row?.term, MAX_TERM);
    const key = term.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    const meaning = oneLine(row?.meaning, MAX_MEANING);
    items.push({
      term,
      line: meaning ? `${term} = ${meaning}` : `${term} = ?`,
      at: Date.parse(row?.updated_date || row?.created_date || "") || 0,
    });
  });
  if (!items.length) return "";

  const chosen = new Set<string>();
  let used = 0;
  const take = (item: { term: string; line: string }) => {
    if (chosen.has(item.term) || used + item.line.length + 3 > budget) return;
    chosen.add(item.term);
    used += item.line.length + 3;
  };

  // the words this turn is about come first, so a long list never hides the one being asked about
  if (wanted.length) {
    items.forEach((item) => {
      const words = tokensOf(item.term).concat(tokensOf(item.line));
      const near = words.some(
        (word) =>
          wanted.includes(word) || (word.length >= 5 && wanted.some((want) => word.startsWith(want)))
      );
      if (near) take(item);
    });
  }
  // then the words written most recently: what the admin has just pasted or typed in
  [...items].sort((a, b) => b.at - a.at).forEach(take);
  // then as much of the list from the top as the turn still has room for
  items.forEach(take);

  if (!chosen.size) return "";
  const lines = items.filter((item) => chosen.has(item.term)).map((item) => `- ${item.line}`);
  return `${WORDS_HEAD}${lines.join("\n")}\n`;
}

/** A long rule book cut to what one turn carries, and always cut between two lines. */
export function trimToLines(text: any, budget: number): string {
  const body = typeof text === "string" ? text : "";
  if (body.length <= budget) return body;
  const cut = body.lastIndexOf("\n", budget);
  return body.slice(0, cut > budget / 2 ? cut : budget);
}