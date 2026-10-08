import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { readDocText, rowsOf, textOf } from "../../shared/knowledgeDoc.ts";

/**
 * One search over everything the knowledge holds: every line of the one document — the words, the
 * phrases, the rules and the rest — and every story, by its title, its telling, the words it is filed
 * under, the name of a video the artist has published, or the artist's own channel.
 *
 * Only what a match is and where it stands comes back, never the whole library: the document's own
 * part and line, and for a story enough of it to be recognised. The panel opens the place each match
 * belongs to, so a search is a way of getting there rather than a reading of its own.
 *
 * The document's working copy is what is searched, because that is what the panel shows — so every
 * line found can be opened and put right.
 */

const MIN_TERM = 2;
const MAX_TERM = 60;
// the room one answer takes: a search never hands back the library itself
const DOC_HITS = 40;
const STORY_ROWS = 60;
const STORY_HITS = 20;
const MAX_LINE = 220;
const MAX_EXCERPT = 180;

const SECTION =
  /^(?:the )?(?:words?|phrases?|rules?|knowledge|word list|vocabulary|grammar|reading|reading key|notes?|questions?|questions and answers|maarifa|maelezo|maswali|maneno|misemo|sheria|kanuni|sarufi|matamshi)$/i;

/** What the admin typed, as a pattern the store can match: nothing they write is ever a pattern. */
function forPattern(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The name a line carries, when the line opens a part of the document rather than being a thing
 * inside one — the same reading the panel keeps of it, so a match is named by its own part.
 */
function heading(line: string): string | null {
  const raw = line.trim();
  if (!raw || raw.length > 48) return null;
  const hashed = raw.match(/^#{1,6}\s*(.+?)\s*#*$/);
  const name = (hashed ? hashed[1] : raw).replace(/[:.\s]+$/, "").trim();
  if (!name) return null;
  if (!hashed && (name.includes("=") || name.includes("|"))) return null;
  if (SECTION.test(name)) return name;
  if (hashed) return name;
  const letters = name.replace(/[^\p{L}]/gu, "");
  return letters.length >= 3 && name === name.toUpperCase() && letters !== letters.toLowerCase()
    ? name
    : null;
}

/** Every line of the document that holds the term, each one named by the part it belongs to. */
function inDocument(text: string, term: string, limit: number) {
  const wanted = term.toLowerCase();
  const hits: any[] = [];
  let name = "";
  let at = 0;

  for (const line of String(text || "").split("\n")) {
    const start = at;
    at += line.length + 1;

    const opened = heading(line);
    if (opened) {
      name = opened;
      continue;
    }

    const found = line.toLowerCase().indexOf(wanted);
    if (found < 0) continue;

    hits.push({
      heading: name || "The document",
      line: line.trim().slice(0, MAX_LINE),
      at: start + found,
    });
    if (hits.length >= limit) break;
  }

  return hits;
}

/** Where a story holds the term, and enough of it to be recognised. */
function inStory(row: any, term: string) {
  const wanted = term.toLowerCase();

  if (textOf(row?.title).toLowerCase().includes(wanted)) {
    const body = textOf(row?.text).replace(/\s+/g, " ").trim();
    return { where: "the title", excerpt: body.slice(0, MAX_EXCERPT) };
  }

  const tags = Array.isArray(row?.tags) ? row.tags : [];
  const tag = tags.find((value: any) => textOf(value).toLowerCase().includes(wanted));
  if (tag) return { where: `filed under ${textOf(tag)}`, excerpt: "" };

  const entries = Array.isArray(row?.artist_links) ? row.artist_links : [];
  const video = entries.find(
    (entry: any) =>
      textOf(entry?.name).toLowerCase().includes(wanted) ||
      textOf(entry?.url).toLowerCase().includes(wanted)
  );
  if (video) {
    return { where: "a video the artist published", excerpt: textOf(video?.name) };
  }

  if (textOf(row?.channel_url).toLowerCase().includes(wanted)) {
    return { where: "the artist's channel", excerpt: textOf(row?.channel_url) };
  }

  const line = textOf(row?.text)
    .split("\n")
    .find((value: string) => value.toLowerCase().includes(wanted));

  return {
    where: "the telling",
    excerpt: textOf(line).replace(/\s+/g, " ").trim().slice(0, MAX_EXCERPT),
  };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Ingia kwenye akaunti kwanza." }, { status: 401 });
    if (user.role !== "admin") {
      return Response.json({ error: "Ni admin tu anayeweza kutafuta maarifa." }, { status: 403 });
    }

    let payload: any = {};
    try {
      payload = await req.json();
    } catch (err) {
      payload = {};
    }

    const term = textOf(payload?.query).trim().slice(0, MAX_TERM);
    if (term.length < MIN_TERM) {
      return Response.json({ doc: [], docMore: false, stories: [], storiesMore: false });
    }

    const service = base44.asServiceRole;
    const pattern = forPattern(term);

    const [draft, page] = await Promise.all([
      // the working copy is what the panel shows, so what is found here is a place to be taken to
      readDocText(base44, "draft").catch((error: any) => {
        console.error("The document could not be read for a search:", error?.message);
        return "";
      }),
      service.entities.Story.filter(
        {
          $or: [
            { title: { $regex: pattern, $options: "i" } },
            { text: { $regex: pattern, $options: "i" } },
            { tags: { $regex: pattern, $options: "i" } },
            { "artist_links.name": { $regex: pattern, $options: "i" } },
            { "artist_links.url": { $regex: pattern, $options: "i" } },
            { channel_url: { $regex: pattern, $options: "i" } },
          ],
        },
        {
          sort: "-updated_date",
          limit: STORY_ROWS,
          fields: ["title", "text", "tags", "artist_links", "channel_url", "published"],
        }
      ).catch((error: any) => {
        console.error("The stories could not be searched:", error?.message);
        return { items: [] };
      }),
    ]);

    const all = inDocument(draft, term, DOC_HITS + 1);
    const rows = rowsOf(page);

    return Response.json({
      doc: all.slice(0, DOC_HITS),
      docMore: all.length > DOC_HITS,
      stories: rows.slice(0, STORY_HITS).map((row: any) => {
        const found = inStory(row, term);
        return {
          id: textOf(row?.id),
          title: textOf(row?.title) || "Untitled",
          where: found.where,
          excerpt: found.excerpt,
          published: row?.published !== false,
        };
      }),
      storiesMore: rows.length > STORY_HITS,
    });
  } catch (error: any) {
    console.error("The knowledge could not be searched:", error?.message);
    return Response.json(
      { error: "The knowledge could not be searched just now. Try again." },
      { status: 500 }
    );
  }
}