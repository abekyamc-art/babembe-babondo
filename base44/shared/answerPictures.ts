/**
 * The pictures the admin saved beside words, found for the words a turn is made of.
 *
 * One place, so every answer that carries a picture carries the same one: the picture the admin filed
 * under a word is looked up by that word standing in what the person asked, and then by it standing
 * in the answer itself. The word the person asked about comes first, and the plainest word first of
 * those — so a question about mtu is answered with the picture of mtu, not with the picture of the
 * longest phrase that happens to hold the word.
 *
 * Each picture is handed back through a short-lived link of its own, because it is kept privately and
 * is never at a public address. Only the word, the name and that link are handed over — the storage
 * reference itself never leaves the server.
 */

// What one answer carries: two at the most, so the answer stays readable
const MOST = 2;
// and how long the link it is shown through lives
const LINK_SECONDS = 1800;
const ROWS = 200;

const rowsOf = (page: any): any[] => (Array.isArray(page) ? page : page?.items || []);

/** The word a picture is filed under, or nothing at all where it has no word yet. */
const termOf = (value: any): string =>
  String(value || "")
    .replace(/[?\s]+/g, " ")
    .trim()
    .slice(0, 60);

/** Whether a word stands in a line as a word of its own, and not as a part of a longer one. */
function holds(line: string, term: string): boolean {
  const safe = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try {
    return new RegExp(`(?:^|[^\\p{L}\\p{N}])${safe}(?:$|[^\\p{L}\\p{N}])`, "iu").test(line);
  } catch (error: any) {
    return line.toLowerCase().indexOf(term.toLowerCase()) >= 0;
  }
}

/**
 * The pictures this turn goes with: the ones saved under the words the person asked about, and then
 * the ones saved under the words the answer itself says. An empty list is an answer with no picture,
 * which is most answers.
 */
export async function turnPictures(base44: any, question: string, answer: string): Promise<any[]> {
  try {
    const page = await base44.asServiceRole.entities.KnowledgeImage.list({
      limit: ROWS,
      fields: ["term", "name", "file_uri"],
    });
    const rows = rowsOf(page).filter((row: any) => row?.file_uri && termOf(row.term));
    if (!rows.length) return [];

    const asked = String(question || "");
    const said = String(answer || "");

    const ranked = rows
      .map((row: any) => ({ row, term: termOf(row.term) }))
      .map((held: any) => ({
        ...held,
        score: holds(asked, held.term) ? 2 : holds(said, held.term) ? 1 : 0,
      }))
      .filter((held: any) => held.score > 0)
      // the word the person asked about first, and of those the plainest one first
      .sort((a: any, b: any) => b.score - a.score || a.term.length - b.term.length);

    const picked: any[] = [];
    const seen = new Set<string>();

    for (const held of ranked) {
      if (picked.length >= MOST) break;
      const key = held.term.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
        file_uri: held.row.file_uri,
        expires_in: LINK_SECONDS,
      });
      if (!signed?.signed_url) continue;
      picked.push({
        term: held.term,
        name: String(held.row.name || ""),
        url: signed.signed_url,
      });
    }

    return picked;
  } catch (error: any) {
    // a picture that could not be found never holds up an answer
    console.error("The pictures for a turn could not be read:", error?.message);
    return [];
  }
}