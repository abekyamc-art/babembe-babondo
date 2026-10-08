/**
 * The catalogue of the admin's own stories: every story's name, the words it is filed under, the
 * artist's channel, and the names of everything published with it.
 *
 * This is what lets an answer reach a story or a song by its own name. The whole catalogue is small
 * — a line to a story — so it rides with a turn, and every AI that answers holds it: a person who
 * asks about a name standing in it is answered about that name instead of being told nothing is held.
 * The same catalogue is handed to the live voices, to the written answers and to the Kibembe chat.
 */

const MAX_STORIES = 150;

// What one catalogue rides with: a story line each, cut at a line, never in the middle of one.
const HEAD =
  "\nORODHA YA HADITHI NA KAZI ZA MWENYEJI — the admin's own stories, and the songs, videos and " +
  "channels saved with them:\n" +
  "Hizi ni hadithi zilizohifadhiwa kwenye app hii, pamoja na majina ya nyimbo, video na channel ya " +
  "msanii. Mtu akitaja jina lolote lililo hapa chini — hadithi, wimbo, video au channel — ni jambo " +
  "hili hili: jibu kutoka kwenye hadithi hiyo, na litaje jina lake kama admin alivyoandika. " +
  "Usiseme hujui wala hakuna, na usibuni jina lisilokuwepo hapa.\n";

function textOf(value: any): string {
  return typeof value === "string" ? value : "";
}

function rowsOf(page: any): any[] {
  return Array.isArray(page) ? page : page?.items || [];
}

/** One story's line: its name, what it is filed under, and every name published with it. */
function lineOf(row: any) {
  const title = textOf(row?.title).replace(/\s+/g, " ").trim().slice(0, 120);
  if (!title) return "";
  const tags = (Array.isArray(row?.tags) ? row.tags : [])
    .map((tag: any) => textOf(tag).trim())
    .filter(Boolean)
    .slice(0, 6)
    .join(", ");
  const names = (Array.isArray(row?.artist_links) ? row.artist_links : [])
    .map((entry: any) => textOf(entry?.name).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 12);
  const channel = textOf(row?.channel_url).trim().slice(0, 160);

  const parts = [
    names.length ? `kazi: ${names.join(" · ")}` : "",
    channel ? `channel: ${channel}` : "",
    tags ? `tags: ${tags}` : "",
  ].filter(Boolean);

  return `- ${title}${parts.length ? ` — ${parts.join(" · ")}` : ""}\n`;
}

/** The catalogue as the text a turn rides with, or nothing when the admin has saved no story. */
export function catalogueText(rows: any[], budget = 1500) {
  const lines: string[] = [];
  let used = HEAD.length;

  for (const row of Array.isArray(rows) ? rows : []) {
    const line = lineOf(row);
    if (!line) continue;
    if (used + line.length > budget) break;
    lines.push(line);
    used += line.length;
  }

  return lines.length ? HEAD + lines.join("") : "";
}

/**
 * The catalogue of every published story. A catalogue that could not be read is nothing at all: a
 * turn is never held up, and nothing is claimed about stories that were not read.
 */
export async function storyCatalogueBlock(base44: any, budget = 1500): Promise<string> {
  try {
    const page = await base44.asServiceRole.entities.Story.filter(
      { published: true },
      { sort: "-updated_date", limit: MAX_STORIES, fields: ["title", "tags", "channel_url", "artist_links"] }
    );
    return catalogueText(rowsOf(page), budget);
  } catch (error: any) {
    console.error("The story catalogue could not be read:", error?.message);
    return "";
  }
}