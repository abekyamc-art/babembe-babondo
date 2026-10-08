/**
 * A YouTube address, read for the video it points at.
 *
 * An admin can paste any of the addresses YouTube hands out — a watch page, a short share link, a
 * Shorts line, an embed — and the same video is found in all of them. What comes back is everything
 * the app needs to play it in place: the video's id, its own cover picture, the address it is played
 * from inside the app, and the address that opens it on YouTube.
 */

// The shapes YouTube addresses come in. Each one carries the video's eleven-character id.
const SHAPES = [
  /youtu\.be\/([A-Za-z0-9_-]{11})/i,
  /[?&]v=([A-Za-z0-9_-]{11})/i,
  /\/shorts\/([A-Za-z0-9_-]{11})/i,
  /\/embed\/([A-Za-z0-9_-]{11})/i,
  /\/live\/([A-Za-z0-9_-]{11})/i,
];

const YOUTUBE_HOST = /^(?:https?:\/\/)?(?:[a-z0-9-]+\.)*(?:youtube\.com|youtu\.be|youtube-nocookie\.com)\//i;

/** The video a YouTube address points at, or null when the address is not one. */
export function youtubeVideo(url) {
  const value = String(url || "").trim();
  if (!value || !YOUTUBE_HOST.test(value)) return null;

  for (const shape of SHAPES) {
    const found = value.match(shape);
    if (!found) continue;
    const id = found[1];
    return {
      id,
      cover: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      // sound is left on: the player is only ever opened by a tap, so it may speak straight away
      embed: `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0`,
      watch: `https://www.youtube.com/watch?v=${id}`,
    };
  }

  return null;
}