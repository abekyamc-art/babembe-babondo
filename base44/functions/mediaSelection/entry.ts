import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { artistVideosFor, artistWordsOf, asksArtist, byArtist, piecesNamedBy } from '../../shared/artistVideos.ts';

/**
 * Choosing the one piece of media a play request asks for.
 *
 * The voice never chooses media out of its own guess: this is the app's own selection, and it stands
 * on what the app already holds — the artist's own story in the app, and the channel that story
 * names, read where its counts are not known yet. What comes back is one piece the artist has really
 * published, with the address it stands at and the verified channel behind it, or the short list of
 * the artist's own pieces when the title asked for is not among them, or nothing at all when no
 * artist of the app's own answers the request. A turn that names an artist, or a song, the app holds
 * nowhere is answered with nothing at all as well, and the name is handed back plainly: another
 * artist's work is never put in its place.
 *
 * A request is read for the artist and the title together: the words that name the artist — who the
 * list already belongs to — are taken out of it, and what is left is what tells one of the artist's
 * pieces from another. Pieces that answer a title equally well are never chosen between here: all of
 * them are handed back, so the question is put to the person once and the answer they give settles it.
 * Nothing is ever invented — no channel ownership, no title, no address, no view count.
 *
 * The turn is also read for what the app's own player should do with what is standing in it: a piece
 * to be played, or the player to be paused, started again, moved on, or taken out. Only what the app
 * itself does is reported back, and a piece is never said to be playing here: the player itself
 * reports that, on the phone, once the sound has really begun.
 */

// how long a request may be read, and the words that carry no title at all
const MAX_REQUEST = 200;
// How many of the artist's own pieces a title is looked for among. A title is never left unplayed
// because the piece it names stands far down the artist's most watched: the whole list is read, since
// a piece the admin wrote in themselves — a song the artist gave the app, standing at its own address
// rather than on a channel — carries no count and so stands at the very end of it.
const MATCH_ROWS = 500;
const STOP_WORDS = new Set([
  'play', 'playing', 'put', 'listen', 'nyimbo', 'wimbo', 'muziki', 'song', 'songs', 'music',
  'video', 'videos', 'kanda', 'album', 'singles', 'single', 'weka', 'piga', 'sikiliza', 'pandisha',
  'tafadhali', 'please', 'the', 'and', 'for', 'with', 'from', 'yake', 'yangu', 'wake', 'this', 'that',
  // the words a person wraps a request in, which name no piece at all
  'just', 'let', 'let me', 'me', 'my', 'we', 'you', 'can', 'could', 'would', 'want', 'like', 'give',
  'some', 'now', 'then', 'again', 'its', 'his', 'her', 'our', 'their', 'about', 'only', 'one',
  // The words that name the artist rather than a piece — "play the song of the artist", "piga nyimbo
  // ya msanii". They carry no title at all, so a request holding only these is a request for the
  // artist's own work as a whole: their most watched piece answers it.
  'artist', 'artists', 'singer', 'singers', 'musician', 'musicians', 'youtuber', 'channel', 'msanii',
  'msani', 'wasanii', 'mwimbaji', 'mwanamuziki', 'mchezaji', 'mwandishi', 'sanaa', 'kwaya', 'band',
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
  /\b(play|piga|weka|imba|nyimbo|wimbo|muziki|mziki|song|music|videos?|kanda|album|sikiliza|listen)\b/i;
// A turn that asks something rather than asking for a piece: it is never read as a play ask, however
// many of the artist's own words it carries — "msanii magdelena ni nani" stays a question.
const QUESTION_ASK =
  /\b(je|nani|nini|gani|wapi|vipi|kwanini|who|whose|what|which|where|why|how|when)\b/i;

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
    // an apostrophe joins no words of a title: "the artist's songs" reads as the words a request wraps
    // itself in, never as a title of its own
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
}

/** How much of what was asked for one title holds: the share of the asked words it carries. */
function fit(asked: string[], name: string): number {
  if (!asked.length) return 0;
  const words = titleWords(name);
  if (!words.length) return 0;
  return asked.filter((word) => words.includes(word)).length / asked.length;
}

/**
 * The pieces that may ride behind the one chosen: only those by the artist the chosen piece belongs
 * to, in the artist's own order. One story can hold the work of more than one artist, so a request
 * answered with one artist's piece is never followed into another artist's work — the set ends where
 * that artist's own list ends, and nothing of anybody else's is put behind it.
 */
function behind(chosen: any, scored: any[], artist: string) {
  const words = artistWordsOf(chosen?.name, artist);
  return (Array.isArray(scored) ? scored : [])
    .filter((one: any) => one.url !== chosen?.url && byArtist(one.name, words))
    .slice(0, 5)
    .map((one: any) => ({ name: one.name, url: one.url }));
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
    // A turn that carries no word for playing at all is still a request for a piece where it names
    // one — "usi mzarahu mtu", "magdelena athuman", "msanii magdelena athuman" — so it is read as a
    // play ask. Where none of the artist's own pieces really answers it, it is handed back exactly as
    // the ask it was, and the assistant answers it in words. A question is never read that way.
    const verbless = intent === 'none' && !QUESTION_ASK.test(request);
    if (intent !== 'play' && intent !== 'listen' && !verbless) {
      return Response.json(plain(intent));
    }
    // what a turn that really answers one of the artist's own pieces is reported as
    const playerIntent = verbless ? 'play' : intent;

    // A play request is a request about music, so it is looked up as one — the artist's own story in
    // the app is what the list of their pieces and their channel is read from.
    const query = asksArtist(request) ? request : `${request} nyimbo`;
    const found = await artistVideosFor(base44, query, MATCH_ROWS);
    const videos = Array.isArray(found?.videos) ? found.videos : [];
    const channel = String(found?.channel || '').trim();

    // The turn carries a name the app holds nowhere — an artist, or a song, it has nothing of. Nothing
    // is chosen and nothing of another artist's is offered: the name itself is handed back, so the
    // person is told what the app holds instead of being played a piece nobody asked for.
    if (found?.stranger) {
      return Response.json({
        ok: true,
        intent: playerIntent,
        chosen: null,
        candidates: [],
        others: [],
        channel: '',
        unknown: true,
        asked: String(found.stranger),
        reason:
          'The name in that request stands in none of the app\u2019s own stories, songs or channels, so nothing was chosen.',
      });
    }

    if (!videos.length && !channel) {
      // a turn that named a piece without asking for one is left exactly as it was where the app
      // holds nothing of the artist at all: the assistant answers it in words
      if (verbless) return Response.json(plain('none'));
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
    // The artist's own name is taken out of what the request asks for before a title is measured: those
    // words name the artist, whose list this already is, and never a piece of it. What is left is what
    // really tells one of the artist's pieces from another — so a request that names an artist and a
    // title is read by the title, a request that names the artist alone asks for their own work as a
    // whole, and a request that names a title alone is read against every one of their pieces alike.
    const named = titleWords(found?.artist || '');
    const title = asked.filter((word) => !named.includes(word));
    const scored = videos
      .map((one: any) => ({ name: String(one?.name || ''), url: String(one?.url || ''), score: fit(title, one?.name) }))
      .filter((one: any) => one.url)
      .sort((a: any, b: any) => b.score - a.score);

    if (!scored.length) {
      if (verbless) return Response.json(plain('none'));
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

    // Two or more of the artist's pieces answer the request equally well — the same title carried by
    // two of them, or one title that names both: none of them is chosen, and all of them are handed
    // back, so the question is put to the person and the piece they answer with is the one that plays.
    if (tie.length > 1) {
      return Response.json({
        ok: true,
        intent: playerIntent,
        chosen: null,
        candidates: tie.slice(0, 3).map((one: any) => ({ name: one.name, url: one.url })),
        others: [],
        clash: true,
        channel,
        reason:
          'More than one of the artist\u2019s own pieces answers that title equally well, so the app chose none of them.',
      });
    }

    // A request that names no piece of its own — "play the artist's songs", or the artist's name alone
    // — asks for the artist's own work rather than for one title: their most watched piece is the one
    // asked for, and the rest of their pieces wait behind it in the player, exactly as when a title is
    // named.
    if (best.score <= 0 && !title.length) {
      const top: any = videos.find((one: any) => String(one?.url || '') === best.url) || {
        name: best.name,
        url: best.url,
      };
      return Response.json({
        ok: true,
        intent: playerIntent,
        chosen: { name: best.name, url: best.url, views: Number(top?.views) || 0 },
        candidates: [],
        others: behind(best, scored, found?.artist || ''),
        channel,
        reason: '',
      });
    }

    // nothing in the artist's own list answers the title: their pieces are offered, nothing is chosen
    if (best.score <= 0) {
      // a turn that only named a piece — and asked for none of the artist's own — is left as it was,
      // so ordinary talk is never turned into a list of the artist's pieces
      if (verbless) return Response.json(plain('none'));
      return Response.json({
        ok: true,
        intent,
        chosen: null,
        // Only the pieces carrying what the request named are offered: where a person named a piece of
        // another artist saved on this story, no piece of anybody else's is put in front of them.
        candidates: piecesNamedBy(videos, title)
          .slice(0, 5)
          .map((one: any) => ({ name: one.name, url: one.url })),
        others: [],
        clash: false,
        channel,
        reason:
          'That title is not among the artist\u2019s own pieces as the app holds them, so nothing was chosen.',
      });
    }

    const chosen = videos.find((one: any) => String(one?.url || '') === best.url) || { name: best.name, url: best.url };
    const others = behind(best, scored, found?.artist || '');

    return Response.json({
      ok: true,
      intent: playerIntent,
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