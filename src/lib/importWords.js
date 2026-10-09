/**
 * What an imported package turns into: the word lines of the knowledge document.
 *
 * The document is one text, and a word stands in it as its own line — the word, the reading that is
 * the voice's alone, and what it means. A word that is already written there is not written twice:
 * its line is replaced where it stands, so an update to a word the document already holds takes the
 * place of the old one instead of standing beside it. A word that is new is written under its own
 * heading — the words, or the phrases — and where the document has no such heading yet, one is made.
 */
import { isDocHeading } from "@/lib/knowledgeDoc";

const WORDS_HEAD =
  /^(?:the )?(?:words?|word list|vocabulary|maneno|maneno ya ebembe|ebembe words|kibembe words|misamiati)$/i;
const PHRASES_HEAD =
  /^(?:the )?(?:phrases?|expressions?|sayings?|sentences?|proverbs?|misemo|msemo|sentensi|methali)$/i;

/** The word a line is about, as it is compared: brackets and the reading set aside. */
export function termKeyOfLine(line) {
  const raw = String(line || "");
  if (!raw.trim() || isDocHeading(raw)) return "";
  const cut = raw.indexOf("=");
  const left = cut >= 0 ? raw.slice(0, cut) : raw;
  return keyOf(
    left
      .replace(/\([^()]*\)/g, " ")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/[.,;:]+$/, "")
  );
}

export function keyOf(term) {
  return String(term || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function isPhrase(term) {
  return /\s/.test(String(term || "").trim());
}

/** One word as the line the document holds it in. */
export function wordLine(row) {
  const term = String(row?.term || "").trim();
  const guide = String(row?.guide || "").trim();
  const meaning = String(row?.meaning || "").trim();
  const usage = String(row?.usage || "").trim();
  const said = [meaning, usage].filter(Boolean).join(" | ");
  return `${term}${guide ? ` (${guide})` : ""}${said ? ` = ${said}` : ""}`;
}

function headingName(line) {
  const raw = String(line || "").trim();
  const hashed = raw.match(/^#{1,6}\s*(.+?)\s*#*$/);
  return (hashed ? hashed[1] : raw).replace(/[:.\s]+$/, "").trim().toLowerCase();
}

function headingAt(lines, shape) {
  return lines.findIndex((line) => isDocHeading(line) && shape.test(headingName(line)));
}

/** Where a part of the document ends: the line before the next heading, blank lines set aside. */
function endOfSection(lines, head) {
  let at = lines.length;
  for (let i = head + 1; i < lines.length; i += 1) {
    if (isDocHeading(lines[i])) {
      at = i;
      break;
    }
  }
  while (at > head + 1 && !lines[at - 1].trim()) at -= 1;
  return at;
}

/** The words written into the document: what was added, and what took the place of a line already there. */
export function mergeWords(draft, entries) {
  const lines = String(draft || "").split("\n");
  const rows = (Array.isArray(entries) ? entries : []).filter((row) => String(row?.term || "").trim());
  const fresh = [];
  let added = 0;
  let updated = 0;

  rows.forEach((row) => {
    const line = wordLine(row);
    const key = keyOf(row.term);
    const at = lines.findIndex((candidate) => termKeyOfLine(candidate) === key);
    if (at >= 0) {
      if (lines[at].trim() !== line) {
        lines[at] = line;
        updated += 1;
      }
      return;
    }
    fresh.push({ line, phrase: isPhrase(row.term) });
  });

  [
    [WORDS_HEAD, false],
    [PHRASES_HEAD, true],
  ].forEach(([shape, phrase]) => {
    const batch = fresh.filter((row) => row.phrase === phrase).map((row) => row.line);
    if (!batch.length) return;
    const head = headingAt(lines, shape);
    if (head < 0) {
      if (lines.length && lines[lines.length - 1].trim()) lines.push("");
      lines.push(phrase ? "# PHRASES" : "# WORDS", ...batch);
    } else {
      lines.splice(endOfSection(lines, head), 0, ...batch);
    }
    added += batch.length;
  });

  return { text: lines.join("\n"), added, updated };
}

/** Every picture mark taken out of a text, so what is written in holds only words. */
export function stripMarks(text) {
  return String(text || "")
    .replace(/\[\[\s*image\s*:[^\]]*\]\]/gi, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+$/gm, "");
}

/** A whole file's text added below what the working copy already holds. */
export function appendText(draft, text) {
  const body = stripMarks(text).replace(/\s+$/, "");
  if (!body) return String(draft || "");
  const base = String(draft || "").replace(/\s+$/, "");
  return base ? `${base}\n\n${body}` : body;
}