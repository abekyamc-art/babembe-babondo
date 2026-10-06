import { MAX_TERM, clean, knowledgeWordRows } from "./knowledgeWords.ts";
import { earKeyTerms } from "./hearingKeywords.ts";
import { heardForms, tight } from "./soundsAlike.ts";

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
 * those words, and on the ways the admin has confirmed each of them comes out, so the writing that
 * reaches the answering AI is the confirmed Ebembe itself and never a sound-alike of it.
 *
 * A word nobody saved is left exactly as it was said: this reader writes turns down, it never
 * invents a word, and it never replaces one word with another that merely resembles it.
 */

// The reading service, the reader every turn is written with, and the one an account that is not
// allowed the newer reader falls back to. Both read the same turn into the same letters.
const URL = "https://api.openai.com/v1/audio/transcriptions";
const MODEL = "gpt-4o-transcribe";
const FALLBACK_MODEL = "whisper-1";
// The reader knows no Kibembe at all. Kiswahili is the nearest language it does know, so the
// person's Kibembe comes back as Bantu sounds — the sounds the saved words are written in —
// instead of being forced into English nobody spoke. Naming it also stops the reader guessing.
const LANGUAGE = "sw";
// a turn is given this long to be read, generously: a Kibembe turn read properly is worth the wait
const HEAR_MS = 30000;
// how much of the app's own spelling is pointed at the reader: enough for the words being
// practised, short enough to stay a hint rather than a dictionary dropped in front of it
const MAX_PROMPT = 1500;

// What the reader is told before it listens. The words themselves follow it.
const PROMPT_HEAD = [
  "Kibembe (Ebembe) speech from a Babembe village.",
  "Write it down exactly as it is said, in the spelling of the words listed after this line.",
  "Write every sound of every word, the way it is spoken: never translate the turn, and never",
  "replace a Kibembe word with the English or Kiswahili word it nearly sounds like.",
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
  form.append("language", LANGUAGE);
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

/**
 * The turn placed on the app's own spelling of its words. A word the reader wrote as the admin
 * itself saved it, or as one of the ways the admin has confirmed that word comes out, is written
 * back in the saved spelling — so the Ebembe handed to the answering AI is the confirmed Ebembe.
 *
 * Nothing else is touched: a word nobody saved keeps the letters it was said in, and never becomes
 * the saved word it merely resembles — a reader that guessed at a different word would be answering
 * something the person never said.
 */
export function correctEbembe(text: string, rows: any[]): string {
  const said = String(text || "");
  if (!said || !rows?.length) return said;

  const saved = new Map<string, string>();
  for (const row of rows) {
    const term = clean(row?.term, MAX_TERM);
    if (!term || /\s/.test(term)) continue;
    for (const form of [term, ...heardForms(row)]) {
      const key = tight(form);
      if (key && !saved.has(key)) saved.set(key, term);
    }
  }
  if (!saved.size) return said;

  return said.replace(/[\p{L}'’]+/gu, (word: string) => saved.get(tight(word)) || word);
}

/**
 * What the ears are pointed at, read once and held while the store is unchanged: the words a turn
 * is read against, and the terms the reader is handed before it listens. A word the admin has just
 * saved is pointed at on the very next turn.
 */
export async function earsKnowledge(
  base44: any
): Promise<{ terms: string[]; rows: any[] }> {
  const [terms, rows] = await Promise.all([earKeyTerms(base44), knowledgeWordRows(base44)]);
  return { terms, rows };
}