/**
 * Finding the admin's own story for a turn.
 *
 * The stories the admin writes are the only ones that answer: a turn that asks for a story is read
 * against their titles, their tags and their own words, and the nearest one is what comes back —
 * with its tags, its picture, video or link, and the links the admin attached, so the screen can
 * show it and the person can play it. A turn that matches nothing comes back empty, so the
 * assistant tells its own story instead of one the admin never wrote.
 */

// The filler of both languages carries nothing that finds a story.
const STOPWORDS = new Set([
  "the", "and", "for", "are", "was", "were", "with", "that", "this", "from", "what", "who", "why",
  "how", "when", "where", "which", "does", "did", "about", "into", "your", "you", "his", "her",
  "its", "our", "their", "them", "they", "have", "has", "had", "will", "would", "can", "could",
  "should", "not", "but", "all", "any", "some", "tell", "give", "please", "there", "here", "then",
  "than", "also", "me", "my", "us", "we", "it", "of", "in", "on", "to", "a", "an", "is", "be",
  "kama", "nini", "nani", "wapi", "vipi", "gani", "huyu", "hawa", "hivyo", "lakini", "pia", "sana",
  "kila", "moja", "wetu", "wake", "wangu", "yako", "kwenye", "katika", "kuhusu", "ambayo", "ambao",
  "huu", "hii", "hilo", "na", "ya", "wa", "za", "la", "cha", "kwa", "ni", "mimi", "wewe", "yeye",
]);

// The words a person uses to ask for a story, in every language the app serves.
const STORY_ASKS = /\b(hadithi|historia|stori|story|stories|habari|maelekezo|maelezo|legend|tale|myth)\b/i;

// The words a person uses to ask for a song or a video, in every language the app serves: a turn
// carrying one of these can be met by the story the piece was saved with on its title alone.
const MEDIA_ASKS = /\b(wimbo|nyimbo|muziki|muzikiwa|music|song|songs|video|videos|kanda|clip|album|playlist|play|watch)\b/i;

// A turn that plainly asks for a story may be met by a story on one word alone; an ordinary turn
// has to speak about the story much more before one is put in front of it.
const ASK_BAR = 3;
const PLAIN_BAR = 8;

// The story text carries the marks the admin writes for their own pictures, videos, audio
// recordings and links. What is matched, and what is told, is the telling itself.
const MARK_RE = /\[\[(?:image|video|audio|link):[^\]]+\]\]/g;

/** The telling without its marks: what a story is read for, and answered from. */
function plainStoryText(value) {
  return String(value ?? "").replace(MARK_RE, " ").replace(/\s{2,}/g, " ");
}

function tokens(value) {
  const found = String(value ?? "").toLowerCase().match(/[\p{L}\p{N}']+/gu) || [];
  return found.filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

/** How near one story lies to a turn: its title and its tags count most, its own words least. */
export function storyScore(story, query) {
  const wanted = Array.from(new Set(tokens(query)));
  if (!wanted.length) return 0;

  const title = String(story?.title ?? "").toLowerCase();
  const tags = (Array.isArray(story?.tags) ? story.tags : []).join(" ").toLowerCase();
  // the names the artist published with the story — a song, a video, the channel itself — find the
  // story they were saved with exactly as its title does
  const works = workNames(story).toLowerCase();
  const text = plainStoryText(story?.text).toLowerCase();
  const phrase = String(query ?? "").trim().toLowerCase();

  let score = 0;
  let inText = 0;
  for (const token of wanted) {
    if (title.includes(token)) score += 4;
    else if (tags.includes(token)) score += 4;
    else if (works.includes(token)) score += 4;
    else if (text.includes(token)) inText += 1;
  }
  // a long telling mentions many words, so its own share is capped and never wins on length alone
  score += Math.min(inText, 4) * 1.5;

  if (phrase.length > 5) {
    if (title.includes(phrase) || works.includes(phrase)) score += 8;
    else if (text.includes(phrase)) score += 4;
  }
  return score;
}

/** Every name published with a story: the artist's own pieces, and the channel they stand on. */
function workNames(story) {
  const names = (Array.isArray(story?.artist_links) ? story.artist_links : [])
    .map((entry) => String(entry?.name ?? ""))
    .filter(Boolean);
  if (story?.channel_url) names.push(String(story.channel_url));
  return names.join(" ");
}

/**
 * The one piece of the artist's a turn names, when it names one: the song or video whose own name
 * the turn carries. One shared word is not a name being asked for, so a match has to carry the whole
 * name or most of it — and nothing at all comes back when the turn names no piece.
 */
export function matchedArtistLink(story, query) {
  const wanted = Array.from(new Set(tokens(query)));
  if (!wanted.length) return null;

  const phrase = String(query ?? "").trim().toLowerCase();
  let best = null;
  let top = 0;

  for (const entry of Array.isArray(story?.artist_links) ? story.artist_links : []) {
    const name = String(entry?.name ?? "").trim();
    if (!name) continue;
    const lower = name.toLowerCase();
    let score = 0;
    for (const token of wanted) {
      if (lower.includes(token)) score += 4;
    }
    if (phrase.length > 5 && lower.includes(phrase)) score += 8;
    if (score > top) {
      top = score;
      best = entry;
    }
  }

  if (!best || top < 8) return null;
  return { name: String(best.name ?? ""), url: String(best.url ?? "") };
}

/** The nearest story to a turn, or null when none of them is close enough to be the one asked for. */
export function bestStory(rows, query) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return null;

  // a turn that asks for a story, or that asks for a song or a video, may be met by a story on one
  // word alone; an ordinary turn has to speak about the story much more before one is put in front of it
  const said = String(query ?? "");
  const asked = STORY_ASKS.test(said) || MEDIA_ASKS.test(said);
  let best = null;
  let top = 0;
  for (const row of list) {
    const score = storyScore(row, query);
    if (score > top) {
      top = score;
      best = row;
    }
  }
  if (top < (asked ? ASK_BAR : PLAIN_BAR)) return null;

  // The one piece the turn named rides with the story, so the screen can put it in front of the
  // person and play it there, instead of leaving them to find it among everything the artist published.
  const named = matchedArtistLink(best, query);
  return named ? { ...best, matched_media: named } : best;
}

// The longest telling handed to the assistant in one turn; the whole story stays saved in the app.
const NOTE_TEXT = 4000;

/** The admin's story as the note the assistant answers from, with nothing added to it. */
export function storyNote(story) {
  const title = String(story?.title ?? "").trim();
  const text = plainStoryText(story?.text).trim().slice(0, NOTE_TEXT);
  if (!text) return "";
  return (
    "\nHADITHI YA MWENYEJI — a story the admin of this app has written and saved:\n" +
    "The person's turn is about this story. Tell it from the admin's own words below, in the " +
    "language the person is using, and never invent a part the admin has not written. " +
    "The story as the admin saved it:\n" +
    (title ? `"${title}"\n` : "") +
    `${text}\n` +
    artistNote(story)
  );
}

// How much of the artist's own work rides with the telling, and how many of their pieces it names.
const ARTIST_ROOM = 1600;
const ARTIST_ROWS = 16;

/**
 * The artist's own channel and the names they published, written under the telling.
 *
 * A person asking about a song, a video or the channel by its own name is asking about the same
 * artist the story is about: these names are the artist's own, saved with the story, so the answer
 * reaches them and never calls one of them unknown.
 */
function artistNote(story) {
  const channel = String(story?.channel_url ?? "").trim();
  const rows = (Array.isArray(story?.artist_links) ? story.artist_links : [])
    .map((entry) => ({
      name: String(entry?.name ?? "").trim(),
      url: String(entry?.url ?? "").trim(),
    }))
    .filter((entry) => entry.name || entry.url)
    .slice(0, ARTIST_ROWS);
  if (!channel && !rows.length) return "";

  let body = channel ? `- channel: ${channel}\n` : "";
  for (const row of rows) {
    const line = `- ${row.name || "a piece"}: ${row.url}\n`;
    if (body.length + line.length > ARTIST_ROOM) break;
    body += line;
  }

  return (
    "\nKAZI ZA MWENYEJI — the channel and the names the artist has published, saved with this story:\n" +
    body +
    "A person who asks about any of these names — a song, a video, the channel itself — is asking " +
    "about this same artist: answer from the story above, name the piece exactly as it is written " +
    "here, and never say it is unknown.\n"
  );
}

// The words a request wraps itself in: a word for playing, for music, or for the artist as such names
// nothing of its own, so it is never read as a name.
const WRAP_WORDS = new Set([
  "play", "playing", "piga", "weka", "imba", "sing", "nyimbo", "wimbo", "muziki", "mziki", "song",
  "songs", "music", "video", "videos", "kanda", "album", "albamu", "msanii", "wasanii", "msani",
  "mwimbaji", "mwanamuziki", "mchezaji", "mwandishi", "sanaa", "artist", "artists", "singer",
  "singers", "musician", "musicians", "band", "kwaya", "channel", "youtube", "listen", "sikiliza",
  "pause", "pausa", "stop", "next", "another", "nyingine", "ingine",
]);

// The words ordinary talk carries: they name nothing the app could hold, so they are never read as a
// name either.
const TALK_WORDS = new Set([
  "asante", "sana", "tena", "sema", "sawa", "vizuri", "nzuri", "habari", "poa", "karibu", "samahani",
  "ndiyo", "hapana", "leo", "kesho", "jana", "sasa", "bado", "kweli", "hello", "hey", "thanks",
  "thank", "sorry", "again", "repeat", "slowly", "now", "today", "tomorrow", "good", "bad", "fine",
  "okay", "yes", "maybe", "well", "very", "much", "more", "little", "small", "big",
  // the words a request leans on rather than names: whose the piece is, how many, and how it stands
  "zake", "lake", "yake", "wake", "zangu", "zako", "zetu", "yetu", "zao", "yao", "yangu", "yako",
  "wako", "kwake", "kwangu", "mwenyewe", "wote", "zote", "yote", "huyo", "hao", "wale", "ile",
  "hiyo", "hizo", "some", "any", "all", "also", "too", "most", "best", "nice", "want", "like",
  "love", "favorite", "favourite", "new", "latest", "official", "audio", "full", "one",
]);

/** The words of a turn and of a name, read the same way on both sides: no case, no accents, no filler. */
function nameWords(value: any): string[] {
  const found =
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .match(/[a-z0-9]+/g) || [];
  return found.filter((word) => word.length > 2);
}

/** Every name the app holds: each story's own title, its tags, its channel, and every name published with it. */
function heldNames(rows: any[]): string {
  const parts: string[] = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    parts.push(String(row?.title ?? ""));
    for (const tag of Array.isArray(row?.tags) ? row.tags : []) parts.push(String(tag ?? ""));
    parts.push(String(row?.channel_url ?? ""));
    for (const entry of Array.isArray(row?.artist_links) ? row.artist_links : []) {
      parts.push(String(entry?.name ?? ""));
    }
  }
  return nameWords(parts.join(" ")).join(" ");
}

/**
 * The name a turn carries that the app holds nowhere, or an empty string when the turn names nothing
 * of its own.
 *
 * A request for the artist's own work as a whole — "play the artist's songs", "piga nyimbo za msanii"
 * — carries no name at all, and the app's own artist answers it. A turn that carries a name the app
 * holds nowhere — an artist, or a song, it has nothing of — names someone of its own, and no other
 * artist's work may answer it: the name is handed back plainly instead, so a piece nobody asked for
 * is never put in the player.
 *
 * Only a turn whose every name word stands nowhere is read this way: a turn that names one of the
 * app's own names, however many other words it carries, is answered exactly as it always was.
 */
export function unheldName(rows: any[], query: any): string {
  const said = String(query ?? "");
  const all = nameWords(said);
  const rest = all.filter(
    (word) => !STOPWORDS.has(word) && !WRAP_WORDS.has(word) && !TALK_WORDS.has(word)
  );
  if (!rest.length) return "";

  const held = heldNames(rows);
  const unknown = rest.filter((word) => !held.includes(word));
  // a name the app does hold stands in the turn: this is not somebody the app has nothing of
  if (unknown.length !== rest.length) return "";

  // A turn asks for something when it carries a word for playing, for music or for the artist as such;
  // without one, a single word of its own is not read as a name.
  const asking = all.some((word) => WRAP_WORDS.has(word));
  if (unknown.length < 2 && !asking) return "";
  return unknown.join(" ");
}