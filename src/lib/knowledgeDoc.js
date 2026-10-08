/**
 * The knowledge document on screen: finding a thing in it, and knowing where it stands.
 *
 * The document is written under its own headings, and a search has to say where a match came from —
 * which part of the document it belongs to — so the admin can read it in its own place and edit it
 * there. The rule for what a heading is mirrors the one the server reads the document by.
 */

/**
 * How much the document takes, in characters. It is the same ceiling the server keeps: a document
 * larger than this is one no AI could read in a turn, so an import is bounded by it — a longer file
 * is written in up to this point, and the file itself is kept beside it for the admin.
 */
export const DOC_MAX = 600000;

const NAMES = [
  /^(?:the )?(?:words?|phrases?|rules?|knowledge|word list|vocabulary|grammar|reading|reading key|notes?|questions?|questions and answers|maarifa|maelezo|maswali|maneno|misemo|sheria|kanuni|sarufi|matamshi)$/i,
];

/** Whether a line opens a part of the document rather than being a thing inside one. */
export function isDocHeading(line) {
  const raw = String(line || "").trim();
  if (!raw || raw.length > 48) return false;
  const hashed = raw.match(/^#{1,6}\s*(.+?)\s*#*$/);
  const name = (hashed ? hashed[1] : raw).replace(/[:.\s]+$/, "").trim();
  if (!name) return false;
  if (!hashed && (name.includes('="') || name.includes("=") || name.includes("|"))) return false;
  if (NAMES.some((shape) => shape.test(name))) return true;
  if (hashed) return true;
  const letters = name.replace(/[^\p{L}]/gu, "");
  return letters.length >= 3 && name === name.toUpperCase() && letters !== letters.toLowerCase();
}

/** The name a heading carries, as the panel shows it above a match. */
export function headingName(line) {
  return String(line || "")
    .trim()
    .replace(/^#{1,6}\s*/, "")
    .replace(/[:.\s]+$/, "")
    .trim();
}

/**
 * Where what the admin is looking for stands in the document: the part it belongs to, the line it
 * was found on, and the exact place of the match, so the editor can be opened at it.
 */
export function findInDoc(text, term, limit = 40) {
  const wanted = String(term || "").trim().toLowerCase();
  if (wanted.length < 2) return [];

  const hits = [];
  let heading = "";
  let at = 0;

  for (const line of String(text || "").split("\n")) {
    const start = at;
    at += line.length + 1;

    if (isDocHeading(line)) {
      heading = headingName(line);
      continue;
    }

    const found = line.toLowerCase().indexOf(wanted);
    if (found < 0) continue;

    hits.push({
      heading: heading || "The document",
      line: line.trim(),
      index: start + found,
      length: wanted.length,
    });
    if (hits.length >= limit) break;
  }

  return hits;
}

/** How much the document holds, said in the panel: the words it names and the rules it states. */
export function countDoc(text) {
  const body = String(text || "");
  let words = 0;
  let rules = 0;
  let section = "";

  for (const line of body.split("\n")) {
    if (isDocHeading(line)) {
      const name = headingName(line).toLowerCase();
      section = /rule|sheria|kanuni|grammar|reading|matamshi/.test(name)
        ? "rules"
        : /words?|maneno|phrases?|misemo|vocabulary/.test(name)
          ? "words"
          : "other";
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("(")) continue;
    if (section === "words") words += 1;
    if (section === "rules") rules += 1;
  }

  return { words, rules };
}