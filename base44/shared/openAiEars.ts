import { MAX_TERM, clean, knowledgeWordRows } from "./knowledgeWords.ts";
import { earKeyTerms } from "./hearingKeywords.ts";
import { heardForms, spellingsOf, strongMatch, tight } from "./soundsAlike.ts";

/**
 * The app's own ears, on OpenAI.
 *
 * Every spoken turn of every voice feature is written down here, and nowhere else: the same reader
 * listens on the Cartesia calls, on the talk calls and on the app's own AI call. A turn is written
 * once, by one hand — what the screen shows the person they said is the same writing handed to the
 * AI answering them, so the answer can never be built on a second, quieter reading of the same turn.
 *
 * The reader knows no Kibembe, so it is pointed at the app's own language before it listens: the
 * spelling of the words the admin saved, the letter runs no English word carries, and the one rule
 * that matters here — Kibembe is written as it is said, and never turned into the English or
 * Kiswahili word it nearly sounds like. What comes back is then placed on the app's own spelling of
 * those words — the spelling the bank holds each word in, and every way the admin has confirmed that
 * same word comes out — and a word the reader wrote as some other sound is placed on the one
 * confirmed word it strongly sounds like, so the writing that reaches the answering AI is the
 * confirmed Ebembe itself.
 *
 * A word no confirmed word strongly sounds like is left exactly as it was said: this reader writes
 * turns down, it never invents a word, and it never replaces one word with another that merely
 * resembles it. Where a word could be two saved words, or the saved word said the other way round —
 * "good" and "not good" sound alike — it chooses neither and keeps what was said. Nor is anything
 * here ever saved: only the admin's own confirmation adds a way of saying a word.
 */

// The reading service, the reader every turn is written with, and the one an account that is not
// allowed the newer reader falls back to. Both read the same turn into the same letters.
const URL = "https://api.openai.com/v1/audio/transcriptions";
const MODEL = "gpt-4o-transcribe";
const FALLBACK_MODEL = "whisper-1";
// The reader knows no Kibembe at all, and none of the languages it does know is this one: naming one
// of them makes it write the person's Kibembe as that language's own words — the very thing that must
// not happen here. Kiswahili named as the language is the worst of the two, since a Kibembe turn then
// comes back as Kiswahili nobody spoke. So no language is named at all: the prompt carries the
// language instead — Kibembe, written as the sounds it is said in, in the spelling of the app's own
// confirmed words — and the reader is left to write what it hears rather than to translate it.
// a turn is given this long to be read, generously: a Kibembe turn read properly is worth the wait
const HEAR_MS = 30000;
// how much of the app's own spelling is pointed at the reader: enough for the words being
// practised, short enough to stay a hint rather than a dictionary dropped in front of it
const MAX_PROMPT = 1500;

// What the reader is told before it listens. The words themselves follow it.
const PROMPT_HEAD = [
  "Kibembe (Ebembe) speech from a Babembe village: a Bantu language of its own, not Kiswahili and",
  "not English, and the person is speaking neither of those two.",
  "Write the turn down exactly as it is said, in the letters of the spelling of the words listed",
  "after this line — every sound of every word, the way it is spoken.",
  "Never translate the turn and never tidy it up. Where a word sounds like a Kiswahili or English",
  "word, that word is not what was said: write the Kibembe sounds instead of it.",
  "A word listed with the ways people say it is still written in the spelling it is listed under,",
  "however it comes out of the mouth.",
  "The words:",
].join(" ");

// The letter runs no English or Kiswahili word carries: a word wearing one is written out in full.
const HARD_LETTERS = ["ny", "ng", "mb", "nk", "nd", "nt", "mv", "bv", "hw", "bw", "gw", "kw", "by"];

/** The hint the reader is given: the app's own words, and the sounds it has to write whole. */
export function earsPrompt(terms: string[] = []): string {
  const words: string[] = [];
  for (const raw of terms || []) {
    const term = clean(raw, MAX_TERM).replace(/\s+/g, " ");
    if (!term) continue;
    const next = words.length ? `${words.join(", ")}, ${term}` : term;
    if (PROMPT_HEAD.length + next.length > MAX_PROMPT) break;
    words.push(term);
  }
  const line = words.length ? `${PROMPT_HEAD} ${words.join(", ")}` : PROMPT_HEAD;
  return `${line} Write ${HARD_LETTERS.join(", ")} out in full where they are said.`;
}

/** The file name the turn is handed over under, so the service reads the sound it was given. */
function nameFor(type: string): string {
  const said = String(type || "").toLowerCase();
  if (said.includes("webm")) return "turn.webm";
  if (said.includes("mp4") || said.includes("m4a")) return "turn.m4a";
  if (said.includes("mpeg") || said.includes("mp3")) return "turn.mp3";
  if (said.includes("ogg")) return "turn.ogg";
  if (said.includes("flac")) return "turn.flac";
  return "turn.wav";
}

/** The reading service's own wording of a refusal, when it gives one. */
async function refusal(res: any): Promise<string> {
  const detail = await res.text().catch(() => "");
  try {
    return String(JSON.parse(detail)?.error?.message || "").slice(0, 200);
  } catch (err) {
    return String(detail || "").slice(0, 200);
  }
}

async function read(apiKey: string, model: string, bytes: Uint8Array, type: string, prompt: string) {
  const form = new FormData();
  form.append("model", model);
  form.append("file", new Blob([bytes], { type: type || "audio/wav" }), nameFor(type));
  if (prompt) form.append("prompt", prompt);
  form.append("response_format", "json");
  return fetch(URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(HEAR_MS),
  });
}

/**
 * One spoken turn written down by the app's own ears. The words alone come back: the reader's own
 * punctuation and line breaks are flattened, and a turn it made nothing of comes back empty rather
 * than as a guess at something nobody said.
 */
export async function writeDown({
  apiKey,
  bytes,
  type = "audio/wav",
  terms = [],
}: {
  apiKey: string;
  bytes: Uint8Array;
  type?: string;
  terms?: string[];
}): Promise<string> {
  if (!apiKey) throw new Error("ears-no-key");
  const prompt = earsPrompt(terms);

  let res = await read(apiKey, MODEL, bytes, type, prompt);
  // an account not allowed the newer reader is simply read by the older one: the same turn,
  // the same letters, rather than a call that goes quiet over which model answered
  if (!res.ok && (res.status === 400 || res.status === 404)) {
    const reason = await refusal(res);
    if (/model|not found|unsupported/i.test(reason)) {
      res = await read(apiKey, FALLBACK_MODEL, bytes, type, prompt);
    } else {
      console.error("The ears refused the turn:", res.status, reason);
      throw new Error("ears-" + res.status);
    }
  }
  if (!res.ok) {
    console.error("The ears refused the turn:", res.status, await refusal(res));
    throw new Error("ears-" + res.status);
  }

  const data: any = await res.json().catch(() => ({}));
  const said = String(data?.text || "").replace(/\s+/g, " ").trim();
  return /[\p{L}\p{N}]/u.test(said) ? said : "";
}

// The longest run of words that is still one saved word: an expression said whole — a greeting, a
// phrase the admin saved with the ways it comes out — is placed whole, never one word of it at a time.
const MAX_RUN = 5;

// The sound a word wears when it says the other way round: a Kibembe or Kiswahili negation sitting
// at its edge. Two words that do not agree about wearing one of these are never made one another —
// "good" and "not good" sound very nearly alike, and a word the person said the other way round is
// not a word to be corrected, it is the word they meant.
const OPPOSITE = ["si", "ha", "te", "to", "ta", "ndi"];

function saysTheOpposite(a: string, b: string): boolean {
  if (a === b) return false;
  return OPPOSITE.some(
    (mark) => a.startsWith(mark) !== b.startsWith(mark) || a.endsWith(mark) !== b.endsWith(mark)
  );
}

/**
 * The turn placed on the app's own spelling of its words.
 *
 * A word the reader wrote as the admin itself saved it, or as one of the ways the admin has confirmed
 * that word comes out, is written back in the saved spelling — so the Ebembe handed to the answering
 * AI is the confirmed Ebembe. A saved expression said whole is placed whole, never one word of it at
 * a time: a phrase read word by word is exactly what a reading of it gets wrong.
 *
 * A word the bank does not write that way is placed on the saved word it strongly sounds like. The
 * reader knows no Kibembe, so what it writes is often the English or Kiswahili word the sound nearly
 * makes — and the word that sound really belongs to is the one the admin confirmed. What a word is
 * placed on is always a confirmed spelling, so a word placed at all is placed on Ebembe, never on the
 * English word it sounds like. The match stays narrow: an accent or one letter apart, or the same
 * consonants in the same order in a word of a similar length, and only against what the bank holds.
 * A word that stands close to two saved words is not guessed at either; nor is a word that sounds
 * like the saved word saying the opposite.
 *
 * Nothing else is touched: a word no confirmed word strongly sounds like keeps the letters it was
 * said in, and no match made here is ever saved as a new way of saying anything.
 */
export function correctEbembe(text: string, rows: any[]): string {
  const said = String(text || "");
  if (!said || !rows?.length) return said;

  // Every way the bank knows a word: the spelling it is saved in, and the ways the admin confirmed
  // that same word comes out — one word at a time, and two or three of them said together.
  const written = new Map<string, string>();
  const spoken: { term: string; word: string }[][] = [];
  const taken = new Set<string>();
  for (const row of rows) {
    const term = clean(row?.term, MAX_TERM);
    if (!term) continue;
    for (const form of spellingsOf(row)) {
      const key = tight(form);
      if (!key) continue;
      if (!written.has(key)) written.set(key, term);
      // a run of words is placed by its sound as one thing; a run longer than an expression is left
      // to the letters alone
      const count = String(form).trim().split(/\s+/).length;
      if (key.length < 3 || count > MAX_RUN) continue;
      const id = `${count}|${key}|${term}`;
      if (taken.has(id)) continue;
      taken.add(id);
      if (!spoken[count]) spoken[count] = [];
      spoken[count].push({ term, word: key });
    }
  }
  if (!written.size) return said;

  // the words of the turn, in the order they were said, with everything around them left as it is
  const parts = said.split(/([\p{L}'’]+)/u);
  const runs: number[] = [];
  parts.forEach((part, index) => {
    if (/^[\p{L}'’]+$/u.test(part)) runs.push(index);
  });

  let at = 0;
  while (at < runs.length) {
    const room = Math.min(MAX_RUN, runs.length - at);
    let placed = "";
    let used = 0;
    // the longest run that is still one saved word leads, so a saved expression said whole is placed
    // whole rather than one word of it at a time
    for (let width = room; width >= 1 && !used; width -= 1) {
      const phrase = runs
        .slice(at, at + width)
        .map((index) => parts[index])
        .join(" ");
      const key = tight(phrase);
      if (!key) continue;
      // written as the bank writes it, or as one of the ways the admin confirmed it comes out
      const exact = written.get(key);
      if (exact) {
        placed = exact;
        used = width;
        break;
      }
      if (key.length < 3) continue;
      // otherwise the run is placed on the one saved word it strongly sounds like
      for (const one of spoken[width] || []) {
        if (Math.abs(one.word.length - key.length) > 2) continue;
        if (!strongMatch(key, one.word)) continue;
        // the saved word said the other way round is not where this run goes; nor is a run that
        // sounds like two different saved words — what was said is never flipped to make it fit
        if (saysTheOpposite(key, one.word)) break;
        if (placed && placed !== one.term) {
          placed = "";
          break;
        }
        placed = one.term;
      }
      if (placed) used = width;
    }

    if (used) {
      parts[runs[at]] = placed;
      // the rest of the run was taken in by the saved word that stands in its place
      for (let k = 1; k < used; k += 1) parts[runs[at + k]] = "";
    }
    at += used || 1;
  }

  return parts
    .join("")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

/**
 * What the ears are pointed at, read once and held while the store is unchanged: the words a turn
 * is read against, and the terms the reader is handed before it listens. A word the admin has just
 * saved is pointed at on the very next turn.
 *
 * The reader is handed the ways each word comes out as well as the spelling the app writes it in, so
 * the sounds a Kibembe word is really said with are read back as the one confirmed word they belong
 * to — a turn read that way needs no placing afterwards.
 */
export async function earsKnowledge(
  base44: any
): Promise<{ terms: string[]; rows: any[] }> {
  const [terms, rows] = await Promise.all([earKeyTerms(base44), knowledgeWordRows(base44)]);
  return { terms: withSaidWays(terms, rows), rows };
}

/** Each term carrying the ways the admin has confirmed that word comes out, so the reader is pointed
 *  at the spelling the app holds and at the sounds the person makes for it. */
function withSaidWays(terms: string[], rows: any[]): string[] {
  const ways = new Map<string, string[]>();
  for (const row of rows || []) {
    const key = tight(clean(row?.term, MAX_TERM));
    if (!key || ways.has(key)) continue;
    const forms = heardForms(row)
      .map((form) => form.replace(/\s+/g, " ").slice(0, 20))
      .filter((form) => form && tight(form) !== key)
      .slice(0, 3);
    if (forms.length) ways.set(key, forms);
  }
  if (!ways.size) return terms || [];
  return (terms || []).map((term) => {
    const forms = ways.get(tight(term));
    return forms?.length ? `${term} (said: ${forms.join(", ")})` : term;
  });
}