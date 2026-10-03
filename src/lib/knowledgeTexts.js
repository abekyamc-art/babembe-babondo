/** Long texts the admin saves whole, in the knowledge setup beside the short entries. */
export const WORD_LIMIT = 10000;

// a passage is the unit a question is matched against: small enough to send a few
// of them, large enough to hold one thought of the document
const PASSAGE_MAX = 1200;

export function countWords(text) {
  const found = String(text || "").match(/[\p{L}\p{N}']+/gu);
  return found ? found.length : 0;
}

export function formatLength(words) {
  const count = Number(words) || 0;
  return `${count.toLocaleString()} ${count === 1 ? "word" : "words"}`;
}

export function emptyText() {
  return { title: "", text: "", file_uri: "" };
}

export function isCompleteText(draft) {
  return !!String(draft?.title || "").trim() && !!String(draft?.text || "").trim();
}

/** Plain text files are taken as they are; anything else is lifted out by the app. */
export function isPlainTextFile(file) {
  const name = (file?.name || "").toLowerCase();
  if ((file?.type || "").startsWith("text/")) return true;
  return /\.(txt|md|markdown|csv)$/.test(name);
}

/** A block longer than a passage is cut at its sentence ends, never mid-word. */
function unitsOf(block) {
  if (block.length <= PASSAGE_MAX) return [block];
  const parts = block.split(/([.!?])\s+/);
  const sentences = [];
  for (let i = 0; i < parts.length; i += 2) {
    const piece = `${parts[i]}${parts[i + 1] || ""}`.trim();
    if (piece) sentences.push(piece);
  }

  const units = [];
  let current = "";
  sentences.forEach((sentence) => {
    if (current && current.length + sentence.length + 1 > PASSAGE_MAX) {
      units.push(current);
      current = "";
    }
    if (sentence.length <= PASSAGE_MAX) {
      current = current ? `${current} ${sentence}` : sentence;
      return;
    }
    // a run with no sentence end at all is cut plainly, in place
    for (let i = 0; i < sentence.length; i += PASSAGE_MAX) {
      units.push(sentence.slice(i, i + PASSAGE_MAX));
    }
  });
  if (current) units.push(current);
  return units;
}

/**
 * The document as the passages it is answered from: cut on its paragraph breaks
 * when it is saved, so no question ever reads the whole document.
 */
export function splitPassages(text) {
  const units = [];
  String(text || "")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .forEach((block) => units.push(...unitsOf(block)));

  const passages = [];
  let current = "";
  units.forEach((unit) => {
    const joined = current ? `${current} ${unit}` : unit;
    if (current && joined.length > PASSAGE_MAX) {
      passages.push(current);
      current = unit;
      return;
    }
    current = joined;
  });
  if (current) passages.push(current);
  return passages;
}