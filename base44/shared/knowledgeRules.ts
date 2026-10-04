/**
 * The admin's own rules, saved in the knowledge panel as a text. Both AIs read them: the
 * assistant carries the rule book ahead of the rest of its knowledge, and the Rap Studio's
 * writer obeys it on every take.
 */

// a text whose title mentions rules is the rule book
const RULE_TITLE = /(rule|sheria|kanuni)/i;
// one paste is kept as several parts of one document
const PART = /\(part (\d+) of (\d+)\)/i;
const MAX_TEXTS = 50;
// The whole book is handed over, its reading key and its tense tables included. This cap only
// guards against a runaway paste; the rule the admin states at the head of the guide holds:
// the newest rule book replaces every older version.
const MAX_RULES = 24000;

/** The book a rule text belongs to: the pasted parts of one document share its title. */
function bookOf(title: any): string {
  return String(title || "")
    .replace(PART, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Which part of a kept paste a rule text is; 1 for a document saved whole. */
function partOf(title: any): number {
  const found = String(title || "").match(PART);
  return found ? Number(found[1]) || 1 : 1;
}

/** The rule book in force, whole: the newest one the admin saved, and when it was pasted in
 *  parts they are read from the beginning of the document. Read by both AIs — the assistant
 *  ahead of every other kind of knowledge, the writer of every take. */
export async function rulesText(base44: any): Promise<string> {
  try {
    const page = await base44.asServiceRole.entities.KnowledgeText.filter(
      {},
      { sort: "-created_date", limit: MAX_TEXTS, fields: ["title", "text"] }
    );
    const books = (page?.items || []).filter((row: any) => RULE_TITLE.test(String(row?.title || "")));
    if (!books.length) return "";

    // the newest rule book is the one in force; an older one is never leaned on again
    const newest = bookOf(books[0]?.title);
    const parts = books
      .filter((row: any) => bookOf(row?.title) === newest)
      .sort((a: any, b: any) => partOf(a?.title) - partOf(b?.title));

    const lines: string[] = [];
    let size = 0;

    parts.forEach((row: any) => {
      String(row?.text || "")
        .split(/\r?\n/)
        .forEach((raw: string) => {
          const line = raw.replace(/\s+/g, " ").trim();
          if (!line) return;
          if (size + line.length + 1 > MAX_RULES) return;
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