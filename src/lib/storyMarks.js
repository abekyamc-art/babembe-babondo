/**
 * The marks a story's text carries.
 *
 * A picture, a video, an audio recording or a link the admin puts into a story is written into the
 * telling itself, as a mark standing exactly where they put it — `[[image:<file>]]`, `[[video:…]]`,
 * `[[audio:…]]` or `[[link:<address>]]`. The telling keeps the order, so what is saved is read back
 * the same way on every screen, and the admin can put as many of them into one story as they like.
 */

// One mark inside the telling: what it is, and what it carries — an uploaded file's own reference,
// or an address the admin pasted.
const MARK_RE = /\[\[(image|video|audio|link):([^\]]+)\]\]/g;

const isAddress = (value) => /^https?:\/\//i.test(String(value || ""));

/** The mark for a picture, a video or an audio recording: an uploaded file, or an address. */
export function mediaMark(kind, value) {
  return `[[${kind}:${String(value || "").trim()}]]`;
}

/** The mark for a link, which is opened where it already stands. */
export function linkMark(url) {
  return `[[link:${String(url || "").trim()}]]`;
}

/**
 * The telling cut into what is read from top to bottom: its own lines, and the pictures, videos,
 * audio recordings and links standing between them, in the very order they were put in.
 */
export function storyBlocks(text) {
  const blocks = [];
  const mark = new RegExp(MARK_RE.source, "g");

  for (const raw of String(text ?? "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    let last = 0;
    let found;
    while ((found = mark.exec(line))) {
      const before = line.slice(last, found.index).trim();
      if (before) blocks.push({ kind: "text", text: before });

      const value = found[2].trim();
      if (found[1] === "link") {
        blocks.push({ kind: "link", url: value });
      } else {
        blocks.push({
          kind: "media",
          mediaKind: found[1],
          uri: isAddress(value) ? "" : value,
          url: isAddress(value) ? value : "",
        });
      }
      last = found.index + found[0].length;
    }

    const after = line.slice(last).trim();
    if (after) blocks.push({ kind: "text", text: after });
  }

  return blocks;
}

/** What the telling carries, counted by kind, so the studio's list can say it at a glance. */
export function storyMarkCounts(text) {
  const counts = { image: 0, video: 0, audio: 0, link: 0 };
  const mark = new RegExp(MARK_RE.source, "g");
  let found;
  while ((found = mark.exec(String(text ?? "")))) {
    if (counts[found[1]] !== undefined) counts[found[1]] += 1;
  }
  return counts;
}

/** The telling alone, without the marks: what the admin's list shows, and what the assistant reads. */
export function stripStoryMarks(text) {
  return String(text ?? "")
    .replace(MARK_RE, " ")
    .split("\n")
    .map((line) => line.replace(/\s{2,}/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}