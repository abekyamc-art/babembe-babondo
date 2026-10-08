import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * The videos an artist's channel has published, as the channel itself hands them over.
 *
 * The admin gives the address of the channel — a @name, a /channel/ address — and this reads that
 * channel's own pages, so the video list belongs to the artist rather than being typed in. Nothing is
 * saved here: what comes back is handed to the panel, which keeps it with the story.
 *
 * A channel is read without any key of the app's own. The channel's id is taken from its page, and
 * then its own uploads list is read — that is where the videos the artist has published stand, in the
 * artist's own order, with the names the artist gave them — and its videos page is read beside it for
 * anything the list did not carry. A name neither page held is asked for from YouTube's own address
 * for that video. Everything is bounded, so one very busy channel cannot turn into a long run of
 * calls, and a channel that cannot be reached says so instead of handing back an empty list as if the
 * artist had published nothing.
 */

// YouTube is read as a plain browser would be read, and never waited on for long.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const PAGE_MS = 12000;

// The bounds of one reading: how many videos are brought back, how many are read from the pages,
// how many names are asked for one at a time, and how much of the story's own list is handed in.
const MAX_VIDEOS = 100;
const MAX_IDS = 140;
const MAX_OEMBED = 60;
const MAX_KNOWN = 300;
const MAX_CHANNEL = 300;

// A channel's uploads stand under a list of their own: the channel's id with its first two letters
// changed. That list is the artist's own list of everything they have published.
const UPLOADS = (id: string) => `https://www.youtube.com/playlist?list=UU${id.slice(2)}`;
const VIDEOS = (id: string) => `https://www.youtube.com/channel/${id}/videos`;
const WATCH = (id: string) => `https://www.youtube.com/watch?v=${id}`;
const OEMBED = (id: string) =>
  `https://www.youtube.com/oembed?url=${encodeURIComponent(WATCH(id))}&format=json`;

// A video's own id, as YouTube writes it.
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** One page of YouTube, as text. A page that is not handed over is a failure, not an empty channel. */
async function get(url: string) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
    signal: AbortSignal.timeout(PAGE_MS),
  });
  if (!res.ok) throw new Error(`YouTube answered ${res.status}`);
  return res.text();
}

/** Text as the page wrote it, with the tags and the escapes taken out. */
function plainText(value: any) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The video an address points at, whatever shape the address has. Nothing when it points at none. */
function videoIdIn(url: any) {
  const found = String(url ?? '').match(
    /(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/
  );
  return found ? found[1] : '';
}

/** The channel id an address carries, when it carries one outright. */
function channelIdIn(url: any) {
  const found = String(url ?? '').match(/\/channel\/(UC[A-Za-z0-9_-]{20,24})/);
  return found ? found[1] : '';
}

/**
 * The page's own data, taken out of the HTML whole: the brace that opens it and the brace that closes
 * it, with every brace inside a written word left alone. The text between them is the page's JSON.
 */
function jsonAt(html: string, marker: string) {
  const at = html.indexOf(marker);
  if (at < 0) return null;
  const start = html.indexOf('{', at);
  if (start < 0) return null;

  let depth = 0;
  let inText = false;
  let escaped = false;
  for (let step = start; step < html.length; step += 1) {
    const sign = html[step];
    if (inText) {
      if (escaped) escaped = false;
      else if (sign === '\\') escaped = true;
      else if (sign === '"') inText = false;
      continue;
    }
    if (sign === '"') inText = true;
    else if (sign === '{') depth += 1;
    else if (sign === '}') {
      depth -= 1;
      if (depth === 0) return html.slice(start, step + 1);
    }
  }
  return null;
}

/** What one video block calls itself, in either shape the page is written in. */
function titleOf(block: any) {
  const runs = block?.title?.runs;
  if (Array.isArray(runs) && runs.length) {
    return plainText(runs.map((run: any) => run?.text || '').join(' '));
  }
  if (block?.title?.simpleText) return plainText(block.title.simpleText);
  // the newer shape: the name stands as one piece of the block's content
  return plainText(block?.metadata?.lockupMetadataViewModel?.title?.content || '');
}

/** Every video the page carries, in the order it carries them, each one once. */
function videosIn(node: any, out: any[], seen: Set<string>) {
  if (!node || typeof node !== 'object' || out.length >= MAX_IDS) return;
  if (Array.isArray(node)) {
    for (const item of node) videosIn(item, out, seen);
    return;
  }

  const block =
    node.videoRenderer ||
    node.gridVideoRenderer ||
    node.compactVideoRenderer ||
    node.playlistVideoRenderer;
  if (block && typeof block.videoId === 'string' && VIDEO_ID.test(block.videoId) && !seen.has(block.videoId)) {
    seen.add(block.videoId);
    out.push({ id: block.videoId, title: titleOf(block) });
  }

  // the newer shape the channel's own grid and its uploads list are written in: a lockup carrying the
  // video's id and the name the artist gave it
  const lockup = node.lockupViewModel;
  const held = typeof lockup?.contentId === 'string' ? lockup.contentId : '';
  if (held && VIDEO_ID.test(held) && !seen.has(held)) {
    seen.add(held);
    out.push({ id: held, title: titleOf(lockup) });
  }

  for (const key of Object.keys(node)) videosIn(node[key], out, seen);
}

/** Every video one page carries, read from the page's own data. */
function pageVideos(html: string) {
  const data = jsonAt(html, 'ytInitialData');
  if (!data) return [];
  try {
    const carried: any[] = [];
    videosIn(JSON.parse(data), carried, new Set<string>());
    return carried;
  } catch (err) {
    // a page whose data could not be read adds nothing to what was already read
    return [];
  }
}

/** The channel's own id, read from the address the admin gave or from the page that address opens. */
async function channelIdOf(url: string) {
  const direct = channelIdIn(url);
  if (direct) return direct;

  const html = await get(url);
  const data = jsonAt(html, 'ytInitialData');
  if (data) {
    try {
      const page = JSON.parse(data);
      const id = String(page?.metadata?.channelMetadataRenderer?.externalId || '');
      if (id) return id;
    } catch (err) {
      // the page's own data was unreadable: the plain reading below is tried instead
    }
  }
  const shown = html.match(/(?:channelId|externalId)"\s*:\s*"(UC[A-Za-z0-9_-]{20,24})"/);
  return shown ? shown[1] : '';
}

/**
 * The videos a channel holds: the artist's own uploads list first, in the artist's own order, and
 * then the channel's videos page for anything that list did not carry. Nothing is listed twice.
 */
async function videosOf(channelId: string) {
  const [list, page] = await Promise.allSettled([get(UPLOADS(channelId)), get(VIDEOS(channelId))]);

  const found: any[] = [];
  const seen = new Set<string>();
  const keep = (id: string, title: string) => {
    if (!id || seen.has(id) || found.length >= MAX_IDS) return;
    seen.add(id);
    found.push({ id, title: String(title || '').trim() });
  };

  if (list.status === 'fulfilled') {
    pageVideos(list.value).forEach((row: any) => keep(row.id, row.title));
  }

  if (page.status === 'fulfilled') {
    pageVideos(page.value).forEach((row: any) => {
      const already = found.find((item: any) => item.id === row.id);
      if (already) {
        if (!already.title) already.title = row.title;
        return;
      }
      keep(row.id, row.title);
    });
  }

  return found.slice(0, MAX_VIDEOS);
}

/** The name of a video neither page named, asked for from YouTube's own address for that video. */
async function namesFor(rows: any[]) {
  const missing = rows.filter((row: any) => !row.title);
  for (let at = 0; at < missing.length && at < MAX_OEMBED; at += 6) {
    const batch = missing.slice(at, at + 6);
    const answers = await Promise.allSettled(
      batch.map((row: any) =>
        fetch(OEMBED(row.id), {
          headers: { 'User-Agent': UA },
          signal: AbortSignal.timeout(PAGE_MS),
        }).then((res) => (res.ok ? res.json() : null))
      )
    );
    answers.forEach((answer, index) => {
      if (answer.status !== 'fulfilled' || !answer.value) return;
      const name = plainText(answer.value?.title || '');
      if (name) batch[index].title = name;
    });
  }
  return rows;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    // only an admin keeps a story, so only an admin reads a channel for one
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const given = String(body?.channel || '').trim().slice(0, MAX_CHANNEL);
    if (!given) return Response.json({ ok: false, videos: [], reason: 'No channel address was given.' });

    // a bare name, or a bare @name, is read as the address of that channel
    const address = /^https?:\/\//i.test(given)
      ? given
      : `https://www.youtube.com/${given.startsWith('@') ? given : `@${given}`}`;

    // the names the story already holds are handed in, so a video whose name is already known is
    // never asked for again
    const known = new Map<string, string>();
    const carried = Array.isArray(body?.known) ? body.known.slice(0, MAX_KNOWN) : [];
    carried.forEach((row: any) => {
      const id = videoIdIn(row?.url);
      const name = String(row?.name || '').trim();
      if (id && name && !known.has(id)) known.set(id, name);
    });

    const channelId = await channelIdOf(address);
    if (!channelId) {
      return Response.json({
        ok: false,
        videos: [],
        reason: 'That channel could not be found — check the address, then keep the videos you already have.',
      });
    }

    const rows = await videosOf(channelId);
    const titled = await namesFor(rows);

    const videos = titled
      .map((row: any) => ({
        name: String(row.title || known.get(row.id) || '').trim(),
        url: WATCH(row.id),
      }))
      .filter((row: any) => row.url);

    if (!videos.length) {
      return Response.json({
        ok: false,
        channel_id: channelId,
        videos: [],
        reason: 'The channel was reached but no videos were handed over — your saved videos stay as they are.',
      });
    }

    return Response.json({
      ok: true,
      channel_id: channelId,
      videos,
      count: videos.length,
      synced_at: new Date().toISOString(),
    });
  } catch (error: any) {
    // the panel is told plainly that the channel could not be read, and keeps the list it already has
    console.error('The channel could not be read:', error?.message);
    return Response.json({
      ok: false,
      videos: [],
      reason: 'The channel could not be read just now — your saved videos stay as they are.',
    });
  }
}