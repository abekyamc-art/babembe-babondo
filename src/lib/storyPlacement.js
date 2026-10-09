import { storyBlocks, stripStoryMarks } from "@/lib/storyMarks";
import { youtubeVideo } from "@/lib/youtube";

/**
 * Where every picture, video, audio recording and link stands inside a story.
 *
 * The telling is the spine: its own lines, top to bottom. Everything the admin gave the story stands
 * among those lines, and there are three ways a thing gets there — all of them read here, so the
 * screen, the studio and the assistant agree on where a thing stands:
 *
 *   · a mark written into the telling — `[[image:…]]`, `[[video:…]]`, `[[audio:…]]`, `[[link:…]]` —
 *     which stands exactly where it was typed, between the words around it;
 *   · an address simply written into a line, which is read for what it carries and stands at that
 *     very point — a YouTube address becomes a player, a picture address a picture — instead of
 *     falling to the end of the story as a stray line of text;
 *   · a thing added from the panel, which keeps the count of the story's lines it stands after, so it
 *     is the admin's own chosen place and stays there however the telling is edited afterwards.
 *
 * A story written before any of this keeps its one attachment where it stood, and at its own end
 * when it was never given a place.
 */

const KINDS = ["image", "video", "audio", "link"];

// An address written into a line: the full one, or the short YouTube form people paste without its
// scheme — with the punctuation that ends the sentence left out of the address itself.
const ADDRESS_RE =
  /(?:https?:\/\/[^\s<>()[\]"]+)|(?:(?:www\.|m\.)?(?:youtube\.com|youtu\.be|youtube-nocookie\.com)\/[^\s<>()[\]"]+)/gi;

/** What an address carries, so it is drawn as the thing it is. */
export function kindOfLink(url) {
  // a YouTube address is a video, played right inside the story and never sent away
  if (youtubeVideo(url)) return "video";
  if (/\.(png|jpe?g|gif|webp|avif|bmp)(\?|#|$)/i.test(url)) return "image";
  if (/\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(url)) return "video";
  if (/\.(mp3|wav|m4a|aac|ogg|oga|opus|flac)(\?|#|$)/i.test(url)) return "audio";
  return "link";
}

/** What kind of thing a chosen file is, so the story knows how to show it. */
export function kindOfFile(type) {
  return type?.startsWith("video") ? "video" : type?.startsWith("audio") ? "audio" : "image";
}

/** A pasted address, given the scheme it is missing. */
export function withScheme(value) {
  const link = String(value || "").trim();
  if (!link) return "";
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}

/** The telling's own lines: the units a thing added from the panel stands among. */
export function storyLines(text) {
  return String(text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** One line as it reads on screen: its marks taken out, so a line is never shown as `[[image:…]]`. */
export function lineLabel(line) {
  const said = stripStoryMarks(String(line || ""))
    .replace(/\s+/g, " ")
    .trim();
  return said || "an attachment";
}

/**
 * One thing a story carries, as it is kept and read back: what it is, where it stands, and what it is
 * called. A thing with no kind, or with neither an address nor a held file, is nothing at all.
 */
function thingOf(raw) {
  const kind = KINDS.includes(raw?.kind) ? raw.kind : "";
  if (!kind) return null;

  const url = String(raw?.url || "").trim();
  const uri = String(raw?.uri ?? raw?.file_uri ?? "").trim();
  if (!url && !uri) return null;

  const held = raw?.after;
  const spot =
    held === null || held === undefined || held === "" ? null : Math.floor(Number(held));

  return {
    kind,
    url,
    uri,
    name: String(raw?.name || "").trim(),
    after: Number.isFinite(spot) && spot >= 0 ? spot : null,
  };
}

/** The things the admin added from the panel, in the order they were added. */
export function storyMediaItems(story) {
  return (Array.isArray(story?.media) ? story.media : []).map(thingOf).filter(Boolean);
}

/** The one attachment an older story carries, as the same kind of thing. */
export function legacyMedia(story) {
  return thingOf({
    kind: story?.media_kind,
    url: story?.media_url,
    file_uri: story?.media_file_uri,
    after: story?.media_after,
  });
}

/** How many lines a thing stands after, held inside the telling: unset keeps it at the end. */
function placeOf(thing, count) {
  if (thing.after === null) return count;
  return Math.min(thing.after, count);
}

/**
 * The place a thing added from the panel belongs, read off the telling itself: the line that names it
 * — the address written out, or the words of its own name — and how many lines it stands after.
 *
 * A thing no line names comes back with no place at all, so the admin is asked for it plainly instead
 * of being guessed at.
 */
export function suggestAfter(text, entry) {
  const lines = storyLines(text);
  if (!entry || !lines.length) return { after: null, line: "", why: "" };
  const said = lines.map((line) => line.toLowerCase());

  const address = String(entry.url || "").toLowerCase();
  if (address) {
    const written = said.findIndex((line) => line.includes(address));
    if (written >= 0) {
      return { after: written + 1, line: lines[written], why: "the address itself stands there" };
    }
    // a short share link and a full watch page name the same video
    const video = youtubeVideo(entry.url);
    if (video) {
      const id = video.id.toLowerCase();
      const named = said.findIndex((line) => line.includes(id));
      if (named >= 0) {
        return { after: named + 1, line: lines[named], why: "the video itself stands there" };
      }
    }
  }

  // the words of the thing's own name: the name of the uploaded file, or the name the admin gave it
  const words = String(entry.name || "")
    .toLowerCase()
    .replace(/\.[a-z0-9]{1,5}$/i, " ")
    .split(/[^a-z0-9']+/i)
    .filter((word) => word.length >= 4);

  for (const word of words) {
    const named = said.findIndex((line) => line.includes(word));
    if (named >= 0) {
      return { after: named + 1, line: lines[named], why: `the line names “${word}”` };
    }
  }

  return { after: null, line: "", why: "" };
}

/** An address written into the telling, standing exactly where the admin wrote it. */
function addressBlocks(text) {
  const out = [];
  const mark = new RegExp(ADDRESS_RE.source, "gi");
  let last = 0;
  let found;

  while ((found = mark.exec(text))) {
    // the address as it stands in the telling, and the address as it will be opened (a short YouTube
    // form is given its scheme) — the writing keeps its place by the length of what was written
    const written = found[0].replace(/[.,;:!?]+$/, "");
    const url = withScheme(written);
    const before = text.slice(last, found.index).trim();
    if (before) out.push({ type: "text", text: before });
    out.push({ type: "media", kind: kindOfLink(url), url, uri: "" });
    last = found.index + written.length;
  }

  const after = text.slice(last).trim();
  if (after) out.push({ type: "text", text: after });
  return out;
}

/** One line of the telling cut into what is read from top to bottom: its words, and what stands in it. */
function lineBlocks(line) {
  const out = [];

  storyBlocks(line).forEach((block) => {
    if (block.kind === "text") {
      out.push(...addressBlocks(block.text));
      return;
    }
    out.push({
      type: "media",
      kind: block.kind === "link" ? "link" : block.mediaKind,
      url: block.url || "",
      uri: block.uri || "",
    });
  });

  return out;
}

/**
 * The whole story as it is read: its own lines, and everything it carries standing among them at the
 * place each thing was given — a mark inside a line, an address written in a line, or a thing added
 * from the panel at the line it stands after. Each block is either the telling's own words, or one
 * picture, video, audio recording or link.
 */
export function inlineStory({ text = "", entries = [], legacy = null } = {}) {
  const lines = storyLines(text);
  const things = [...entries, legacy].map(thingOf).filter(Boolean);
  const standing = (index) => things.filter((thing) => placeOf(thing, lines.length) === index);
  const mediaBlock = (thing) => ({
    type: "media",
    kind: thing.kind,
    url: thing.url,
    uri: thing.uri,
  });

  const blocks = [];
  lines.forEach((line, index) => {
    standing(index).forEach((thing) => blocks.push(mediaBlock(thing)));
    lineBlocks(line).forEach((block) => blocks.push(block));
  });
  standing(lines.length).forEach((thing) => blocks.push(mediaBlock(thing)));

  return blocks;
}

/** The face of a story in the strip: the first picture it carries, or the first video. */
export function storyFace(story) {
  const things = [...storyMediaItems(story), legacyMedia(story)].filter(Boolean);
  const picture = things.find((thing) => thing.kind === "image" && thing.url);
  if (picture) return picture;
  const video = things.find((thing) => thing.kind === "video" && thing.url);
  if (video) return video;
  return things.find((thing) => thing.kind === "audio" || thing.kind === "link") || null;
}