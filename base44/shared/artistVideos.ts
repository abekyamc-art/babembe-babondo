import { readChannel } from "./channelRead.ts";
import { bestStory, namesStory, unheldName } from "./storyMatch.ts";

/**
 * The artist's own videos, the most watched first, for a turn that is about them.
 *
 * A person asking about an artist is answered with the artist's own pieces: the five most watched of
 * them, each with the name the artist gave it and the address it stands at. They come from two places
 * and in this order:
 *
 * 1. what the story already holds — the channel's own reading, kept with the artist's story, whose
 *    counts are the channel's own and decide the order; and
 * 2. where that list carries no count at all, the artist's channel itself, read through the app's own
 *    channel reader for the counts that decide who is most watched.
 *
 * Nothing is invented and nothing is guessed: a piece the channel gave no count for is never placed
 * above one it counted, fewer than five is said as fewer, and a channel that cannot be read says so
 * plainly rather than the artist being answered as though they had published nothing.
 */

const SHOWN = 5;
const STORY_ROWS = 150;
// How many of the artist's pieces ride into the answer's own words as their addresses.
const BLOCK_ROWS = 5;

/**
 * Whether a turn may be about an artist's own work at all: only those turns pay for the reading, so
 * ordinary talk and ordinary questions never wait on a channel.
 */
const ARTIST_ASK =
  /(msanii|msani|mwimbaji|mwanamuziki|mchezaji|mwandishi|sanaa|nyimbo|wimbo|muziki|albamu|kanda|videos?|songs?|singles?|album|artist|singer|musician|youtuber|channel|youtube|anaimba|anaimba)/i;

/** Whether this turn may be about an artist, their songs, their videos or their channel. */
export function asksArtist(query: any): boolean {
  const said = String(query || '').trim();
  return said.length > 3 && ARTIST_ASK.test(said);
}

export type ArtistVideo = { name: string; url: string; views: number };

export type ArtistList = {
  videos: ArtistVideo[];
  channel: string;
  /**
   * The artist's own name, as the story the app holds gives it. It is what a request names the artist
   * by, and it is what tells the artist's own words apart from the words of a title.
   */
  artist: string;
  /** whether the list came from a reading of the channel made just now, rather than from the story */
  read: boolean;
  /** why the channel could not be read, when one was read and could not be reached */
  reason?: string;
  /**
   * the name the turn carried that the app holds nowhere, where it named one. A turn naming somebody
   * the app has nothing of is answered by no list at all — never by another artist's work.
   */
  stranger?: string;
};

/** One saved entry as the list reads it, and nothing at all when it carries no address. */
function row(entry: any): ArtistVideo | null {
  const url = String(entry?.url || '').trim();
  if (!url) return null;
  return {
    name: String(entry?.name || '').trim(),
    url,
    views: Number(entry?.views) || 0,
  };
}

/**
 * The artist's pieces the story already holds, the most watched first. A piece the channel gave no
 * count for keeps its own place, after the counted ones — the channel's order, never a guess.
 */
export function savedVideos(story: any, limit = SHOWN): ArtistVideo[] {
  const rows = (Array.isArray(story?.artist_links) ? story.artist_links : [])
    .map(row)
    .filter(Boolean) as ArtistVideo[];
  const counted = rows.filter((one) => one.views > 0).sort((a, b) => b.views - a.views);
  const rest = rows.filter((one) => !one.views);
  return [...counted, ...rest].slice(0, limit);
}

/** Whether the channel's own counts are known for the pieces the story holds. */
export function hasCounts(videos: ArtistVideo[]): boolean {
  return (Array.isArray(videos) ? videos : []).some((one) => Number(one?.views) > 0);
}

/** The words of a piece's own name, read as names are read: no case, no accents, no short words. */
function nameWords(value: any): string[] {
  const found =
    String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .match(/[a-z0-9]+/g) || [];
  return found.filter((word) => word.length > 2);
}

/**
 * The words that name the artist a piece belongs to: the words the piece shares with the artist its
 * story is about, or, where it carries none of them, the words its own name gives after "by" — the
 * artist it was published by.
 *
 * One story can hold the work of more than one artist: the admin saves a piece of somebody else's
 * beside the artist's own, as a song another singer gave the app stands among the channel's videos.
 * What tells whose a piece is is the name itself, so nothing of another artist's is ever put behind
 * it — and a piece whose name says nothing of its artist stands alone.
 */
export function artistWordsOf(pieceName: any, storyArtist: any): string[] {
  const words = nameWords(pieceName);
  if (!words.length) return [];
  const own = nameWords(storyArtist);
  const shared = words.filter((word) => own.includes(word));
  if (shared.length) return shared;
  const tail = String(pieceName ?? '').split(/\bby\b/i).slice(1).join(' ');
  return nameWords(tail);
}

/** Whether a piece belongs to the artist these words name. */
export function byArtist(pieceName: any, artistWords: any): boolean {
  const wanted = Array.isArray(artistWords) ? artistWords : [];
  if (!wanted.length) return false;
  return nameWords(pieceName).some((word) => wanted.includes(word));
}

/**
 * The pieces of the artist's own list that carry what a request named, or the whole list where it
 * named nothing the list holds: a request that named a piece of somebody else's is never offered
 * another artist's work in its place.
 */
export function piecesNamedBy(videos: ArtistVideo[], words: any): ArtistVideo[] {
  const wanted = Array.isArray(words) ? words : [];
  const named = (Array.isArray(videos) ? videos : []).filter((one) =>
    nameWords(one?.name).some((word) => wanted.includes(word))
  );
  return named.length ? named : videos;
}

/**
 * The app's own artist, for a turn that asks for their work without naming them: the story that
 * carries the artist's own channel and their own pieces is the app's artist.
 *
 * Only where exactly one story carries them: where the app holds more than one artist, no one of them
 * is picked for a request that named none. Nothing is guessed — the person is asked which artist they
 * mean, which is what the selection does when no artist of the app's own answers a request.
 */
export function ownArtist(rows: any[]): any {
  const carrying = (Array.isArray(rows) ? rows : []).filter((row: any) => carriesWork(row));
  return carrying.length === 1 ? carrying[0] : null;
}

/** Whether a story carries the artist's own work at all: their channel, or pieces they published. */
export function carriesWork(story: any): boolean {
  if (!story) return false;
  return (
    !!String(story?.channel_url || '').trim() ||
    (Array.isArray(story?.artist_links) && story.artist_links.length > 0)
  );
}

/**
 * The artist's list for one turn: the story the turn is about, and their own pieces, the most watched
 * first — as many of them as the caller asks for, five by default. A turn that is choosing one piece
 * out of them asks for the whole list, so a title the artist published long ago is never left out
 * because the piece it names stands far down their most watched.
 *
 * Nothing is read at all for a turn that is not about an artist, or one no story answers — apart from
 * a request for the artist's own songs that names no artist at all, which the app's own artist answers
 * where the app holds one.
 */
export async function artistVideosFor(base44: any, query: any, limit = SHOWN): Promise<ArtistList | null> {
  if (!asksArtist(query)) return null;

  let story: any = null;
  try {
    const page = await base44.asServiceRole.entities.Story.filter(
      { published: true },
      {
        sort: '-updated_date',
        limit: STORY_ROWS,
        fields: ['title', 'text', 'tags', 'channel_url', 'artist_links'],
      }
    );
    const rows = page?.items || [];
    // A turn carrying a name the app holds nowhere — an artist, or a song, the app has nothing of — is
    // never answered with another artist's work: no list at all answers a name nobody here carries, so
    // the turn is handed back plainly and nothing of anybody else's is put in the player.
    const stranger = unheldName(rows, String(query || ''));
    if (stranger) return { videos: [], channel: '', artist: '', read: false, stranger };

    const matched = bestStory(rows, String(query || ''));
    // A turn that names one of the admin's own stories is answered by that story alone: a story is
    // named by its own title, by the words it is filed under, or by the name of something published
    // with it — a word its telling merely carries is not a name being asked for. Where the story named
    // carries no work of the artist's, the app holds nothing of them to play, and no other artist's
    // list is stood in its place. The app's own artist answers a turn that names none of the stories.
    story = matched && namesStory(matched, String(query || '')) ? matched : ownArtist(rows);
  } catch (error: any) {
    // a story that could not be read is no list at all: nothing is claimed about an artist here
    console.error('The artist could not be found for the video list:', error?.message);
    return null;
  }
  if (!story) return null;

  const channel = String(story?.channel_url || '').trim();
  const artist = String(story?.title || '').trim();
  const saved = savedVideos(story, limit);
  // The counts the channel itself gave are already kept with the story: those decide the order, and
  // nothing is read for them. The channel is read only where the story holds no count at all — and
  // only where the story holds no videos either, since a saved list without counts is still the
  // artist's own pieces.
  if (!channel || hasCounts(saved)) return { videos: saved, channel, artist, read: false };

  const read = await readChannel({ channel, known: story?.artist_links, limit, names: false });
  if (!read?.ok || !read.videos.length) {
    return { videos: saved, channel, artist, read: false, reason: read?.reason || '' };
  }
  return { videos: read.videos.slice(0, limit), channel, artist, read: true };
}

/**
 * The artist's list as it rides into the answer: the five, each with the name the artist gave it and
 * the address it stands at, and the rule for what the answer does with them. A channel that could not
 * be read is said plainly, so the person hears that the list could not be reached rather than that the
 * artist has published nothing.
 */
export function artistVideosBlock(found: ArtistList | null): string {
  if (!found) return '';
  const videos = (Array.isArray(found.videos) ? found.videos : []).slice(0, BLOCK_ROWS);
  const channel = String(found.channel || '').trim();
  if (!videos.length && !channel) return '';

  const head =
    '\nKAZI ZA MSANII — the artist this turn is about, and their own work:\n' +
    (channel ? `Channel ya msanii: ${channel}\n` : '');

  if (!videos.length) {
    return (
      head +
      'Orodha ya video zake haikupatikana kwa sasa. Sema wazi kwamba orodha ya video zake ' +
      'haikupatikana kwa sasa na umwombe ajaribu tena — usiseme kwamba msanii hana video, na ' +
      'usibuni jina, wimbo wala kiungo chochote.\n'
    );
  }

  const lines = videos.map((one, index) => {
    const views = Number(one.views) > 0 ? ` (${one.views} views)` : '';
    return `${index + 1}. ${one.name || one.url} — ${one.url}${views}`;
  });

  return (
    head +
    `Video zake zinazoonekana zaidi (${videos.length})${found.read ? ', kutoka channel yake yenyewe' : ''}:\n` +
    `${lines.join('\n')}\n` +
    'Taja kila moja ya hizi kwa jina lake, kama lilivyoandikwa hapa, na uandike kiungo (link) chake ' +
    'kamili kama maandishi matupu — hizi ndizo kiungo za video zake. Jibu lako linaweza kuwa refu kwa ' +
    'sababu ya orodha hii: kila video hapa inatajwa. Zikiwa chache kuliko tano, taja zilizopo na sema ' +
    'wazi kwamba hizi ndizo channel yake inazoonyesha. Usibuni video, jina wala kiungo, na usiseme ' +
    'hakuna kilichopatikana wakati orodha ipo juu.\n'
  );
}