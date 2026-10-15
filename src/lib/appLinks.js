/**
 * Every web address the app hands out is built here, in one place. A link that leaves the app is
 * opened somewhere else — a chat, a post, a browser — so it has to point at the app itself and not
 * at wherever it happened to be built.
 */

// The app as it is published. A link built while the app is being looked at inside the builder's own
// preview would otherwise carry the preview's address, which opens nothing for anyone else.
const PUBLISHED_ORIGIN = "https://babembegs.base44.app";

/** The address a shared link should carry: this app's own, and never a preview's. */
export function appOrigin() {
  const { origin, hostname } = window.location;
  const preview =
    window.self !== window.top || /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(hostname);
  return preview ? PUBLISHED_ORIGIN : origin;
}

/** One reel's own address, which opens straight on that reel. */
export function reelLink(id) {
  return `${appOrigin()}/reels?reel=${encodeURIComponent(id)}`;
}

/** One person's profile address. */
export function profileLink(email) {
  return `${appOrigin()}/u/${encodeURIComponent(email || "")}`;
}

/** What a shared reel says about itself before it is opened. */
export function reelShareText(reel) {
  const handle = reel?.author_username ? `@${reel.author_username}` : "A reel";
  const caption = String(reel?.caption || "").replace(/\s+/g, " ").trim();
  return caption
    ? `${handle} on Babembe Babondo GS: ${caption}`
    : `${handle} on Babembe Babondo GS`;
}

/** Copying, on a browser that closes its clipboard to the page. */
function legacyCopy(text) {
  try {
    const box = document.createElement("textarea");
    box.value = text;
    box.setAttribute("readonly", "");
    box.style.position = "fixed";
    box.style.top = "-1000px";
    box.style.opacity = "0";
    document.body.appendChild(box);
    box.select();
    const done = document.execCommand("copy");
    document.body.removeChild(box);
    return done;
  } catch (err) {
    return false;
  }
}

/** The link into the clipboard, and whether it got there. */
export async function copyLink(url) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
  } catch (err) {
    // the clipboard is closed to this page — a frame, or a browser wanting a different gesture — so
    // the older way of copying is tried before giving up
  }
  return legacyCopy(url);
}

/**
 * Handing the link on: the phone's own share sheet where it can be opened, and the link copied
 * where it cannot. A tap always ends with either a sheet or a link, never with nothing.
 * Returns "shared", "copied", "dismissed" (the sheet was closed on purpose) or "failed".
 */
export async function shareLink({ title, text, url }) {
  // a share sheet belongs to the phone itself and never opens from inside a frame, so where the app
  // is being looked at inside one the link is copied instead of a tap that quietly does nothing
  const sheet = typeof navigator.share === "function" && window.self === window.top;
  if (sheet) {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (err) {
      if (err?.name === "AbortError") return "dismissed";
    }
  }
  return (await copyLink(url)) ? "copied" : "failed";
}