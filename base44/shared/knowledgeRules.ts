/**
 * The admin's own rules, saved in the knowledge panel as a text. Both AIs read them: the
 * assistant through the passages it searches, the Rap Studio through this — the lines a
 * rule-titled text carries about how the language is used are handed to the writer to obey.
 */

import {
  MAX_MEANING,
  MAX_TERM,
  clean,
  glossOf,
  isWordEntry,
} from "./knowledgeWords.ts";

// a text whose title mentions rules is the rule book; the document the words panel keeps
// its plurals and rules in is titled that way too
const RULE_TITLE = /(rule|sheria|kanuni)/i;
// one paste is kept as several parts of one document
const PART = /\(part \d+ of \d+\)/i;
const MAX_TEXTS = 12;
const MAX_LINES = 80;
const MAX_LINE = 200;
const MAX_CHARS = 4000;

// a guide in brackets is never part of a term
const GUIDES = /[[(][^)\]]*[)\]]/g;
// "=", a tab, a colon with room after it or a column gap ends the term of an entry
const SEPARATOR = /[=\t]|\s{2,}|:\s/;
// a rule says something about how the language is used — how it is spelled, heard, counted,
// chosen or put together. A line of spellings and variants says none of that and never
// shapes a take.
const RULE_WORDS =
  /\b(use|used|say|says|write|written|read|spell|spelling|pronounce|never|always|must|do not|don't|prefer|choose|select|compare|check|add|keep|preserve|replace|capitali[sz]|hyphen|plural|singular|tense|number|meaning|means|similar|confirmed|correction|correct|rule|vocabulary|order|initial|conversation|question|answer|word|words)\b/i;

/** Whether a line is an entry — a word with its meaning — rather than a rule. */
function entryLine(raw: string): boolean {
  const at = raw.search(SEPARATOR);
  if (at < 0) return false;
  const term = clean(raw.slice(0, at).replace(/[=:\t\s]+$/, "").replace(GUIDES, " "), MAX_TERM);
  const meaning = clean(raw.slice(at).replace(/^[=:\t\s]+/, ""), MAX_MEANING);
  return isWordEntry(term, glossOf(term, meaning));
}

/** One line of a rule book: a line that is not an entry of its own, carries no "=", really is
 *  written, and says something about how the language is used. A bare word, a page marker or a
 *  run of spellings is not a rule. */
function ruleLine(raw: string, line: string): boolean {
  if (!line || line.length > MAX_LINE) return false;
  if (line.includes("=") || raw.includes("\t")) return false;
  if (line.replace(/[^\p{L}]/gu, "").length < 3) return false;
  if (!/\s/.test(line) && line.length < 30) return false;
  if (!RULE_WORDS.test(line)) return false;
  return !entryLine(raw);
}

/** The rule books in the order one is read: a rule book saved on its own first — the newest
 *  of them ahead of the older — then the parts of a pasted document from its beginning. */
function inOrder(rows: any[]): any[] {
  const whole: any[] = [];
  const parts: any[] = [];
  rows.forEach((row: any) => {
    if (PART.test(String(row?.title || ""))) parts.push(row);
    else whole.push(row);
  });
  return [...whole, ...parts.reverse()];
}

/** The rules the admin saved, as the lines both AIs obey. Read from the rule-titled texts and
 *  kept to a size one take, or one answer, can carry. */
export async function rulesText(base44: any): Promise<string> {
  try {
    const page = await base44.asServiceRole.entities.KnowledgeText.filter(
      {},
      { sort: "-created_date", limit: MAX_TEXTS, fields: ["title", "text"] }
    );
    const books = inOrder((page?.items || []).filter((row: any) => RULE_TITLE.test(String(row?.title || ""))));

    const lines: string[] = [];
    let size = 0;

    books.forEach((row: any) => {
      String(row?.text || "")
        .split(/\r?\n/)
        .forEach((raw: string) => {
          const line = raw.replace(/\s+/g, " ").trim();
          if (!ruleLine(raw, line)) return;
          if (lines.length >= MAX_LINES || size + line.length > MAX_CHARS) return;
          size += line.length + 1;
          lines.push(line);
        });
    });

    return lines.join("\n");
  } catch (error: any) {
    console.error("Rules could not be read:", error?.message);
    return "";
  }
}