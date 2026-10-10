import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { artistVideosFor, asksArtist } from '../../shared/artistVideos.ts';

/**
 * Choosing the one piece of media a play request asks for.
 *
 * The voice never chooses media out of its own guess: this is the app's own selection, and it stands
 * on what the app already holds — the artist's own story in the app, and the channel that story
 * names, read where its counts are not known yet. What comes back is one piece the artist has really
 * published, with the address it stands at and the verified channel behind it, or the short list of
 * the artist's own pieces when the title asked for is not among them, or nothing at all when no
 * artist of the app's own answers the request.
 *
 * Two titles that answer the request equally well are never chosen between here: both are handed
 * back, so the question is put to the person once and the answer they give settles it. Nothing is
 * ever invented — no channel ownership, no title, no address, no view count.
 *
 * The turn is also read for what the app's own player should do with what is standing in it: a piece
 * to be played, or the player to be paused, started again, moved on, or taken out. Only what the app
 * itself does is reported back, and a piece is never said to be playing here: the player itself
 * reports that, on the phone, once the sound has really begun.
 */

// how long a request may be read, and the words that carry no title at all
const MAX_REQUEST = 200;
const STOP_WORDS = new Set([
  'play', 'playing', 'put', 'listen', 'nyimbo', 'wimbo', 'muziki', 'song', 'songs', 'music',
  'video', 'videos', 'kanda', 'album', 'singles', 'single', 'weka', 'piga', 'sikiliza', 'pandisha',
  'tafadhali', 'please', 'the', 'and', 'for', 'with', 'from', 'yake', 'yangu', 'wake', 'this', 'that',
  // the words a person wraps a request in, which name no piece at all
  'just', 'let', 'let me', 'me', 'my', 'we', 'you', 'can', 'could', 'would', 'want', 'like', 'give',
  'some', 'now', 'then', 'again', 'its', 'his', 'her', 'our', 'their', 'about', 'only', 'one',
]);

// what the turn asks of the app's own player, most particular first: a person who says "just listen"
// is asking for the piece to play on without more talk, and one who says "play it again" is not
// asking for a new piece.
const LISTEN_ASK =
  /\b(just listen|listen only|only listen|niache|nisikilize|sikiliza tu|no more talk|stop talking|keep (it )?playing|acha kuzungumza|ndiye|basi niache)\b/i;
const PAUSE_ASK = /\b(pause|pausa|simama|nyamaza|acha kwanza|hold (it|on)|stand by)\b/i;
const RESUME_ASK = /\b(resume|continue|endelea|endeleza|carry on|play (again|it)|rudia|tena)\b/i;
const NEXT_ASK = /\b(next|ingine|nyingine|another|fuata|nifuatie|following)\b/i;
const STOP_ASK = /\b(stop|acha|funga|zima|kata|basi|enough|put it away)\b/i;
const PLAY_ASK =
  /\b(play|piga|weka|imba|nyimbo|wimbo|muziki|song|music|videos?|kanda|album|sikiliza|listen)\b/i;

function clean(value: any, max: number): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** What the turn asks of the app's own player, or nothing at all. */
function intentOf(said: string): string {
  if (LISTEN_ASK.test(said)) return 'listen';
  if (PAUSE_ASK.test(said)) return 'pause';
  if (RESUME_ASK.test(said)) return 'resume';
  if (NEXT_ASK.test(said)) return 'next';
  if (STOP_ASK.test(said)) return 'stop';
  if (PLAY_ASK.test(said)) return 'play';
  return 'none';
}

/** The words of a title as they are compared: no case, no accents, no decorations, no short words. */
function titleWords(value: any): string[] {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]|official|lyrics?|audio|video|hd|4k|feat\.?|ft\.?/g, ' ')
    .split(/[^a-z0-9']+/)
    .filter((word) => word.length > 2);
}

/** How much of what was asked for one title holds: the share of the asked words it carries. */
function fit(asked: string[], name: string): number {
  if (!asked.length) return 0;
  const words = titleWords(name);
  if (!words.length) return 0;
  return asked.filter((word) => words.includes(word)).length / asked.length;
}

/** An answer with nothing chosen: the intent stands, and no list is handed back. */
function plain(intent: string, reason = ''): any {
  return { ok: true, intent, chosen: null, candidates: [], others: [], channel: '', reason };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const request = clean(body?.request, MAX_REQUEST);
    if (!request) {
      return Response.json({ ok: false, intent: 'none', reason: 'Nothing was said for the app to choose media from.' });
    }

    const intent = intentOf(request);
    // Pausing, starting again, moving on and taking the piece out are done on what already stands in
    // the player, so nothing is looked up for them and no title is read out of such a turn.
    if (intent !== 'play' && intent !== 'listen') {
      return Response.json(plain(intent));
    }

    // A play request is a request about music, so it is looked up as one — the artist's own story in
    // the app is what the list of their pieces and their channel is read from.
    const query = asksArtist(request) ? request : `${request} nyimbo`;
    const found = await artistVideosFor(base44, query);
    const videos = Array.isArray(found?.videos) ? found.videos : [];
    const channel = String(found?.channel || '').trim();

    if (!videos.length && !channel) {
      return Response.json({
        ok: true,
        intent,
        chosen: null,
        candidates: [],
        others: [],
        channel: '',
        reason:
          found?.reason ||
          'No artist or channel of the app\u2019s own answers that request, so nothing was chosen.',
      });
    }

    // the words that may be the title being asked for
    const asked = titleWords(request).filter((word) => !STOP_WORDS.has(word));
    const scored = videos
      .map((one: any) => ({ name: String(one?.name || ''), url: String(one?.url || ''), score: fit(asked, one?.name) }))
      .filter((one: any) => one.url)
      .sort((a: any, b: any) => b.score - a.score);

    if (!scored.length) {
      return Response.json({
        ok: true,
        intent,
        chosen: null,
        candidates: [],
        others: [],
        channel,
        reason:
          'The artist\u2019s own list stands behind a channel, but no piece of it could be read, so nothing was chosen.',
      });
    }

    const best = scored[0];
    const tie = scored.filter((one: any) => one.score > 0 && one.score >= best.score);

    // two or more titles answer the request equally well: neither is chosen, and both are offered
    if (best.score > 0 && tie.length > 1 && best.score < 1) {
      return Response.json({
        ok: true,
        intent,
        chosen: null,
        candidates: tie.slice(0, 3).map((one: any) => ({ name: one.name, url: one.url })),
        others: [],
        channel,
        reason:
          'More than one of the artist\u2019s own pieces answers that title equally well, so the app chose none of them.',
      });
    }

    // nothing in the artist's own list answers the title: their pieces are offered, nothing is chosen
    if (best.score <= 0) {
      return Response.json({
        ok: true,
        intent,
        chosen: null,
        candidates: scored.slice(0, 5).map((one: any) => ({ name: one.name, url: one.url })),
        others: [],
        channel,
        reason:
          'That title is not among the artist\u2019s own pieces as the app holds them, so nothing was chosen.',
      });
    }

    const chosen = videos.find((one: any) => String(one?.url || '') === best.url) || { name: best.name, url: best.url };
    const others = scored
      .filter((one: any) => one.url !== best.url)
      .slice(0, 5)
      .map((one: any) => ({ name: one.name, url: one.url }));

    return Response.json({
      ok: true,
      intent,
      chosen: { name: best.name, url: best.url, views: Number(chosen?.views) || 0 },
      candidates: [],
      others,
      channel,
      reason: '',
    });
  } catch (error: any) {
    console.error('The media could not be chosen:', error?.message);
    return Response.json({ ok: false, intent: 'none', reason: 'The media could not be chosen just now.' }, { status: 500 });
  }
}