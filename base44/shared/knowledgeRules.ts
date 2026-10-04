/**
 * The admin's own rules, saved in the knowledge panel as a text. Both AIs read them: the
 * assistant through the passages it searches, the Rap Studio through this — the lines a
 * rule-titled text carries that are not word entries are handed to the writer to obey.
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
const MAX_TEXTS = 12;
const MAX_LINES = 80;
const MAX_LINE = 200;
const MAX_CHARS = 4000;

// a guide in brackets is never part of a term
const GUIDES = /[[(][^)\]]*[)\]]/g;
// "=", a tab, a colon with room after it or a column gap ends the term of an entry
const SEPARATOR = /[=\t]|\s{2,}|:\s/;

/** Whether a line is an entry — a word with its meaning — rather than a rule. */
function entryLine(line: string): boolean {
  const bare = line.replace(GUIDES, " ").replace(/\s+/g, " ").trim();
  const at = bare.search(SEPARATOR);
  if (at < 0) return false;
  const term = clean(bare.slice(0, at).replace(/[=:\t\s]+$/, ""), MAX_TERM);
  const meaning = clean(bare.slice(at).replace(/^[=:\t\s]+/, ""), MAX_MEANING);
  return isWordEntry(term, glossOf(term, meaning));
}

/** One line of a rule book: a line that is not an entry of its own, carries no "=" and
 *  really is written. A bare word, a page marker or a run of punctuation is not a rule. */
function ruleLine(line: string): boolean {
  if (!line || line.length > MAX_LINE) return false;
  if (line.includes("=") || line.includes("\t")) return false;
  if (line.replace(/[^\p{L}]/gu, "").length < 3) return false;
  if (!/\s/.test(line) && line.length < 30) return false;
  return !entryLine(line);
}

/** The rules the admin saved, as the lines both AIs obey. Read from the rule-titled texts,
 *  newest first, and kept to a size one take can carry. */
export async function rulesText(base44: any): Promise<string> {
  try {
    const page = await base44.asServiceRole.entities.KnowledgeText.filter(
      {},
      { sort: "-created_date", limit: MAX_TEXTS, fields: ["title", "text"] }
    );

    const lines: string[] = [];
    let size = 0;

    (page?.items || []).forEach((row: any) => {
      if (!RULE_TITLE.test(String(row?.title || ""))) return;
      String(row?.text || "")
        .split(/\r?\n/)
        .forEach((raw: string) => {
          const line = raw.replace(/\s+/g, " ").trim();
          if (!ruleLine(line)) return;
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