import { base44 } from "@/api/base44Client";
import { stripStoryMarks } from "@/lib/storyMarks";

/**
 * The admin's own stories, on the app's side.
 *
 * A story is the admin's own telling with its filing words, one picture, video, audio recording or
 * link, and any links they attached. The admin writes it in the knowledge panel; a person meets it
 * on screen when a call or a written chat turns to what they wrote.
 */

/** The blank story the admin starts from. Tags and links are typed as lines, as in the rest of the panel. */
export function emptyStory() {
  return {
    title: "",
    text: "",
    tags: "",
    media_kind: "none",
    media_url: "",
    media_file_uri: "",
    links: "",
    channel: "",
    artist_links: [],
    published: true,
    // where the attached thing stands in the telling; unset keeps it at the end, as every story did
    media_after: null,
  };
}

/** A saved story as the form writes it back: the lists become the lines they were typed as. */
export function storyDraft(row) {
  return {
    title: row?.title || "",
    text: row?.text || "",
    tags: (Array.isArray(row?.tags) ? row.tags : []).join(", "),
    media_kind: row?.media_kind || "none",
    media_url: row?.media_url || "",
    media_file_uri: row?.media_file_uri || "",
    links: (Array.isArray(row?.links) ? row.links : []).join("\n"),
    channel: row?.channel_url || "",
    artist_links: (Array.isArray(row?.artist_links) ? row.artist_links : [])
      .map((entry) => ({ name: entry?.name || "", url: entry?.url || "" }))
      .filter((entry) => entry.url),
    published: row?.published !== false,
    media_after: row?.media_after ?? null,
  };
}

/** What is stored for a story: the typed lines become the lists the assistant and the screen read. */
export function storyFields(draft) {
  return {
    title: String(draft?.title || "").trim(),
    text: String(draft?.text || "").trim(),
    tags: String(draft?.tags || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    media_kind: draft?.media_kind || "none",
    media_url: String(draft?.media_url || "").trim(),
    media_file_uri: String(draft?.media_file_uri || "").trim(),
    links: String(draft?.links || "")
      .split("\n")
      .map((link) => link.trim())
      .filter(Boolean),
    channel_url: String(draft?.channel || "").trim(),
    artist_links: (Array.isArray(draft?.artist_links) ? draft.artist_links : [])
      .map((entry) => ({
        name: String(entry?.name || "").trim(),
        url: String(entry?.url || "").trim(),
      }))
      .filter((entry) => entry.url),
    published: draft?.published !== false,
    // the spot the attached thing was placed at, kept as the count of lines it stands after
    media_after:
      draft?.media_after === null || draft?.media_after === undefined
        ? null
        : Number(draft.media_after),
  };
}

export function isCompleteStory(draft) {
  return !!(String(draft?.title || "").trim() && String(draft?.text || "").trim());
}

const MEDIA_NAMES = { none: "", image: "Picture", video: "Video", audio: "Audio", link: "Link" };

export function storyHeadline(row) {
  return row?.title || "";
}

/** What the admin's list shows under a title: how the story is filed, what it carries, and its own first words. */
export function storyBody(row) {
  const tags = Array.isArray(row?.tags) ? row.tags.join(", ") : "";
  const media = MEDIA_NAMES[row?.media_kind] || "";
  const links = Array.isArray(row?.links) ? row.links.length : 0;
  const videos = Array.isArray(row?.artist_links) ? row.artist_links.length : 0;
  const channel = row?.channel_url ? "channel" : "";
  const state = row?.published === false ? "Draft" : "Published";
  const about = [
    tags,
    media,
    videos ? `${videos} video${videos > 1 ? "s" : ""}` : "",
    channel,
    links ? `${links} link${links > 1 ? "s" : ""}` : "",
    state,
  ]
    .filter(Boolean)
    .join(" · ");
  const words = stripStoryMarks(row?.text).replace(/\s+/g, " ").slice(0, 140);
  return [about, words].filter(Boolean).join(" — ");
}

/** The host of a link, which is the name it is shown under. */
export function hostOf(url) {
  try {
    return new URL(String(url || "")).hostname.replace(/^www\./, "");
  } catch (err) {
    return String(url || "");
  }
}

/**
 * The admin's own story for a turn: the nearest one they saved, or null when none of them is what
 * was asked for. The matching runs on the server, so nothing of the saved library comes down to
 * the device beyond the one story that was asked for.
 */
export async function findStory(query) {
  const asked = String(query || "").trim();
  if (!asked) return null;
  try {
    const res = await base44.functions.invoke("storyLookup", { query: asked });
    return res?.data?.story || null;
  } catch (err) {
    return null;
  }
}

/**
 * Which gap of the telling the attached thing stands in: 0 in front of it, 1 after its first line,
 * and so on up to the line count, which is the end. A story that has never been given a spot keeps
 * its attachment at the end, exactly where it stood before.
 */
export function mediaPlacement(story, count) {
  const after = story?.media_after;
  if (after === null || after === undefined || after === "") return count;
  const spot = Number(after);
  if (!Number.isFinite(spot) || spot < 0) return count;
  return Math.min(spot, count);
}