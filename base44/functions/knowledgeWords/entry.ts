import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import {
  MAX_MEANING,
  MAX_TERM,
  MAX_USAGE,
  clean,
  glossOf,
  isWordEntry,
} from "../../shared/knowledgeWords.ts";

// the store is read and written in these sizes, so a list of any length is handled
const PAGE = 500;
const MAX_ROWS = 20000;
const MAX_SAVE = 500;
const MAX_DELETE = 200;
const FIELDS = ["term", "meaning", "guide", "usage", "created_date", "updated_date"];

/** Every saved word row, a page at a time. */
async function wordRows(service: any) {
  const rows: any[] = [];
  let cursor: string | undefined;

  while (rows.length < MAX_ROWS) {
    const options: any = { limit: PAGE, fields: FIELDS };
    if (cursor) options.cursor = cursor;
    const page = await service.entities.AssistantKnowledge.filter({ kind: "word" }, options);
    const items = Array.isArray(page) ? page : page?.items || [];
    items.forEach((row: any) => {
      if (row?.id) rows.push(row);
    });
    const next = page?.has_more ? page?.next_cursor : "";
    if (!next) break;
    cursor = next;
  }

  return rows;
}

/** Every spelling already saved, so a pasted term is never written twice. */
async function savedKeys(service: any) {
  const keys = new Set<string>();
  let cursor: string | undefined;

  while (keys.size < MAX_ROWS) {
    const options: any = { limit: PAGE, fields: ["term"] };
    if (cursor) options.cursor = cursor;
    const page = await service.entities.AssistantKnowledge.filter({ kind: "word" }, options);
    const items = Array.isArray(page) ? page : page?.items || [];
    items.forEach((row: any) => {
      const key = clean(row?.term, MAX_TERM).toLowerCase();
      if (key) keys.add(key);
    });
    const next = page?.has_more ? page?.next_cursor : "";
    if (!next) break;
    cursor = next;
  }

  return keys;
}

/** The row of a word written twice: the one whose meaning is already the gloss, then the one
 *  that carries more beside it, then the most recent. */
function better(a: any, b: any) {
  const score = (row: any) => [
    isWordEntry(clean(row.term, MAX_TERM), clean(row.meaning, MAX_MEANING)) ? 1 : 0,
    (row.usage ? 1 : 0) + (row.guide ? 1 : 0),
    Date.parse(row.updated_date || row.created_date || "") || 0,
  ];
  const mine = score(a);
  const theirs = score(b);
  for (let i = 0; i < mine.length; i += 1) {
    if (mine[i] !== theirs[i]) return mine[i] > theirs[i];
  }
  return false;
}

/** Which rows stand and which go: a word has to be a real word with a short meaning, and one
 *  spelling of a word is kept once. */
function split(rows: any[]) {
  const keep = new Map<string, any>();
  const drop: any[] = [];
  let duplicates = 0;

  rows.forEach((row) => {
    const term = clean(row.term, MAX_TERM);
    const key = term.toLowerCase();
    if (!key || !isWordEntry(term, glossOf(term, row.meaning))) {
      drop.push(row);
      return;
    }
    const held = keep.get(key);
    if (!held) {
      keep.set(key, row);
      return;
    }
    duplicates += 1;
    if (better(row, held)) {
      drop.push(held);
      keep.set(key, row);
    } else {
      drop.push(row);
    }
  });

  return { keep, drop, duplicates };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Ingia kwenye akaunti kwanza." }, { status: 401 });
    if (user.role !== "admin") {
      return Response.json({ error: "Ni admin tu anayeweza kusimamia maneno." }, { status: 403 });
    }

    let payload: any = {};
    try {
      payload = await req.json();
    } catch (err) {
      payload = {};
    }

    const service = base44.asServiceRole;
    const action = typeof payload?.action === "string" ? payload.action : "count";

    // a whole pasted list handed over at once: a pair that is not a word with a short meaning
    // is left with the rules, and a term already saved is skipped instead of written twice
    if (action === "save") {
      const entries = (Array.isArray(payload?.entries) ? payload.entries : []).slice(0, MAX_SAVE);
      const known = await savedKeys(service);
      const seen = new Set<string>();
      const fresh: any[] = [];
      let notWord = 0;
      let already = 0;

      entries.forEach((entry: any) => {
        const term = clean(entry?.term, MAX_TERM);
        const meaning = clean(entry?.meaning, MAX_MEANING);
        const key = term.toLowerCase();
        if (!isWordEntry(term, glossOf(term, meaning))) {
          notWord += 1;
          return;
        }
        if (!key || known.has(key) || seen.has(key)) {
          already += 1;
          return;
        }
        seen.add(key);
        fresh.push({
          kind: "word",
          term,
          meaning,
          guide: clean(entry?.guide, MAX_USAGE),
          usage: "",
        });
      });

      let saved: any[] = [];
      if (fresh.length) {
        const created = await service.entities.AssistantKnowledge.bulkCreate(fresh);
        saved = Array.isArray(created) ? created : [];
      }

      return Response.json({ saved, notWord, already });
    }

    const rows = await wordRows(service);
    const { keep, drop, duplicates } = split(rows);
    const counts = { saved: rows.length, kept: keep.size, removed: drop.length, duplicates };

    if (action !== "clean") return Response.json(counts);

    // only the rows of the saved word list are ever touched, and only the ones that go
    for (let i = 0; i < drop.length; i += MAX_DELETE) {
      const ids = drop.slice(i, i + MAX_DELETE).map((row: any) => row.id);
      await service.entities.AssistantKnowledge.deleteMany({ id: { $in: ids } });
    }

    return Response.json(counts);
  } catch (error: any) {
    console.error("The saved word list could not be handled:", error?.message);
    return Response.json(
      { error: "Maneno hayakuweza kushughulikiwa. Jaribu tena." },
      { status: 500 }
    );
  }
}