import { base44 } from "@/api/base44Client";

/**
 * The admin's own stories, on the app's side.
 *
 * A story is the admin's own telling with its filing words, one picture, video or link, and any
 * links they attached. The admin writes it in the knowledge panel; a person meets it on screen when
 * a call or a written chat turns to what they wrote.
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
    published: true,
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
    published: row?.published !== false,
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
    published: draft?.published !== false,
  };
}

export function isCompleteStory(draft) {
  return !!(String(draft?.title || "").trim() && String(draft?.text || "").trim());
}

const MEDIA_NAMES = { none: "", image: "Picture", video: "Video", link: "Link" };

export function storyHeadline(row) {
  return row?.title || "";
}

/** What the admin's list shows under a title: how the story is filed, what it carries, and its own first words. */
export function storyBody(row) {
  const tags = Array.isArray(row?.tags) ? row.tags.join(", ") : "";
  const media = MEDIA_NAMES[row?.media_kind] || "";
  const links = Array.isArray(row?.links) ? row.links.length : 0;
  const state = row?.published === false ? "Draft" : "Published";
  const about = [tags, media, links ? `${links} link${links > 1 ? "s" : ""}` : "", state]
    .filter(Boolean)
    .join(" · ");
  const words = String(row?.text || "").replace(/\s+/g, " ").slice(0, 140);
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
 * Where a story's own picture or video is opened from. An uploaded one lives in the app's private
 * storage, so it is opened through a short-lived link that only this device is given; a link the
 * admin pasted is opened where it already stands.
 */
export async function storyMediaUrl(story) {
  if (!story) return "";
  if (story.media_url) return story.media_url;
  if (!story.media_file_uri) return "";
  try {
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri: story.media_file_uri,
    });
    return signed_url || "";
  } catch (err) {
    return "";
  }
}