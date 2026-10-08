import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import {
  docKnowledge,
  docRules,
  docWordRows,
  rowsOf,
  textOf,
} from "../../shared/knowledgeDoc.ts";

/**
 * The one knowledge document: opened, saved as a draft, and published.
 *
 * Nothing here is read by an AI — the published text of the document is what every AI reads, and the
 * draft is the admin's own working copy. The document is made the first time an admin opens it, and
 * everything that was saved in the older, separate places — the word entries, the questions, the
 * world notes and the long texts — is gathered into it at that one moment, so nothing is lost and
 * nothing is gathered twice.
 *
 * The whole document is larger than one record may hold, so its text is kept in parts, each cut
 * between two lines, and read back as one text.
 */

const DOC_KEY = "main";

// how much of the document each part holds, and the ceiling of the whole document. A part is small
// enough to stay well inside what a record carries.
const PART = 12000;
const MAX_PARTS = 200;
const MAX_DOC = 600000;

// The shape a new document is opened with: the parts it is made of, and how a line is written in
// each of them. A line beginning with # is a note to the admin alone, and is never read as knowledge.
const OPENING = [
  "# WORDS",
  "# one line for each word:  ebembe word (how it sounds) = meaning | how to use it",
  "# the reading between brackets is for the voice only — it is never shown or spoken to anyone",
  "(your words go here)",
  "",
  "# PHRASES",
  "# one line for each phrase:  kibembe phrase = meaning",
  "(your phrases go here)",
  "",
  "# RULES",
  "# how Kibembe is read, written and used — one rule to a line",
  "(your rules go here)",
  "",
  "# KNOWLEDGE",
  "# anything else the assistant must know: a question and its answer, a note about the world",
  "(your knowledge goes here)",
  "",
].join("\n");

// how much of the older store is gathered in at that one moment
const MERGE_WORDS = 12000;
const MERGE_NOTES = 1000;
const MERGE_TEXTS = 50;
const PAGE = 500;
// a rule book is gathered in whole up to this room, and a long text keeps this much of itself
const RULE_ROOM = 24000;
const TEXT_ROOM = 4000;

// a long text whose title mentions rules is the rule book, as it always was
const RULE_TITLE = /(rule|sheria|kanuni)/i;

const now = () => new Date().toISOString();

/** One word entry of the older store as a line of the document. */
function entryWordLine(row: any): string {
  const term = textOf(row?.term).replace(/\s+/g, " ").trim();
  if (!term) return "";
  const guide = textOf(row?.guide).replace(/\s+/g, " ").trim();
  const meaning = textOf(row?.meaning).replace(/\s+/g, " ").trim();
  const usage = textOf(row?.usage).replace(/\s+/g, " ").trim();
  return `${guide ? `${term} (${guide})` : term} = ${meaning}${usage ? ` | ${usage}` : ""}`;
}

/** Every word entry of the older store, a page at a time. */
async function entryWords(service: any) {
  const rows: any[] = [];
  let cursor = "";

  while (rows.length < MERGE_WORDS) {
    const options: any = { limit: PAGE, fields: ["term", "meaning", "guide", "usage"] };
    if (cursor) options.cursor = cursor;
    const page = await service.entities.AssistantKnowledge.filter({ kind: "word" }, options);
    rowsOf(page).forEach((row: any) => {
      if (row?.term) rows.push(row);
    });
    const next = page?.has_more ? page?.next_cursor : "";
    if (!next) break;
    cursor = next;
  }

  return rows.slice(0, MERGE_WORDS);
}

/** Every question and world note of the older store, a page at a time. */
async function entryNotes(service: any) {
  const rows: any[] = [];
  let cursor = "";

  while (rows.length < MERGE_NOTES) {
    const options: any = {
      limit: PAGE,
      fields: ["kind", "question", "answer", "title", "text"],
    };
    if (cursor) options.cursor = cursor;
    const page = await service.entities.AssistantKnowledge.filter(
      { kind: { $in: ["qa", "note"] } },
      options
    );
    rowsOf(page).forEach((row: any) => rows.push(row));
    const next = page?.has_more ? page?.next_cursor : "";
    if (!next) break;
    cursor = next;
  }

  return rows.slice(0, MERGE_NOTES);
}

/** The lines a question or a world note is written as in the document. */
function noteLines(row: any): string[] {
  const tidy = (value: any) => textOf(value).replace(/\s+/g, " ").trim();
  if (row?.kind === "qa") {
    const question = tidy(row.question);
    const answer = tidy(row.answer);
    if (!question || !answer) return [];
    return [`Q: ${question}`, `A: ${answer}`, ""];
  }
  const title = tidy(row?.title);
  const body = tidy(row?.text);
  if (!body) return [];
  return [title ? `${title} — ${body}` : body, ""];
}

/**
 * Everything the admin had saved in the older, separate places, written into one document: the
 * words and the phrases, the rule book, the questions, the world notes and the long texts. A long
 * text too long for the document keeps its beginning and says so on the line that closes it, so
 * nothing is dropped without the admin being told.
 */
async function gather(service: any) {
  const [words, notes, textsPage] = await Promise.all([
    entryWords(service),
    entryNotes(service),
    service.entities.KnowledgeText.filter(
      {},
      { sort: "-created_date", limit: MERGE_TEXTS, fields: ["title", "text"] }
    ),
  ]);
  const texts = rowsOf(textsPage);

  const wordLines: string[] = [];
  const phraseLines: string[] = [];
  words.forEach((row: any) => {
    const line = entryWordLine(row);
    if (!line) return;
    const term = textOf(row.term).replace(/\s+/g, " ").trim();
    (term.split(" ").length > 1 ? phraseLines : wordLines).push(line);
  });

  const ruleLines: string[] = [];
  const knowledgeLines: string[] = [];
  let rulesSize = 0;

  texts.forEach((row: any) => {
    const title = textOf(row?.title).replace(/\s+/g, " ").trim();
    const body = textOf(row?.text).replace(/\r/g, "").trim();
    if (!body) return;

    if (RULE_TITLE.test(title)) {
      const room = RULE_ROOM - rulesSize;
      if (room <= 0) return;
      const kept = body.slice(0, room);
      rulesSize += kept.length;
      ruleLines.push(title ? `## ${title}` : "##", kept);
      if (kept.length < body.length) {
        ruleLines.push(`# (the rest of "${title}" stays in Long texts, and is still answered from)`);
      }
      return;
    }

    const kept = body.slice(0, TEXT_ROOM);
    knowledgeLines.push(title ? `## ${title}` : "", kept);
    if (kept.length < body.length) {
      knowledgeLines.push(`# (the rest of "${title}" stays in Long texts, and is still answered from)`);
    }
    knowledgeLines.push("");
  });

  notes.forEach((row: any) => knowledgeLines.push(...noteLines(row)));

  const text = [
    "# WORDS",
    "# one line for each word:  ebembe word (how it sounds) = meaning | how to use it",
    ...wordLines,
    "",
    "# PHRASES",
    "# one line for each phrase:  kibembe phrase = meaning",
    ...phraseLines,
    "",
    "# RULES",
    "# how Kibembe is read, written and used — one rule to a line",
    ...ruleLines,
    "",
    "# KNOWLEDGE",
    "# anything else the assistant must know: a question and its answer, a note about the world",
    ...knowledgeLines,
    "",
  ].join("\n");

  return {
    text,
    counts: {
      words: wordLines.length,
      phrases: phraseLines.length,
      notes: notes.length,
      texts: texts.length,
    },
  };
}

/** The document's state row, which is where its working copy and its published text are dated. */
async function stateRow(service: any) {
  const page = await service.entities.KnowledgeDoc.filter(
    { key: DOC_KEY, kind: "state" },
    { limit: 1 }
  );
  return rowsOf(page)[0] || null;
}

/** The stored parts of one text, in their own order. */
async function partRows(service: any, kind: string) {
  const page = await service.entities.KnowledgeDoc.filter(
    { key: DOC_KEY, kind },
    { sort: "part", limit: MAX_PARTS, fields: ["part", "text"] }
  );
  return rowsOf(page).sort((a: any, b: any) => Number(a.part || 0) - Number(b.part || 0));
}

/** One text of the document, read back out of its parts. */
async function readText(service: any, kind: string) {
  const rows = await partRows(service, kind);
  return rows.map((row: any) => textOf(row.text)).join("");
}

/** The text cut into parts, each cut between two lines so no line is ever split in half. */
function cut(text: string): string[] {
  const parts: string[] = [];
  let rest = text;

  while (rest.length > PART) {
    const room = rest.slice(0, PART);
    const at = room.lastIndexOf("\n");
    const end = at > PART * 0.6 ? at + 1 : PART;
    parts.push(rest.slice(0, end));
    rest = rest.slice(end);
  }
  parts.push(rest);

  return parts;
}

/**
 * One text written back in its parts: a part already there is written over, a new one is added, and
 * a part left behind by a longer earlier text is taken away — so whatever was published before is
 * never left standing inside what is published now.
 */
async function writeText(service: any, kind: string, text: string) {
  const parts = cut(text);
  const rows = await partRows(service, kind);

  const fresh: any[] = [];
  const changed: any[] = [];

  parts.forEach((value, index) => {
    const kept = rows[index];
    if (!kept?.id) {
      fresh.push({ key: DOC_KEY, kind, part: index, text: value });
      return;
    }
    if (textOf(kept.text) !== value || Number(kept.part) !== index) {
      changed.push({ id: kept.id, part: index, text: value });
    }
  });

  if (fresh.length) await service.entities.KnowledgeDoc.bulkCreate(fresh);
  if (changed.length) await service.entities.KnowledgeDoc.bulkUpdate(changed);

  const extra = rows
    .slice(parts.length)
    .map((row: any) => row.id)
    .filter(Boolean);
  if (extra.length) await service.entities.KnowledgeDoc.deleteMany({ id: { $in: extra } });
}

/** How much the document holds, so the panel can say it at a glance. */
function countsOf(text: any) {
  return {
    words: docWordRows(text).length,
    rules: docRules(text).split("\n").filter(Boolean).length,
    knowledge: docKnowledge(text).length,
  };
}

/** The document as the panel reads it: the working copy, the published text, and what each holds. */
async function view(service: any, state: any, gathered?: any) {
  const draft = await readText(service, "draft");
  const published = await readText(service, "published");
  const shown: any = {
    draft,
    published,
    draft_at: textOf(state?.draft_at),
    // the file the working copy was last imported from, kept for the admin's own reference: only a
    // part of a long document fits here, and the whole of it stays openable beside this one
    source: {
      name: textOf(state?.source_file_name),
      uri: textOf(state?.source_file_uri),
      chars: Number(state?.source_chars) || 0,
      at: textOf(state?.source_at),
    },
    published_at: textOf(state?.published_at),
    published_by: textOf(state?.published_by),
    merged_at: textOf(state?.merged_at),
    draft_counts: countsOf(draft),
    published_counts: countsOf(published),
  };
  if (gathered) shown.gathered = gathered;
  return shown;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Ingia kwenye akaunti kwanza." }, { status: 401 });
    if (user.role !== "admin") {
      return Response.json({ error: "Ni admin tu anayeweza kusimamia maarifa." }, { status: 403 });
    }

    const service = base44.asServiceRole;
    let payload: any = {};
    try {
      payload = await req.json();
    } catch (err) {
      payload = {};
    }
    const action = typeof payload?.action === "string" ? payload.action : "open";

    let state = await stateRow(service);

    // The document is opened once. Everything the admin had saved in the older places is gathered
    // into it at that one moment and marked as gathered, so what they write here afterwards is never
    // written over.
    if (!state) {
      const gathered = await gather(service);
      state = await service.entities.KnowledgeDoc.create({
        key: DOC_KEY,
        kind: "state",
        part: 0,
        draft_at: now(),
        merged_at: now(),
      });
      await writeText(service, "draft", gathered.text || OPENING);
      return Response.json(await view(service, state, gathered.counts));
    }

    if (action === "saveDraft") {
      const draft = textOf(payload?.draft);
      if (draft.length > MAX_DOC) {
        return Response.json(
          { error: "The document is larger than the app can hold. Take a part of it out, then save." },
          { status: 400 }
        );
      }
      await writeText(service, "draft", draft);
      const at = now();
      await service.entities.KnowledgeDoc.update(state.id, { draft_at: at });
      return Response.json(await view(service, { ...state, draft_at: at }));
    }

    if (action === "publish") {
      const draft = await readText(service, "draft");
      await writeText(service, "published", draft);
      const at = now();
      await service.entities.KnowledgeDoc.update(state.id, {
        published_at: at,
        published_by: user.email,
      });
      return Response.json(
        await view(service, { ...state, published_at: at, published_by: user.email })
      );
    }

    if (action === "restore") {
      const published = await readText(service, "published");
      await writeText(service, "draft", published);
      const at = now();
      await service.entities.KnowledgeDoc.update(state.id, { draft_at: at });
      return Response.json(await view(service, { ...state, draft_at: at }));
    }

    // The document a working copy was imported from, kept on the document's own state row: the file
    // is stored privately and opened through a short-lived link, so it is never public and is only
    // ever read by the admin who put it there.
    if (action === "source") {
      const source = payload?.source || {};
      const name = textOf(source?.name).replace(/\s+/g, " ").trim().slice(0, 200);
      const uri = textOf(source?.file_uri).trim();
      const chars = Math.max(0, Number(source?.chars) || 0);
      // a stored file only: this never keeps a web address a caller handed it
      if (!name || !uri || /^https?:/i.test(uri)) {
        return Response.json({ error: "That file could not be kept." }, { status: 400 });
      }
      const at = now();
      await service.entities.KnowledgeDoc.update(state.id, {
        source_file_name: name,
        source_file_uri: uri,
        source_chars: chars,
        source_at: at,
      });
      return Response.json({
        ...(await view(service, state)),
        source: { name, uri, chars, at },
      });
    }

    if (action === "open") return Response.json(await view(service, state));

    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (error: any) {
    console.error("The knowledge document could not be handled:", error?.message);
    return Response.json(
      { error: "The document could not be handled just now. Try again." },
      { status: 500 }
    );
  }
}