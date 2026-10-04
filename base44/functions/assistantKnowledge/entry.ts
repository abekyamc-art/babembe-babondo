import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { alikeTerms, skeleton } from "../../shared/soundsAlike.ts";
import { knowledgeWordRows } from "../../shared/knowledgeWords.ts";
import { rulesText } from "../../shared/knowledgeRules.ts";
import { keyLine, keyMatches } from "../../shared/answerKey.ts";

// The note rides along with a typed message as silent context. It is handed over
// in blocks of the size one update carries, so the whole note can be larger than
// a single block without any one update being oversized.
const MAX_NOTE = 32000;

// The vocabulary keeps its own share of the note, so a long list of questions and
// world notes can never crowd the words out.
const WORDS_SHARE = 24000;

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
  "MAARIFA YA MWENYEJI — what the admin has written for you to know:\n" +
  "Majibu yako kuhusu ulimwengu wa Babembe, utamaduni wake, na lugha ya Ebembe yatokee kwenye maarifa haya kwanza.\n";

// How he answers: the language the person used decides the language he answers in,
// the review he takes before answering, and what to do with a word that only sounded
// like a saved one.
const GUIDE =
  "\nJINSI YA KUJIBU — how to answer:\n" +
  "- Chukua muda wako: kabla ya kujibu, soma maarifa haya na orodha ya maneno kwanza, kisha jibu kwa utulivu na kwa ukamilifu.\n" +
  "- LUGHA: fuata lugha aliyotumia mtu, kuanzia neno lako la kwanza. Akisema KISWAHILI: jibu kwa Kiswahili, na neno la Ebembe linalofaa liwe NDANI ya sentensi, si mwanzo wa jibu. Akisema EBEMBE: anza kwa neno au kishazi cha Ebembe, kisha ufafanuzi mfupi kwa Kiswahili. Akisema lugha nyingine yoyote: Ebembe kwanza, kisha Kiswahili.\n" +
  "- Kiingereza huja baada ya mtu kuanza kusema Kiingereza: hadi wakati huo usiseme Kiingereza kabisa. Akisha sema Kiingereza, unaweza kuongeza Kiingereza kidogo baada ya lugha yake.\n" +
  "- USIMWOMBE MTU ARUDIE, usiulize alimaanisha lugha gani au neno gani, na usiseme hukusikia wala hukuelewa. Chukua lugha na maana kutoka maneno yake ya kwanza, kisha jibu moja kwa moja.\n" +
  "- Sehemu ya kishazi isiyokuwa na neno la Ebembe: weka neno la Kiswahili linalofaa mahali hapo, kisha endeleza kishazi hadi kikamilike, ili kishazi kisikose kitu. Usiseme kwamba neno la Ebembe halipo, wala usionyeshe kwamba kuna pengo — toa kishazi kikamilifu tu.\n" +
  "- Mtu akiomba kitu — kuzungumza, hadithi, wimbo, kufundishwa neno, maelezo au mazoezi — fanya alichoomba, kwa lugha yake na kwa mpangilio huu.\n" +
  "- HADITHI, habari, maelezo au salamu akiomba: simulia kwa SEHEMU — kila sehemu fupi, sentensi mbili hadi tatu, sekunde thelathini kwa kusema — na sehemu iwe na maneno mapya yanayotokea humo, na uyaeleze. Ombi jipya la \"endelea\" huendeleza hadithi ile ile mahali ilipoishia: usianze hadithi nyingine, usirudie sehemu iliyokwisha simuliwa, na usianze upya. Ombi la wazi la hadithi nyingine ndilo linaloanza hadithi mpya. Akiomba zaidi, endelea mpaka yeye mwenyewe aache.\n" +
  "- Maandishi mapya yaliyoongezwa kwenye maarifa haya kwa ajili ya ombi hili yatumike kwa sehemu inayofuata ya hadithi, na maneno mapya yake yachukuliwe kutoka humo.\n" +
  "- Neno alilosema likikaribia neno lililohifadhiwa — herufi moja au alama tofauti, au konsonanti zilezile kwa irabu tofauti — chukulia kuwa ni neno hilo hilo: jibu moja kwa moja kutoka maana yake. Kumbuka: never say the word was wrong, never say it is unknown, never ask whether they meant a similar word, and never repeat their words back as your answer.\n" +
  "- Neno la kwanza kwenye orodha ya maneno yanayokaribia ndilo linalokaribia zaidi; ndilo neno alilomaanisha, hata kama mengine yanafanana nalo — jibu kutoka maana ya lile la kwanza, bila kuuliza.\n" +
  "- Swali au ombi lisipoeleweka, jibu ulichoelewa kwa maneno yako mwenyewe: usirudie maneno yake kama jibu, wala usiulize uthibitisho.\n" +
  "- Mwongozo wa matamshi ni wa sikio lako pekee: chukua neno jinsi linasikika, lakini usiandike wala kusema kwa mtu chochote kilichowekwa ndani ya mabano, wala silabi zilizoandikwa zimetenganishwa kwa vistari. Onyesha na kutamka herufi za neno tu kama linavyoandikwa — mfano: \"ole bile\".\n" +
  LEAD +
  BRIEF;

const FALLBACK =
  "\nKama swali halipo kwenye maarifa haya, jibu kwa ufahamu wako wa kawaida, lakini sema wazi katika jibu hilo kwamba jibu hilo halitoki kwenye maarifa ya admin.\n";

// The answer key decides what the answer says: a question that matches one the admin saved is
// answered with that saved answer itself, and the answer stays inside it instead of wandering.
const LEAD =
  "\nJIBU LA FUNGUA — lead with the saved answer:\n" +
  "Alichosema au aliuliza kinalingana na kitu kilichohifadhiwa hapa chini: jibu lako LIFUNGUE kwa jibu " +
  "lililohifadhiwa hilo, neno kwa neno, bila kulibadilisha na bila kuweka jibu lingine mbele yake. Kisha " +
  "endelea kwa jibu hilo tu: usihamie maarifa mengine yasiyohusiana na alichosema, na usiongeze maelezo " +
  "ambayo hayakuulizwa.\n";

// Every answer is spoken out loud, so it is kept to what fits in about half a minute: two or three
// short sentences at a time, and a story is told in parts of that length rather than in one long
// telling.
const BRIEF =
  "\nUREFU WA JIBU — how long an answer may be:\n" +
  "Jibu lote linasemwa kwa sauti, hivyo liwe fupi: sentensi mbili hadi tatu, takriban sekunde thelathini " +
  "kwa kusema (maneno arobaini hadi themanini). Usizidi sekunde thelathini kwa jibu moja. " +
  "Hadithi au maelezo marefu: kwa SEHEMU, kila sehemu si zaidi ya sekunde thelathini; ombi la \"endelea\" " +
  "linaendeleza sehemu inayofuata mahali ilipoishia.\n";

// The nearest saved answers ride at the head of the note, so the answer opens with the key itself.
const KEY_BUDGET = 1400;
const KEY_ROWS = 200;

const PASSAGE_HEAD =
  "\nSEHEMU ZA MAANDISHI YA MWENYEJI — parts of the admin's own texts that match this question:\n" +
  "Jibu kutoka sehemu hizi kwa maneno yako, na sema wazi kama hakuna sehemu inayojibu swali hili.\n";

// The admin's own rule book rides ahead of every other kind of knowledge: how Kibembe is read,
// pronounced, written and used is decided by it before anything else, and it is handed over
// whole — its reading key and its tense tables included.
const RULES_HEAD =
  "\nSHERIA ZA LUGHA YA KIBEMBE — the admin's own rule book for reading, pronouncing, writing and using Kibembe. It is the highest authority on the language: every answer follows it, and where one of these rules and your own habit disagree, the rule wins. Never invent a word, a plural, a tense or a meaning it does not confirm.\n";

const HEADS = {
  qa: "MASWALI NA MAJIBU\n",
  note: "MAELEZO YA ULIMWENGU\n",
  word:
    "MANENO YA EBEMBE — kila neno alilohifadhi admin:\n" +
    "Tumia maneno haya na maana yake unapojibu. Neno lenye alama ya ? halijaandikwa maana yake: litaje tu, usibuni maana yake, wala usiseme alama hiyo kwa mtu.\n",
  like:
    "\nMANENO YANAYOKARIBIA ULILOSIKIA — words close to what was heard:\n" +
    "Neno la kwanza ndilo linalokaribia zaidi — ndilo neno alilomaanisha. Jibu moja kwa moja kutoka maana yake: usimwambie mtu amekosea, usiulize kama alimaanisha neno lingine, na usirudie maneno yake kama jibu lako. Maneno mengine kwenye orodha ni ya karibu tu — usiyataje kama mbadala, na usiulize kama alimaanisha mojawapo. Puuza orodha hii tu kama neno alilosema halipo kabisa.\n" +
    BRIEF,

  say:
    "\nMATAMSHI YA SIRI — how to say the words above, for your ear only:\n" +
    "Tumia mwongozo huu kusema neno vizuri, lakini USIANDIKE wala USISEME mwongozo huu kwa mtu: sema na uandike herufi za neno tu, kama \"ole bile\" na si \"oh-leg-bile\".\n",
};

/**
 * A word that came back the same, or a letter apart, is that saved word being spoken: the
 * person is speaking Kibembe. Said plainly, this is what holds him in Kibembe for the rest
 * of the call — a turn written down like a Kiswahili one must never turn his answer into
 * Kiswahili — and because it stays in his context, it keeps working on every turn after it.
 */
const SURE_LINE =
  "\nLUGHA YA MTU — mtu huyu anasema KIBEMBE. Maneno haya ni maneno ya Kibembe yaliyohifadhiwa, " +
  "hata kama jinsi yalivyoandikwa yanafanana na Kiswahili. Endelea kujibu kwa Kibembe kwa maneno " +
  "yale yale yaliyohifadhiwa, na usibadilishe lugha: usijibu kwa Kiswahili wala Kiingereza kwa " +
  "sababu ya jinsi maneno yake yameandikwa. Mtu akibadilisha lugha mwenyewe waziwazi, fuata " +
  "lugha yake hiyo mpya.\n";

// the section that rides with a question is set aside first, so it can never push
// the vocabulary out of the note
const LIKE_BUDGET = 900;
// the private pronunciation hints have their own small share, and are never spoken
const SAY_BUDGET = 1500;
// the answer key takes its room before the vocabulary, so the saved answer is never trimmed away
const KEY_ROOM = KEY_BUDGET + LEAD.length + BRIEF.length;
const NOTE_BUDGET =
  MAX_NOTE - OPENING.length - GUIDE.length - FALLBACK.length - LIKE_BUDGET - SAY_BUDGET - KEY_ROOM;

// Anything between brackets, and any syllable-by-syllable run, is a note for the ear
// rather than a word to show: it is taken out of every line he is given.
const BRACKETED = /[([][^)\]]*[)\]]/g;
const SYLLABLES = /\b[a-z]{1,6}(?:-[a-z]{1,6}){2,}\b/gi;

function plain(value: any) {
  return String(value ?? "")
    .replace(BRACKETED, " ")
    .replace(SYLLABLES, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}
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
    const question = plain(textOf(row.question));
    const answer = plain(textOf(row.answer));
    return question && answer ? `Q: ${question}\nA: ${answer}` : "";
  }
  if (row.kind === "note") {
    const title = plain(textOf(row.title));
    const body = plain(textOf(row.text));
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

/**
 * A saved word as the assistant reads it: its plain spelling and its meaning. The
 * pronunciation guide never rides here — a word he may say is one without it.
 */
function wordLine(row: any) {
  const term = plain(textOf(row.term));
  if (!term) return "";
  const meaning = plain(textOf(row.meaning));
  const usage = plain(textOf(row.usage));
  if (!meaning) return `${term} = ?`;
  return `${term} = ${meaning}${usage ? ` · ${usage}` : ""}`;
}

/** The pronunciation guides he is given, held apart from every word he may say. */
function saySection(rows: any[], budget: number) {
  const lines: string[] = [];
  let used = 0;
  for (const row of rows) {
    if (used >= budget) break;
    const term = plain(textOf(row.term));
    // a guide is the one line written as syllables joined by dashes, so it is kept
    // exactly as the admin wrote it — only brackets are taken out of it
    const guide = textOf(row.guide).replace(BRACKETED, " ").trim();
    if (!term || !guide) continue;
    const line = `- ${term} → ${guide}\n`;
    if (HEADS.say.length + used + line.length > budget) break;
    lines.push(line);
    used += line.length;
  }
  return lines.length ? HEADS.say + lines.join("") : "";
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

/**
 * The vocabulary the assistant is given, with how much of the saved list it holds
 * — the same numbers the admin's words panel states.
 */
async function wordTally(rows: any[], wanted: string[], budget: number) {
  const words = packWords(rows);
  // the section's own head is part of its share, so every line chosen is one that fits
  const room = budget - HEADS.word.length;
  const picked = carryLines(words.lines, wanted, room);
  const section = fill(
    HEADS.word,
    picked.indexes.map((index) => words.lines[index]),
    budget
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
  // the same saved words the Rap Studio raps on: the admin's word entries, plus the words the
  // saved documents spell out themselves
  const rows = await knowledgeWordRows(base44);
  wordCache = { at: Date.now(), rows };
  return rows;
}

// the saved answers, read once and kept for the same moment: a live call asks on every turn, so
// the answer key is not fetched again and again mid-conversation
let keyCache: { at: number; rows: any[] } = { at: 0, rows: [] };

async function keyRowsFor(base44: any) {
  if (keyCache.rows.length && Date.now() - keyCache.at < CACHE_MS) return keyCache.rows;
  const page = await base44.asServiceRole.entities.AssistantKnowledge.filter(
    { kind: "qa" },
    { sort: "created_date", limit: KEY_ROWS, fields: ["kind", "question", "answer"] }
  );
  keyCache = { at: Date.now(), rows: rowsOf(page) };
  return keyCache.rows;
}

// The key rides at the head of the note, so the answer opens with the saved answer itself.
const KEY_HEAD =
  "\nJIBU LA FUNGUA LILILOHIFADHIWA — the answer key for this turn, as the admin saved it:\n";

/**
 * The saved answers that match this question, nearest first: the answer key. The matching itself
 * lives in one place, so a question finds the same answer in every provider.
 */
function keySection(rows: any[], query: string) {
  const matches = keyMatches(rows, query);
  if (!matches.length) return "";

  let body = "";
  for (const match of matches) {
    const line = keyLine(match);
    if (KEY_BUDGET + body.length + line.length > KEY_ROOM) break;
    body += line;
  }
  return body ? KEY_HEAD + LEAD + BRIEF + body : "";
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
    const term = plain(textOf(row.term));
    const meaning = plain(textOf(row.meaning));
    const usage = plain(textOf(row.usage));
    const line = `- alisikia "${plain(textOf(row.heard))}" → neno ni "${term}"${
      meaning ? ` = ${meaning}` : " — maana yake haijaandikwa bado"
    }${usage ? ` · ${usage}` : ""}\n`;
    if (HEADS.like.length + body.length + line.length > LIKE_BUDGET) break;
    body += line;
  }
  // A word that came back exactly, a letter apart, or standing on the same consonants all
  // the way through is the person speaking that saved word: the note says so, and says
  // which language that is, for this turn and for every turn that follows it. The
  // consonants have to account for most of both words, so a long English word that merely
  // holds a short Ebembe one's consonants is never taken for Kibembe being spoken.
  const sure = near.some((row: any) => {
    if (row.tier <= 1) return true;
    if (row.tier !== 2) return false;
    const saved = skeleton(row.term);
    const spoken = skeleton(row.heard);
    const long = Math.max(saved.length, spoken.length);
    if (long < 3) return false;
    return Math.min(saved.length, spoken.length) / long >= 0.6;
  });
  return body ? HEADS.like + (sure ? SURE_LINE : "") + body : "";
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
    const title = plain(row.title);
    const item = `${title ? `${title} — ` : ""}${plain(row.text)}\n\n`;
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
      const rows = await wordsFor(base44);
      const rules = await rulesText(base44);
      const rulesSection = rules ? RULES_HEAD + rules : "";
      const tally = await wordTally(
        rows,
        [],
        Math.max(0, Math.min(WORDS_SHARE, NOTE_BUDGET - rulesSection.length))
      );
      return Response.json({
        words: {
          total: tally.total,
          carried: tally.carried,
          whole: tally.whole,
          guided: rows.filter((row: any) => textOf(row.guide)).length,
        },
      });
    }

    const query = typeof payload?.query === "string" ? payload.query.trim().slice(0, MAX_QUERY) : "";
    const wanted = query ? Array.from(new Set(tokensOf(query))) : [];

    // a live call asks only about what was just heard: the saved words that fit it
    // are looked up and handed over before his answer, so a word that only sounded
    // like a saved one is answered from its meaning instead of being called unknown
    if (typeof payload?.heard === "string" && payload.heard.trim()) {
      const heard = payload.heard.trim().slice(0, MAX_QUERY);
      // the answer key comes first in the note, so the saved answer is what the turn opens with,
      // and the words closest to what was heard follow it
      const [words, keys] = await Promise.all([wordsFor(base44), keyRowsFor(base44)]);
      return Response.json({
        note: keySection([...keys, ...words], heard) + likeSection(words, heard),
      });
    }

    // the entries themselves stay private to the admin: only this derived note
    // leaves the server, and it is the same text the assistant is given anyway
    // the rule book takes its room in the note first; the words and the rest of the
    // knowledge are then filled from what the whole book leaves
    const rules = await rulesText(base44);
    const rulesSection = rules ? RULES_HEAD + rules : "";
    const wordsBudget = Math.max(0, Math.min(WORDS_SHARE, NOTE_BUDGET - rulesSection.length));

    const wordRows = await wordsFor(base44);
    const like = likeSection(wordRows, query);
    const tally = await wordTally(wordRows, wanted, wordsBudget);
    const say = saySection(wordRows, SAY_BUDGET);
    let left = wordsBudget - tally.section.length - like.length - say.length;

    const page = await base44.asServiceRole.entities.AssistantKnowledge.filter(
      { kind: { $in: ["qa", "note"] } },
      { sort: "created_date", limit: NOTES_LIMIT }
    );
    const rows = rowsOf(page);
    // the answer key for this question is read from the same saved entries and takes its room
    // before the questions and the world notes, so a matching answer is never trimmed away
    const key = keySection([...rows, ...wordRows], query);
    left -= key.length;
    const linesOfKind = (kind: string) =>
      rows
        .filter((row: any) => row.kind === kind)
        .map(noteLine)
        .filter(Boolean);

    const qa = fill(HEADS.qa, linesOfKind("qa"), left);
    left -= qa.text.length;
    const world = fill(HEADS.note, linesOfKind("note"), left);

    const body = like + qa.text + world.text + tally.section + say;
    let note = body || key || rulesSection ? OPENING + GUIDE + key + rulesSection + body + FALLBACK : "";

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