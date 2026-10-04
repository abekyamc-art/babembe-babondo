/**
 * The lines of a pasted list, read as three separate things: the spelling, the
 * meaning and the pronunciation guide. A guide is written either between brackets
 * — "ole bile (oh-leg-bile)" — or as syllables joined by dashes, and it belongs in
 * nobody's eyes or ears but the assistant's: it is held apart from the word and is
 * never written or said to anyone.
 */

const BRACKETS = /[([][^)\]]*[)\]]/g;
const SYLLABLES = /\b[a-z]{1,6}(?:-[a-z]{1,6}){2,}\b/gi;
// "=", a tab or a column gap ends the word; ":" and a spaced dash are trusted only
// for a line that already reads like an entry
const STRONG = /[=\t]|\s{2,}/;
const WEAK = /:|\s[-–—]\s/;

/** A guide written between brackets, and nothing else: syllables joined by dashes. */
export function isGuide(value) {
  return /^[a-z]{1,6}(?:-[a-z]{1,6})+\s*[.;,]?\s*$/i.test(String(value || "").trim());
}

/** The line without its guides; every guide found is handed back in `found`. */
function takeGuides(line, found) {
  return String(line || "")
    .replace(BRACKETS, (whole) => {
      const inside = whole.slice(1, -1).trim();
      if (isGuide(inside)) found.push(inside);
      return " ";
    })
    .replace(SYLLABLES, (whole) => {
      found.push(whole);
      return " ";
    })
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

/** What is left of a line once its guides are out — the part anyone may see. */
export function plainText(value) {
  return takeGuides(value, [])
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** A word or a short expression, rather than a rule that happens to carry a separator. */
function isWord(term) {
  const text = String(term || "").trim();
  if (!text || text.length > 40) return false;
  if (!/\p{L}/u.test(text)) return false;
  if (/^\d+\s*[.)]/.test(text)) return false;
  if (!/^[\p{L}\p{N}'’/&.\- ]+$/u.test(text)) return false;
  return text.split(/\s+/).filter(Boolean).length <= 3 && !/[.!?]\s/.test(text);
}

/**
 * One line of a paste: the word, the guide only the assistant hears, and the
 * meaning. A line that is not an entry — a plural, a rule, a heading, a page
 * marker — comes back as `other`, so it is kept as a document instead of being
 * saved as a word with no meaning.
 */
export function readPasteLine(line) {
  const raw = String(line || "").trim();
  if (!raw) return { kind: "other", line: raw };

  const guides = [];
  const rest = takeGuides(raw, guides);
  const guide = guides.join(", ");
  if (!rest) return { kind: "other", line: raw, guide };

  const strong = rest.match(STRONG);
  const found = strong || rest.match(WEAK);
  if (!found) return { kind: "other", line: raw, guide };

  // whichever separator came first, the other one's mark is not left standing in
  // the word or in the meaning
  const term = rest
    .slice(0, found.index)
    .replace(/\s{2,}/g, " ")
    .replace(/[=\t:]+$/, "")
    .trim();
  const meaning = rest
    .slice(found.index + found[0].length)
    .replace(/^[=\t:]+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!isWord(term)) return { kind: "other", line: raw, guide };
  // a word with nothing beside it is not an entry yet: it is kept as a line of the rules
  // document until its meaning is written with it
  if (!meaning) return { kind: "other", line: raw, guide };

  // a colon or a dashed separator is trusted only when the meaning is short enough
  // to be a meaning rather than the next rule of the document
  const room = strong ? 12 : 5;
  if (meaning.length > 120 || meaning.split(/\s+/).filter(Boolean).length > room) {
    return { kind: "other", line: raw, guide };
  }
  return { kind: "word", term, meaning, guide };
}