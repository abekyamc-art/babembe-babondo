import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// the note rides along with a typed message, so it is kept to a size a session
// opening can carry without bloating it; a message that also pulls passages out
// of the admin's long texts leaves them their own part of the budget
const MAX_NOTE = 4000;
const MAX_ROWS = 200;
const MAX_TEXTS = 50;
const MAX_PASSAGES = 4;
const PASSAGE_BUDGET = 2400;
const MAX_QUERY = 600;

const OPENING =
  "MAARIFA YA MWENYEJI (what the admin has written for you to know):\n" +
  "Majibu yako kuhusu ulimwengu wa Babembe, utamaduni wake, na lugha ya Ebembe yatokee kwenye maarifa haya kwanza.\n";

const FALLBACK =
  "\nKama swali halipo kwenye maarifa haya, jibu kwa ufahamu wako wa kawaida, lakini sema wazi katika jibu hilo kwamba jibu hilo halitoki kwenye maarifa ya admin.\n";

const PASSAGE_HEAD =
  "\nSEHEMU ZA MAANDISHI YA MWENYEJI (parts of the admin's own texts that match this question):\n" +
  "Jibu kutoka sehemu hizi kwa maneno yako, na sema wazi kama hakuna sehemu inayojibu swali hili.\n";

const SECTIONS = [
  { kind: "qa", title: "MASWALI NA MAJIBU" },
  { kind: "note", title: "MAELEZO YA ULIMWENGU" },
  { kind: "word", title: "MANENO YA EBEMBE" },
];

// short words that carry no meaning for matching, in both languages the admin writes in
const STOPWORDS = new Set([
  "the", "and", "for", "are", "was", "were", "with", "that", "this", "from", "what",
  "who", "why", "how", "when", "where", "which", "does", "did", "about", "into",
  "your", "you", "his", "her", "its", "our", "their", "them", "they", "have", "has",
  "had", "will", "would", "can", "could", "should", "not", "but", "all", "any",
  "some", "tell", "give", "please", "there", "here", "then", "than", "also",
  "kama", "nini", "nani", "wapi", "vipi", "gani", "huyu", "hawa", "hivyo",
  "lakini", "pia", "sana", "kila", "moja", "wetu", "wake", "wangu", "yako",
  "kwenye", "katika", "kuhusu", "ambayo", "ambao", "huu", "hii", "hilo",
]);

function textOf(value) {
  return typeof value === "string" ? value.trim() : "";
}

function rowsOf(page) {
  return Array.isArray(page) ? page : page?.items || [];
}

/** The content words of a question, either language, with the filler taken out. */
function tokensOf(value: string) {
  const found = value.toLowerCase().match(/[\p{L}\p{N}']+/gu) || [];
  return found.filter((token) => token.length > 2 && !STOPWORDS.has(token));
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
function buildNote(rows, maxNote) {
  const budget = maxNote - OPENING.length - FALLBACK.length;
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

/** The words a passage is made of, so no word is ever mistaken for part of another. */
function wordsOf(passage: string) {
  return (passage.toLowerCase().match(/[\p{L}\p{N}']+/gu) || []).filter((word) => word.length > 2);
}

/**
 * The passages of the admin's long texts that answer a question best. Matching
 * runs over the passages that were already cut when the texts were saved, so no
 * message ever reads a whole document; a word counts only when it stands on its
 * own or is the stem of a longer one.
 */
function bestPassages(query, texts) {
  const wanted = Array.from(new Set(tokensOf(query)));
  if (!wanted.length) return [];

  const found: Array<{
    title: string;
    text: string;
    lower: string;
    hits: Array<{ token: string; strong: boolean }>;
  }> = [];

  for (const text of texts) {
    const title = textOf(text.title);
    const passages = Array.isArray(text.passages) ? text.passages : [];
    for (const raw of passages) {
      const passage = textOf(raw);
      if (!passage) continue;
      const lower = passage.toLowerCase();
      // a cheap look first, so only the passages worth reading are taken apart into words
      const near = wanted.filter((token) => lower.includes(token));
      if (!near.length) continue;

      const words = wordsOf(passage);
      const whole = new Set(words);
      const hits: Array<{ token: string; strong: boolean }> = [];
      for (const token of near) {
        if (whole.has(token)) {
          hits.push({ token, strong: true });
          continue;
        }
        // a longer word may carry the token as its stem, as Ebembe words often do
        if (token.length >= 5 && words.some((word) => word.startsWith(token))) {
          hits.push({ token, strong: false });
        }
      }
      if (hits.length) found.push({ title, text: passage, lower, hits });
    }
  }
  if (!found.length) return [];

  // a word that turns up in many passages says less about this question than a rare one
  const spread = new Map<string, number>();
  for (const row of found) {
    for (const hit of row.hits) spread.set(hit.token, (spread.get(hit.token) || 0) + 1);
  }
  const weightOf = (token: string) =>
    Math.log(1 + found.length / (spread.get(token) || 1)) + token.length / 12;

  const phrase = textOf(query).toLowerCase();
  const ranked = found.map((row) => {
    const titleWords = new Set(wordsOf(row.title));
    let score = 0;
    for (const hit of row.hits) {
      score += weightOf(hit.token) * (hit.strong ? 1 : 0.45);
      if (titleWords.has(hit.token)) score += 1.5;
    }
    if (phrase.length > 4 && row.lower.includes(phrase)) score += 6;
    return { title: row.title, text: row.text, score: score / Math.sqrt(row.text.length / 400) };
  });

  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, MAX_PASSAGES);
}

/** The matched passages as a small section of the note, read in the order they rank. */
function passageNote(query, texts) {
  const best = bestPassages(query, texts);
  if (!best.length) return "";

  let body = "";
  for (const row of best) {
    const item = `${row.title ? `[${row.title}]\n` : ""}${row.text}\n\n`;
    if (body.length + item.length > PASSAGE_BUDGET) break;
    body += item;
  }
  if (!body) return "";
  return PASSAGE_HEAD + body.trimEnd() + "\n";
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    let payload: any = {};
    try {
      payload = await req.json();
    } catch (err) {
      payload = {};
    }
    const query = typeof payload?.query === "string" ? payload.query.trim().slice(0, MAX_QUERY) : "";

    // the entries themselves stay private to the admin: only this derived note
    // leaves the server, and it is the same text the assistant is given anyway
    const page = await base44.asServiceRole.entities.AssistantKnowledge.filter(
      {},
      { sort: "created_date", limit: MAX_ROWS }
    );
    const rows = rowsOf(page);

    let note = buildNote(rows, query ? 2400 : MAX_NOTE);

    // a question is answered from the admin's long texts too, through the few
    // passages that match it and nothing more
    if (query) {
      const textPage = await base44.asServiceRole.entities.KnowledgeText.filter(
        {},
        { sort: "-updated_date", limit: MAX_TEXTS, fields: ["title", "passages"] }
      );
      note += passageNote(query, rowsOf(textPage));
    }

    return Response.json({ note });
  } catch (error) {
    console.error("Could not build the knowledge note:", error.message);
    return Response.json({ error: "Knowledge is unavailable right now." }, { status: 500 });
  }
}