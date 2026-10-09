import { MAX_TERM, clean } from "./knowledgeWords.ts";
import { heardForms } from "./soundsAlike.ts";

/**
 * How each confirmed Kibembe word is really said, and the order that decides it.
 *
 * The app holds three kinds of evidence about one word's sound, and they stand in a fixed order:
 *
 * 1. the newest correction Gloire Sadiki himself confirmed — the word as the Word Bank writes it now,
 *    with the reading ("matamshi") saved beside it;
 * 2. the words the turn itself is about, so what the person has just said is said back the way they
 *    say it;
 * 3. the recordings he has approved, whose written forms are evidence of how that same word comes out.
 *
 * The word's own spelling is always the word. A reading shapes how it is said and is never written on
 * the screen or read out; the ways a word is known to come out are how it is recognised, and they
 * belong to that one word — never written, never spoken as the word, and never taken for words of
 * their own.
 */

// How many words carry their reading into one voice, how long one line may be, and how much room the
// whole block takes. Only words that really carry a reading or a known way are written here at all.
const WORDS = 80;
const LINE = 220;
const BUDGET = 2600;
// the approved recordings read as evidence, held while nothing new is approved
const RECORDINGS = 200;
const HELD_MS = 60000;

export const PRONUNCIATION_HEAD = [
  "MATAMSHI YA KIBEMBE — HOW EACH CONFIRMED WORD IS REALLY SAID, AND THE ORDER THAT DECIDES IT",
  "- The order is fixed, and it is never rearranged: 1) the newest correction Gloire Sadiki himself confirmed — the word exactly as the Word Bank writes it, with the reading saved beside it; 2) the words this very turn is about; 3) the recordings he has approved, whose written forms are evidence of how that word comes out.",
  "- A word's own spelling is the word: write it and say it exactly as the Bank writes it — letters, accents, apostrophes, hyphens and spaces included. The reading below (\"matamshi\") is for your ear alone: it shapes how the word is said, and it is never written on the screen and never read out as words of its own.",
  '- "njia" are ways the same word is known to come out — an accent, a letter, a syllable, the way one of his own recordings was written down. They are how that one word is recognised: never write one, never speak one in place of the word, and never take one for a word of its own.',
  "- Where a word carries no reading here, its own spelling decides every sound, by the reading rules you already hold. Never invent a reading, and never change a word's spelling because a reading sounds different.",
].join("\n");

/** The words a line is made of, as the turn's own words are compared with the bank. */
function tokens(value: any): string[] {
  return (String(value ?? "")
    .toLowerCase()
    .match(/[\p{L}\p{N}']+/gu) || []).filter((word) => word.length > 2);
}

type Reading = {
  term: string;
  guide: string;
  ways: string[];
  at: number;
  asked: boolean;
};

/**
 * The readings of the confirmed words, in the order that decides them: the words this turn itself is
 * about first, then the words written most recently — the corrections just confirmed — and then the
 * rest. A word carrying neither a reading nor a known way adds nothing and is left out.
 */
export function pronunciationLines(
  rows: any[],
  query = "",
  limit = WORDS,
  evidence = new Map<string, string[]>()
): string[] {
  const wanted = tokens(query);
  const seen = new Set<string>();
  const items: Reading[] = [];

  for (const row of Array.isArray(rows) ? rows : []) {
    const term = clean(row?.term, MAX_TERM);
    const key = term.toLowerCase();
    if (!term || seen.has(key)) continue;

    const guide = clean(row?.guide, 90);
    const ways = [...heardForms(row), ...(evidence.get(key) || [])]
      .map((form) => clean(form, 40))
      .filter(Boolean);
    const unique: string[] = [];
    ways.forEach((form) => {
      if (unique.some((had) => had.toLowerCase() === form.toLowerCase())) return;
      unique.push(form);
    });
    // a word with no reading and no known way is not part of this block at all
    if (!guide && !unique.length) continue;

    seen.add(key);
    items.push({
      term,
      guide,
      ways: unique.slice(0, 6),
      at: Date.parse(row?.updated_date || row?.created_date || "") || 0,
      asked: wanted.includes(key) || wanted.some((word) => key.length >= 4 && word.startsWith(key)),
    });
  }

  if (!items.length) return [];

  const order = [...items].sort((a, b) => Number(b.asked) - Number(a.asked) || b.at - a.at);

  return order.slice(0, limit).map((one) => {
    const line =
      `- ${one.term}` +
      (one.guide ? ` — matamshi: ${one.guide}` : "") +
      (one.ways.length ? ` · njia: ${one.ways.join(", ")}` : "");
    return line.slice(0, LINE);
  });
}

/**
 * The readings of the confirmed words as they ride into a voice: the rules of the order first, then
 * every word that carries a reading or a known way, inside the room one voice can hold. Nothing at all
 * comes back when the bank carries no reading — a bank with no readings is answered exactly as before.
 */
export function pronunciationBlock(
  rows: any[],
  query = "",
  budget = BUDGET,
  evidence = new Map<string, string[]>()
): string {
  const lines = pronunciationLines(rows, query, WORDS, evidence);
  if (!lines.length) return "";

  const head = `\n${PRONUNCIATION_HEAD}\n`;
  let used = head.length;
  const kept: string[] = [];
  for (const line of lines) {
    if (used + line.length + 1 > budget) break;
    kept.push(line);
    used += line.length + 1;
  }
  return kept.length ? `${head}${kept.join("\n")}\n` : "";
}

let held: { at: number; map: Map<string, string[]> } = { at: 0, map: new Map() };

/**
 * The recordings the person has approved, as the evidence of how each word comes out: one word's own
 * name and the way that recording of it was written down. Only an approved recording is read — one
 * still waiting for approval is heard by nobody — and the readings are held while nothing new is
 * approved, so a call does not read them again on every turn.
 */
export async function recordedEvidence(base44: any): Promise<Map<string, string[]>> {
  const now = Date.now();
  if (held.at && now - held.at < HELD_MS) return held.map;

  try {
    const page = await base44.asServiceRole.entities.VoiceVariant.filter(
      { approved: true },
      { limit: RECORDINGS, fields: ["term", "heard"] }
    );
    const rows = Array.isArray(page) ? page : page?.items || [];
    const map = new Map<string, string[]>();
    rows.forEach((row: any) => {
      const key = clean(row?.term, MAX_TERM).toLowerCase();
      const said = clean(row?.heard, 40);
      if (!key || !said) return;
      map.set(key, [...(map.get(key) || []), said]);
    });
    held = { at: now, map };
    return map;
  } catch (error: any) {
    // the recordings are evidence, never a reason a call fails: what was held stands
    console.error("The approved recordings could not be read:", error?.message);
    return held.map;
  }
}