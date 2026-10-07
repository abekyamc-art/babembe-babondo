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

// A turn that plainly asks for a story may be met by a story on one word alone; an ordinary turn
// has to speak about the story much more before one is put in front of it.
const ASK_BAR = 3;
const PLAIN_BAR = 8;

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
  const text = String(story?.text ?? "").toLowerCase();
  const phrase = String(query ?? "").trim().toLowerCase();

  let score = 0;
  let inText = 0;
  for (const token of wanted) {
    if (title.includes(token)) score += 4;
    else if (tags.includes(token)) score += 4;
    else if (text.includes(token)) inText += 1;
  }
  // a long telling mentions many words, so its own share is capped and never wins on length alone
  score += Math.min(inText, 4) * 1.5;

  if (phrase.length > 5) {
    if (title.includes(phrase)) score += 8;
    else if (text.includes(phrase)) score += 4;
  }
  return score;
}

/** The nearest story to a turn, or null when none of them is close enough to be the one asked for. */
export function bestStory(rows, query) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return null;

  const asked = STORY_ASKS.test(String(query ?? ""));
  let best = null;
  let top = 0;
  for (const row of list) {
    const score = storyScore(row, query);
    if (score > top) {
      top = score;
      best = row;
    }
  }
  return top >= (asked ? ASK_BAR : PLAIN_BAR) ? best : null;
}

// The longest telling handed to the assistant in one turn; the whole story stays saved in the app.
const NOTE_TEXT = 4000;

/** The admin's story as the note the assistant answers from, with nothing added to it. */
export function storyNote(story) {
  const title = String(story?.title ?? "").trim();
  const text = String(story?.text ?? "").trim().slice(0, NOTE_TEXT);
  if (!text) return "";
  return (
    "\nHADITHI YA MWENYEJI — a story the admin of this app has written and saved:\n" +
    "The person's turn is about this story. Tell it from the admin's own words below, in the " +
    "language the person is using, and never invent a part the admin has not written. " +
    "The story as the admin saved it:\n" +
    (title ? `"${title}"\n` : "") +
    `${text}\n`
  );
}