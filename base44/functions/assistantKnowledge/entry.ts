import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { alikeTerms } from "../../shared/soundsAlike.ts";

// The note rides along with a typed message as silent context. It is handed over
// in blocks of the size one update carries, so the whole note can be larger than
// a single block without any one update being oversized.
const MAX_NOTE = 32000;

// The vocabulary keeps its own share of the note, so a long list of questions and
// world notes can never crowd the words out.
const WORDS_SHARE = 24000;

// A list in the thousands is read page by page, so all of it is taken in.
const WORDS_PER_PAGE = 500;
const MAX_WORDS_READ = 20000;

// Eight words to a line: a vocabulary costs the fewest characters that way.
const WORDS_PER_LINE = 8;

// A question also pulls the matching passages of the admin's long texts.
const MAX_TEXTS = 50;
const MAX_PASSAGES = 4;
const PASSAGE_BUDGET = 2400;

// The questions and world notes share whatever the words leave.
const NOTES_LIMIT = 400;
const MAX_QUERY = 600;

const OPENING =
  "MAARIFA YA MWENYEJI (what the admin has written for you to know):\n" +
  "Majibu yako kuhusu ulimwengu wa Babembe, utamaduni wake, na lugha ya Ebembe yatokee kwenye maarifa haya kwanza.\n";

// How he answers: the three languages he serves, the review he takes before
// answering, and what to do with a word that only sounded like a saved one.
const GUIDE =
  "\nJINSI YA KUJIBU (how to answer):\n" +
  "- Chukua muda wako: kabla ya kujibu, soma maarifa haya na orodha ya maneno kwanza, kisha jibu kwa utulivu na kwa ukamilifu.\n" +
  "- Jibu kwa lugha aliyotumia mtu — Ebembe, Kiswahili au Kiingereza. Kwa kawaida anza kwa Ebembe, kisha ongeza ufafanuzi mfupi kwa Kiswahili au Kiingereza. Mtu akiomba lugha nyingine, fuata yeye, na akibadilisha lugha, badilisha nawe.\n" +
  "- Mtu akiomba kitu — kuzungumza, hadithi, wimbo, kufundishwa neno, maelezo au mazoezi — fanya alichoomba, kwa lugha aliyoomba.\n" +
  "- Neno alilosema likikaribia neno lililohifadhiwa (herufi moja au alama tofauti, au konsonanti zilezile kwa irabu tofauti), chukulia kuwa ni neno hilo hilo: jibu moja kwa moja kutoka maana yake. (Never say the word was wrong, never say it is unknown, never ask whether they meant a similar word, and never repeat their words back as your answer.)\n" +
  "- Neno la kwanza kwenye orodha ya maneno yanayokaribia ndilo linalokaribia zaidi; ndilo neno alilomaanisha, hata kama mengine yanafanana nalo — jibu kutoka maana ya lile la kwanza, bila kuuliza.\n" +
  "- Swali au ombi lisipoeleweka, jibu ulichoelewa kwa maneno yako mwenyewe: usirudie maneno yake kama jibu, wala usiulize uthibitisho.\n";

const FALLBACK =
  "\nKama swali halipo kwenye maarifa haya, jibu kwa ufahamu wako wa kawaida, lakini sema wazi katika jibu hilo kwamba jibu hilo halitoki kwenye maarifa ya admin.\n";

const PASSAGE_HEAD =
  "\nSEHEMU ZA MAANDISHI YA MWENYEJI (parts of the admin's own texts that match this question):\n" +
  "Jibu kutoka sehemu hizi kwa maneno yako, na sema wazi kama hakuna sehemu inayojibu swali hili.\n";

const HEADS = {
  qa: "MASWALI NA MAJIBU\n",
  note: "MAELEZO YA ULIMWENGU\n",
  word:
    "MANENO YA EBEMBE (kila neno alilohifadhi admin):\n" +
    "Tumia maneno haya na maana yake unapojibu. Neno lenye (maana haijaelezwa bado) halijaelezwa bado — litaje tu, usibuni maana yake.\n",
  like:
    "\nMANENO YANAYOKARIBIA ULILOSIKIA (words close to what was heard):\n" +
    "Neno la kwanza ndilo linalokaribia zaidi — ndilo neno alilomaanisha. Jibu moja kwa moja kutoka maana yake: usimwambie mtu amekosea, usiulize kama alimaanisha neno lingine, na usirudie maneno yake kama jibu lako. Maneno mengine kwenye orodha ni ya karibu tu — usiyataje kama mbadala, na usiulize kama alimaanisha mojawapo. Puuza orodha hii tu kama neno alilosema halipo kabisa.\n",
};

// the section that rides with a question is set aside first, so it can never push
// the vocabulary out of the note
const LIKE_BUDGET = 900;
const NOTE_BUDGET =
  MAX_NOTE - OPENING.length - GUIDE.length - FALLBACK.length - LIKE_BUDGET;
const WORDS_BUDGET = Math.min(WORDS_SHARE, NOTE_BUDGET);

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

function textOf(value: any) {
  return typeof value === "string" ? value.trim() : "";
}

function rowsOf(page: any) {
  return Array.isArray(page) ? page : page?.items || [];
}

/** The content words of a question, either language, with the filler taken out. */
function tokensOf(value: string) {
  const found = value.toLowerCase().match(/[\p{L}\p{N}']+/gu) || [];
  return found.filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

/** The words a line is made of, so no word is ever mistaken for part of another. */
function wordsOf(line: string) {
  return (line.toLowerCase().match(/[\p{L}\p{N}']+/gu) || []).filter((word) => word.length > 2);
}

/** A question, or a world note, as a single line the assistant can read. */
function noteLine(row: any) {
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
  return "";
}

/** One head plus as many lines as its budget holds; a line is never cut in half. */
function fill(head: string, lines: string[], budget: number) {
  if (!lines.length || head.length > budget) return { text: "", lines: 0 };

  let body = "";
  let used = 0;
  for (const line of lines) {
    const item = `- ${line}\n`;
    if (head.length + body.length + item.length > budget) break;
    body += item;
    used += 1;
  }
  return body ? { text: head + body, lines: used } : { text: "", lines: 0 };
}

/** A saved word as the assistant reads it: its meaning, or that it has none yet. */
function wordLine(row: any) {
  const term = textOf(row.term);
  if (!term) return "";
  const meaning = textOf(row.meaning);
  const usage = textOf(row.usage);
  if (!meaning) return `${term} = (maana haijaelezwa bado)`;
  return `${term} = ${meaning}${usage ? ` (${usage})` : ""}`;
}

/** Every saved word, packed into lines in the order it was saved. */
function packWords(rows: any[]) {
  const items = rows.map(wordLine).filter(Boolean);
  const lines: string[] = [];
  const counts: number[] = [];

  for (let i = 0; i < items.length; i += WORDS_PER_LINE) {
    const group = items.slice(i, i + WORDS_PER_LINE);
    lines.push(group.join(" · "));
    counts.push(group.length);
  }
  return { lines, counts, total: items.length };
}

/**
 * Which packed lines ride along: all of them when they fit, and otherwise the
 * lines a question turns on first, then the list from the top — always handed
 * over in the order the words were saved.
 */
function carryLines(lines: string[], wanted: string[], budget: number) {
  const sizeOf = (line: string) => line.length + 3;
  const total = lines.reduce((sum, line) => sum + sizeOf(line), 0);
  if (total <= budget) return { indexes: lines.map((_, index) => index), whole: true };

  const keep = new Set<number>();
  let used = 0;

  // the words this question is about are kept first, so a list too long to fit
  // never hides the one word that was asked about
  lines.forEach((line, index) => {
    if (!wanted.length) return;
    const words = wordsOf(line);
    const near = wanted.some(
      (token) =>
        words.includes(token) || (token.length >= 5 && words.some((word) => word.startsWith(token)))
    );
    if (near) {
      keep.add(index);
      used += sizeOf(line);
    }
  });

  lines.forEach((line, index) => {
    if (keep.has(index)) return;
    if (used + sizeOf(line) > budget) return;
    keep.add(index);
    used += sizeOf(line);
  });

  const indexes = lines.map((_, index) => index).filter((index) => keep.has(index));
  return { indexes, whole: indexes.length === lines.length };
}

/** Every saved word, read page by page so nothing is left behind. */
async function loadWords(base44: any) {
  const rows: any[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;

  while (rows.length < MAX_WORDS_READ) {
    const options: any = { sort: "created_date", limit: WORDS_PER_PAGE };
    if (cursor) options.cursor = cursor;
    const page = await base44.asServiceRole.entities.AssistantKnowledge.filter(
      { kind: "word" },
      options
    );

    // a page that brings nothing new ends the walk
    const fresh = rowsOf(page).filter((row: any) => row?.id && !seen.has(row.id));
    if (!fresh.length) break;
    fresh.forEach((row: any) => seen.add(row.id));
    rows.push(...fresh);

    const next = page?.has_more ? page?.next_cursor : "";
    if (!next) break;
    cursor = next;
  }
  return rows;
}

/**
 * The vocabulary the assistant is given, with how much of the saved list it holds
 * — the same numbers the admin's words panel states.
 */
async function wordTally(rows: any[], wanted: string[]) {
  const words = packWords(rows);
  // the section's own head is part of its share, so every line chosen is one that fits
  const room = WORDS_BUDGET - HEADS.word.length;
  const picked = carryLines(words.lines, wanted, room);
  const section = fill(
    HEADS.word,
    picked.indexes.map((index) => words.lines[index]),
    WORDS_BUDGET
  );
  const carried = picked.indexes
    .slice(0, section.lines)
    .reduce((sum, index) => sum + words.counts[index], 0);

  return {
    section: section.text,
    total: words.total,
    carried,
    whole: words.total > 0 && carried === words.total,
  };
}

/**
 * The saved words, read once and kept for a moment: a live call looks them up on
 * every turn, and the whole list serves the note and the words panel alike.
 */
const CACHE_MS = 60000;
let wordCache: { at: number; rows: any[] } = { at: 0, rows: [] };

async function wordsFor(base44: any) {
  if (wordCache.rows.length && Date.now() - wordCache.at < CACHE_MS) return wordCache.rows;
  const rows = await loadWords(base44);
  wordCache = { at: Date.now(), rows };
  return rows;
}

/**
 * The words that fit what was heard, nearest first. Only the few closest ride
 * along, so a misheard word is looked up against the whole list without the whole
 * list being handed over with it.
 */
function likeSection(rows: any[], heard: string) {
  if (!heard) return "";
  // the filler of both languages is dropped first, so only the words that carry
  // meaning are matched
  const said = heard
    .split(/\s+/)
    .filter((word) => word && !STOPWORDS.has(word.toLowerCase()))
    .join(" ");
  const near = alikeTerms(said || heard, rows, 3);
  if (!near.length) return "";

  let body = "";
  for (const row of near) {
    const meaning = textOf(row.meaning) || "(maana haijaelezwa bado)";
    const usage = textOf(row.usage);
    const line = `- alisikia "${row.heard}" → neno ni "${row.term}" = ${meaning}${
      usage ? ` (${usage})` : ""
    }\n`;
    if (HEADS.like.length + body.length + line.length > LIKE_BUDGET) break;
    body += line;
  }
  return body ? HEADS.like + body : "";
}

/**
 * The passages of the admin's long texts that answer a question best. Matching
 * runs over the passages that were already cut when the texts were saved, so no
 * message ever reads a whole document; a word counts only when it stands on its
 * own or is the stem of a longer one.
 */
function bestPassages(query: string, texts: any[]) {
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
function passageNote(query: string, texts: any[]) {
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

    // the words panel asks how much of the list the assistant is actually given
    if (payload?.stats) {
      const tally = await wordTally(await wordsFor(base44), []);
      return Response.json({
        words: { total: tally.total, carried: tally.carried, whole: tally.whole },
      });
    }

    const query = typeof payload?.query === "string" ? payload.query.trim().slice(0, MAX_QUERY) : "";
    const wanted = query ? Array.from(new Set(tokensOf(query))) : [];

    // a live call asks only about what was just heard: the saved words that fit it
    // are looked up and handed over before his answer, so a word that only sounded
    // like a saved one is answered from its meaning instead of being called unknown
    if (typeof payload?.heard === "string" && payload.heard.trim()) {
      const heard = payload.heard.trim().slice(0, MAX_QUERY);
      return Response.json({ note: likeSection(await wordsFor(base44), heard) });
    }

    // the entries themselves stay private to the admin: only this derived note
    // leaves the server, and it is the same text the assistant is given anyway
    const wordRows = await wordsFor(base44);
    const like = likeSection(wordRows, query);
    const tally = await wordTally(wordRows, wanted);
    let left = NOTE_BUDGET - tally.section.length - like.length;

    const page = await base44.asServiceRole.entities.AssistantKnowledge.filter(
      { kind: { $in: ["qa", "note"] } },
      { sort: "created_date", limit: NOTES_LIMIT }
    );
    const rows = rowsOf(page);
    const linesOfKind = (kind: string) =>
      rows
        .filter((row: any) => row.kind === kind)
        .map(noteLine)
        .filter(Boolean);

    const qa = fill(HEADS.qa, linesOfKind("qa"), left);
    left -= qa.text.length;
    const world = fill(HEADS.note, linesOfKind("note"), left);

    const body = like + qa.text + world.text + tally.section;
    let note = body ? OPENING + GUIDE + body + FALLBACK : "";

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
  } catch (error: any) {
    console.error("Could not build the knowledge note:", error.message);
    return Response.json({ error: "Knowledge is unavailable right now." }, { status: 500 });
  }
}