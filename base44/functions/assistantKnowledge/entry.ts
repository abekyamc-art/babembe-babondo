import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// the note rides along with a typed message, so it is kept to a size a session
// opening can carry without bloating it
const MAX_NOTE = 4000;
const MAX_ROWS = 200;

const OPENING =
  "MAARIFA YA MWENYEJI (what the admin has written for you to know):\n" +
  "Majibu yako kuhusu ulimwengu wa Babembe, utamaduni wake, na lugha ya Ebembe yatokee kwenye maarifa haya kwanza.\n";

const FALLBACK =
  "\nKama swali halipo kwenye maarifa haya, jibu kwa ufahamu wako wa kawaida, lakini sema wazi katika jibu hilo kwamba jibu hilo halitoki kwenye maarifa ya admin.\n";

const SECTIONS = [
  { kind: "qa", title: "MASWALI NA MAJIBU" },
  { kind: "note", title: "MAELEZO YA ULIMWENGU" },
  { kind: "word", title: "MANENO YA EBEMBE" },
];

function textOf(value) {
  return typeof value === "string" ? value.trim() : "";
}

/** One written entry, as a single line the assistant can read. */
function lineFor(row) {
  if (row.kind === "qa") {
    const question = textOf(row.question);
    const answer = textOf(row.answer);
    return question && answer ? `Q: ${question}\nA: ${answer}` : "";
  }
  if (row.kind === "note") {
    const title = textOf(row.title);
    const body = textOf(row.text);
    if (!body) return "";
    return title ? `${title} — ${body}` : body;
  }
  if (row.kind === "word") {
    const term = textOf(row.term);
    const meaning = textOf(row.meaning);
    const usage = textOf(row.usage);
    if (!term || !meaning) return "";
    return `${term} = ${meaning}${usage ? ` (${usage})` : ""}`;
  }
  return "";
}

/** The three kinds in order, each kept inside the note's size budget. */
function buildNote(rows) {
  const budget = MAX_NOTE - OPENING.length - FALLBACK.length;
  let body = "";

  for (const section of SECTIONS) {
    const lines = rows
      .filter((row) => row.kind === section.kind)
      .map(lineFor)
      .filter(Boolean);
    if (!lines.length) continue;

    const head = `${body ? "\n" : ""}${section.title}\n`;
    if (body.length + head.length > budget) break;
    body += head;

    for (const line of lines) {
      const item = `- ${line}\n`;
      if (body.length + item.length > budget) break;
      body += item;
    }
  }

  return body ? OPENING + body + FALLBACK : "";
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    // the entries themselves stay private to the admin: only this derived note
    // leaves the server, and it is the same text the assistant is given anyway
    const page = await base44.asServiceRole.entities.AssistantKnowledge.filter(
      {},
      { sort: "created_date", limit: MAX_ROWS }
    );
    const rows = Array.isArray(page) ? page : page?.items || [];

    return Response.json({ note: buildNote(rows) });
  } catch (error) {
    console.error("Could not build the knowledge note:", error.message);
    return Response.json({ error: "Knowledge is unavailable right now." }, { status: 500 });
  }
}