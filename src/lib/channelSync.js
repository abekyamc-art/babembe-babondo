import { base44 } from "@/api/base44Client";
import { youtubeVideo } from "@/lib/youtube";

/**
 * The artist's channel, kept in step with their story.
 *
 * The videos an artist has published are read from the channel itself on the server, and what comes
 * back is put together with what the story already holds: every entry the admin wrote in themselves
 * stays exactly as they left it, and every entry that came from the channel is replaced by what the
 * channel holds now — so a video the artist has taken down is taken out of the story, and nothing is
 * ever listed twice. A channel that could not be read changes nothing at all.
 */

// How long a reading of a channel is kept before it is read again.
const STALE_MS = 24 * 60 * 60 * 1000;

/** What one entry is, so the same video is never listed twice however its address is written. */
export function videoKey(url) {
  const video = youtubeVideo(url);
  if (video?.id) return `yt:${video.id}`;
  return String(url || "").trim().replace(/\/+$/, "").toLowerCase();
}

/** Whether an entry came from the artist's own channel rather than being written in by the admin. */
export function fromChannel(entry) {
  return entry?.source === "channel";
}

/**
 * What the story holds once the channel has been read: the admin's own entries first, exactly as they
 * are, then the channel's videos in the channel's own order. An entry that was already there and is
 * still published is the channel's entry now, so the next reading keeps it in step.
 */
export function mergeChannelVideos(entries, videos) {
  const kept = (Array.isArray(entries) ? entries : []).filter(
    (entry) => entry?.url && !fromChannel(entry)
  );
  const byKey = new Map(kept.map((entry) => [videoKey(entry.url), entry]));
  const out = [...kept];

  (Array.isArray(videos) ? videos : []).forEach((video) => {
    if (!video?.url) return;
    const key = videoKey(video.url);
    const held = byKey.get(key);
    // How many times the piece has been watched, as the channel itself gave it: the five most
    // watched are the five the story shows. A piece the channel gave no count for keeps nothing and
    // is never ranked above one it did count.
    const views = Number(video.views) > 0 ? Number(video.views) : Number(held?.views) || 0;
    const row = {
      name: String(video.name || held?.name || "").trim(),
      url: String(video.url).trim(),
      source: "channel",
      views,
    };
    if (held) {
      Object.assign(held, row);
      return;
    }
    out.push(row);
    byKey.set(key, row);
  });

  return out;
}

/** A count without a trailing ".0", so 1.0M is written 1M. */
function trimZero(value) {
  return value.replace(/\.0$/, "");
}

/** How many times a piece has been watched, as it reads on screen. Nothing when none was given. */
export function viewsText(views) {
  const count = Number(views) || 0;
  if (count <= 0) return "";
  if (count >= 1000000000) return `${trimZero((count / 1000000000).toFixed(1))}B views`;
  if (count >= 1000000) return `${trimZero((count / 1000000).toFixed(1))}M views`;
  if (count >= 1000) return `${trimZero((count / 1000).toFixed(count >= 10000 ? 0 : 1))}K views`;
  return `${count} ${count === 1 ? "view" : "views"}`;
}

/** Whether a story's channel should be read again: never read, or read longer ago than a day. */
export function channelStale(syncedAt) {
  if (!syncedAt) return true;
  const at = Date.parse(syncedAt);
  return !Number.isFinite(at) || Date.now() - at > STALE_MS;
}

/** The videos a channel holds, read on the server, with the names the story already knows handed in. */
export async function fetchChannelVideos(channel, entries) {
  const known = (Array.isArray(entries) ? entries : [])
    .filter((entry) => entry?.url)
    .map((entry) => ({ url: entry.url, name: String(entry.name || "") }));
  const res = await base44.functions.invoke("channelVideos", { channel, known });
  return res?.data || { ok: false, videos: [], reason: "" };
}

/**
 * One reading of a channel, put together with what the story holds. Nothing is changed unless the
 * channel was really read: a channel that could not be reached hands the list back untouched, with
 * the reason it could not be read.
 */
export async function syncStoryChannel({ channel, entries }) {
  const target = String(channel || "").trim();
  if (!target) return { ok: false, reason: "Write the channel address first.", entries: entries || [] };

  const read = await fetchChannelVideos(target, entries);
  if (!read?.ok) {
    return { ok: false, reason: read?.reason || "", entries: entries || [] };
  }

  return {
    ok: true,
    entries: mergeChannelVideos(entries, read.videos),
    count: read.videos?.length || 0,
    synced_at: read.synced_at || new Date().toISOString(),
  };
}