// one contextual update carries this much of a note; a longer note is handed
// over as several of them
const CONTEXT_BLOCK = 4000;

/**
 * A long note cut into the blocks one contextual update carries, so a whole
 * vocabulary rides along without any single update being oversized.
 */
export function contextBlocks(text) {
  const raw = String(text || "");
  const blocks = [];
  let at = 0;

  while (at < raw.length) {
    let end = Math.min(raw.length, at + CONTEXT_BLOCK);
    if (end < raw.length) {
      // break between entries where one is there, so a word is never cut in half
      const cut = raw.lastIndexOf("\n", end);
      if (cut > at + CONTEXT_BLOCK / 2) end = cut + 1;
    }
    blocks.push(raw.slice(at, end));
    at = end;
  }
  return blocks;
}