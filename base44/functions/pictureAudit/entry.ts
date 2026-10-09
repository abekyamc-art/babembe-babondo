import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { docWordRows, publishedDoc, readDocText, rowsOf } from "../../shared/knowledgeDoc.ts";

/**
 * Every picture looked at, and the word it stands beside put right.
 *
 * A picture is filed with the word of its file name — so a picture of a house can end up standing
 * beside the word for cow. This reads each picture with the AI to see what it really shows, looks
 * that up in the words of the admin's own document, and writes the word the document itself gives it.
 *
 * Nothing is ever invented: a word is written for a picture only when the picture's own subject, or
 * the Kiswahili or Ebembe name the AI gave it, is a word the document really holds. A picture showing
 * something the document has no word for, one the AI cannot make out, and one whose subject more than
 * one word of the document fits, are left exactly as they are and handed back to the admin to decide.
 *
 * A picture still waiting for its two looks keeps waiting, with the right word written for it; a
 * picture already saved beside a word is written over with the right word, never filed a second time.
 *
 * The whole lot is too many for one call to look at, so it works a run at a time and says where it
 * stopped, and the next call carries on from there.
 */

const MAX_BATCH = 8;
const CHUNK = 3;
const TIME_ROOM = 45000;
const PAGE = 500;
const MAX_EACH = 3000;
const MAX_TERM = 40;

const BY_CHECK = "checked against the picture and your document";
const WAITING = ["name", "file_url", "term", "how", "stage", "in_doc", "batch", "drawn"];
const SAVED = ["term", "name", "file_url", "file_uri", "how"];

// what a picture is never filed as: a thing nobody draws a word for
const GENERIC = new Set([
  "picture", "image", "photo", "photograph", "object", "thing", "item", "background", "diagram",
  "drawing", "illustration", "logo", "sign", "text", "letter", "word", "symbol", "map", "chart",
  "pattern", "decoration", "unknown", "none", "scene", "view", "closeup", "art", "painting",
  "screenshot", "card", "page", "poster", "banner", "frame", "wallpaper", "person", "people",
]);

const clean = (value: any, max: number): string =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const plain = (value: any): string =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const wordsOf = (value: any): string[] => plain(value).split(" ").filter(Boolean);

/** A word with its ending taken off, so "cows" is looked for as "cow". */
function singular(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

type Entry = { term: string; key: string; meaning: string; meaningWords: string[] };

/** The words of the admin's document, with what each one means. */
async function documentWords(base44: any): Promise<Entry[]> {
  let text = "";
  try {
    text = await publishedDoc(base44);
  } catch (error: any) {
    text = "";
  }
  if (!String(text || "").trim()) {
    try {
      text = await readDocText(base44, "draft");
    } catch (error: any) {
      text = "";
    }
  }

  const seen = new Set<string>();
  const entries: Entry[] = [];
  docWordRows(text).forEach((row: any) => {
    const term = clean(row?.term, MAX_TERM);
    const key = plain(term);
    if (term.length < 2 || !key || seen.has(key)) return;
    seen.add(key);
    entries.push({ term, key, meaning: plain(row?.meaning), meaningWords: wordsOf(row?.meaning) });
  });
  return entries;
}

/** Every word of the document that says what the picture showed, and how well each one fits. */
function fits(entries: Entry[], said: string[]) {
  const looked = new Set<string>();
  said.forEach((value: any) => {
    const whole = plain(value);
    if (whole.length >= 3 && !GENERIC.has(whole)) looked.add(whole);
    wordsOf(value).forEach((word) => {
      if (word.length < 3 || GENERIC.has(word)) return;
      looked.add(word);
      looked.add(singular(word));
    });
  });

  const hits: { entry: Entry; rank: number; size: number }[] = [];
  looked.forEach((word) => {
    entries.forEach((entry) => {
      let rank = -1;
      if (entry.key === word) rank = 0;
      else if (entry.meaning === word) rank = 1;
      else if (entry.meaningWords[0] === word) rank = 2;
      else if (entry.meaningWords.includes(word)) rank = 3;
      if (rank < 0) return;
      hits.push({ entry, rank, size: entry.meaningWords.length });
    });
  });
  return hits;
}

/** The one word of the document that fits best, or nothing where more than one fits as well. */
function bestFit(entries: Entry[], said: string[]): Entry | null {
  const hits = fits(entries, said);
  if (!hits.length) return null;
  hits.sort((a, b) => a.rank - b.rank || a.size - b.size);
  const best = hits[0];
  const tied = hits.some(
    (hit) => hit.rank === best.rank && hit.size === best.size && hit.entry.term !== best.entry.term
  );
  return tied ? null : best.entry;
}

/** What the picture actually shows, as the AI sees it. */
async function look(base44: any, url: string) {
  const seen = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt:
      "You are shown one picture from a picture dictionary of Ebembe (Kibembe), the Bantu language of " +
      "the Babembe people. The word the picture is filed under is often wrong, and you are looking at " +
      "the picture itself to say what it really shows.\n\n" +
      "Answer with JSON only:\n" +
      '- "subject": ONE common English noun for the thing the picture mainly shows — for example "cow", ' +
      '"house", "river", "child", "tree". No article, no describing words, no sentence. Where several ' +
      "things are shown, name the one that takes up the picture.\n" +
      '- "swahili": the same thing as one Kiswahili noun, when you know it, otherwise "".\n' +
      '- "kibembe": the same thing as one Ebembe word, when you know it, otherwise "".\n' +
      '- "clear": true only when you can really make out one recognisable thing. Set it false for a ' +
      "blurred, dark, tiny, abstract or decorated picture, a flag, a logo, a map, a diagram or writing.\n\n" +
      'Never guess. It is better to set "clear" to false with an empty subject than to name a thing you ' +
      "cannot see.",
    file_urls: [url],
    response_json_schema: {
      type: "object",
      properties: {
        subject: { type: "string" },
        swahili: { type: "string" },
        kibembe: { type: "string" },
        clear: { type: "boolean" },
      },
      required: ["subject", "clear"],
    },
  });
  return seen || {};
}

/** Every picture of the app: the ones waiting for their two looks, then the ones already saved. */
async function readAll(base44: any, name: string, fields: string[]) {
  const rows: any[] = [];
  let cursor = "";
  while (rows.length < MAX_EACH) {
    const options: any = { sort: "-created_date", limit: PAGE, fields };
    if (cursor) options.cursor = cursor;
    const page = await base44.entities[name].list(options);
    rowsOf(page).forEach((row: any) => rows.push(row));
    const next = page?.has_more ? page?.next_cursor : "";
    if (!next) break;
    cursor = next;
  }
  return rows;
}

async function allPictures(base44: any) {
  const [waiting, saved] = await Promise.all([
    readAll(base44, "ImageMatch", WAITING),
    readAll(base44, "KnowledgeImage", SAVED),
  ]);
  return [
    ...waiting.map((row: any) => ({ ...row, kind: "waiting" })),
    ...saved.map((row: any) => ({ ...row, kind: "saved" })),
  ];
}

/** An address the AI may open the picture at — the public one, or a short-lived link to a private one. */
async function addressOf(base44: any, row: any) {
  const open = String(row.file_url || "").trim();
  if (/^https:\/\//i.test(open)) return open;
  if (!row.file_uri) return "";
  try {
    const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: row.file_uri,
      expires_in: 900,
    });
    return String(signed?.signed_url || "");
  } catch (error: any) {
    return "";
  }
}

/** One run of the check: the pictures from where it stopped, one run's worth at a time. */
async function audit(base44: any, offset: number, batch: number) {
  const started = Date.now();
  const entries = await documentWords(base44);
  const all = await allPictures(base44);
  const total = all.length;
  const slice = all.slice(offset, offset + batch);

  const changes: any[] = [];
  const unsureRows: any[] = [];
  let checked = 0;
  let fixed = 0;
  let right = 0;
  let unsure = 0;

  const hold = (row: any, saw: string, why: string) => {
    unsure += 1;
    unsureRows.push({ name: clean(row?.name, 120) || "picture", word: clean(row?.term, MAX_TERM), saw, why });
  };

  const one = async (row: any) => {
    const was = clean(row.term, MAX_TERM);
    const url = await addressOf(base44, row);
    if (!url) {
      hold(row, "", "The picture itself could not be opened for a look.");
      return;
    }

    let seen: any = null;
    try {
      seen = await look(base44, url);
    } catch (error: any) {
      seen = null;
    }
    const subject = clean(seen?.subject, 40);
    if (!seen || seen.clear === false || !subject) {
      hold(row, subject, "The AI could not make out one clear thing in it.");
      return;
    }

    const found = bestFit(entries, [subject, seen?.swahili, seen?.kibembe]);
    if (!found) {
      const near = fits(entries, [subject, seen?.swahili, seen?.kibembe]).length;
      hold(
        row,
        subject,
        near ? "More than one word of your document fits what it shows." : "Your document has no word for what it shows."
      );
      return;
    }

    if (plain(found.term) === plain(was)) {
      right += 1;
      // a word of the document is in the document, whatever the row was filed as
      if (row.kind === "waiting" && row.in_doc === false) {
        try {
          await base44.entities.ImageMatch.update(row.id, { in_doc: true });
        } catch (error: any) {
          // the word already stands; a note that could not be written changes nothing
        }
      }
      return;
    }

    try {
      if (row.kind === "saved") {
        await base44.entities.KnowledgeImage.update(row.id, { term: found.term, how: BY_CHECK });
      } else {
        await base44.entities.ImageMatch.update(row.id, { term: found.term, how: BY_CHECK, in_doc: true });
      }
      fixed += 1;
      changes.push({
        name: clean(row.name, 120) || "picture",
        saw: subject,
        was,
        term: found.term,
        kind: row.kind,
      });
    } catch (error: any) {
      hold(row, subject, "The word could not be written for it just now.");
    }
  };

  let at = 0;
  while (at < slice.length) {
    const chunk = slice.slice(at, at + CHUNK);
    await Promise.allSettled(chunk.map((row) => one(row)));
    at += chunk.length;
    checked = at;
    if (Date.now() - started > TIME_ROOM) break;
  }

  const next = offset + checked;
  return {
    total,
    offset,
    checked,
    next,
    done: next >= total,
    right,
    fixed,
    unsure,
    changes,
    unsureRows,
  };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Ingia kwenye akaunti kwanza." }, { status: 401 });
    if (user.role !== "admin") {
      return Response.json({ error: "Ni admin peke yake anayeweza kuangalia picha." }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const action = clean(payload?.action, 24) || "count";

    if (action === "count") {
      const [waiting, saved] = await Promise.all([
        base44.entities.ImageMatch.count({}).catch(() => 0),
        base44.entities.KnowledgeImage.count({}).catch(() => 0),
      ]);
      return Response.json({ total: (Number(waiting) || 0) + (Number(saved) || 0) });
    }

    if (action !== "audit") return Response.json({ error: "Sijui kufanya hivyo." }, { status: 400 });

    const offset = Math.max(0, Math.floor(Number(payload?.offset) || 0));
    const batch = Math.min(MAX_BATCH, Math.max(1, Math.floor(Number(payload?.batch) || MAX_BATCH)));
    return Response.json(await audit(base44, offset, batch));
  } catch (error: any) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}