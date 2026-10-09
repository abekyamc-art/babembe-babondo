import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { bestStory } from "../../shared/storyMatch.ts";

// How many saved stories one turn is read against, and how much of a turn is read at all.
const MAX_STORIES = 200;
const MAX_QUERY = 600;

// Only what the screen shows: the story, its filing words, and its own media.
const FIELDS = [
  "title",
  "text",
  "tags",
  "media",
  "media_kind",
  "media_url",
  "media_file_uri",
  "media_after",
  "links",
  "channel_url",
  "artist_links",
];

/**
 * The story the admin wrote that a turn is asking for, if there is one.
 *
 * Only published stories are read, and only by the app's own user — the row is never opened with
 * more rights than the person asking holds. The matching itself lives in one place, so a story is
 * found the same way here and in the assistant's own answer. A turn that matches nothing comes back
 * empty, which leaves the assistant to answer from what it has of its own.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const query = String(body?.query || '').trim().slice(0, MAX_QUERY);
    if (!query) return Response.json({ story: null });

    const page = await base44.entities.Story.filter(
      { published: true },
      { sort: '-updated_date', limit: MAX_STORIES, fields: FIELDS }
    );

    return Response.json({ story: bestStory(page?.items || [], query) });
  } catch (error) {
    // a story that could not be read is never a reason to hold up the turn: the assistant answers
    // from what it has, and the screen simply shows no story
    console.error('The story lookup failed:', error?.message);
    return Response.json({ story: null });
  }
}