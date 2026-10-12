import { base44 } from '@/api/base44Client';
import { LIFE_SCENES, NUMBER_SCENES, PHRASE_SCENES, PROVERB_SCENES } from './examPictures';
import { CONFIRMED_NUMBERS, numberToDigit, numberNext, numberToKibembe } from './examExtras';

/**
 * GLOIRE AI — the confirmed words the examination asks about.
 *
 * The words are not written down here. They are read out of the app's own knowledge document, which is
 * the one place the language stands confirmed: every pair it holds is turned into two questions — the
 * Kibembe asked for its meaning, and the meaning asked for its Kibembe — and the two directions of one
 * pair are laid half a list apart, so a word is never asked twice near itself.
 *
 * One paper takes its own untouched run of the list, and the run of the paper after it carries on from
 * where that one stopped. A word therefore stands in one paper only and never comes back while the
 * document holds words the examination has not used yet.
 *
 * The list is kept on the phone once it has been read, so the examination opens the same way without a
 * network.
 */
const CACHE_KEY = 'gloire-kibembe-exam-pool-v2';
const CACHE_HOURS = 24;

/** The section that holds the terms of the body and health, asked among the words of every day. */
const MEDICAL = ['BODY AND HEALTH'];

/** The section that holds the terms of the adult body, asked on the anatomy season of its own. */
const ANATOMY = ['ADULT ANATOMY'];

/** The scenes a word with no picture of its own is studied on — none of them names an answer. */
export const SCENE_POOL = [
  ...Object.values(LIFE_SCENES),
  ...Object.values(NUMBER_SCENES),
  ...Object.values(PHRASE_SCENES),
  ...Object.values(PROVERB_SCENES),
];

/** What stands over a question, in the words the document's own sections use. */
const FOCUS = {
  'GREETINGS AND EVERYDAY CONVERSATION': 'Words of every day',
  'PEOPLE AND FAMILY': 'People and family',
  'BODY AND HEALTH': 'Body & health',
  'ADULT ANATOMY': 'Anatomy',
  'NATURE AND ANIMALS': 'Nature and animals',
  'VERBS AND TENSE FORMS': 'Verbs',
  'REACTIONS AND SHORT RESPONSES': 'Reactions',
  'SENTENCE PATTERNS': 'Sentences',
  'COMPLETE CONFIRMED REFERENCE BANK': 'Confirmed words',
  'CONFIRMED PROVERBS': 'Proverb',
};

let queues = null;

const form = (text) => String(text || '').toLowerCase().replace(/[.?!\s]+$/, '');

/**
 * A fixed order drawn from a seed: the same episode stands in the same paper every time it is opened,
 * so a paper is never reshuffled under a student who has half answered it.
 */
function seeded(seedText) {
  let hash = 2166136261;
  for (let at = 0; at < seedText.length; at += 1) {
    hash ^= seedText.charCodeAt(at);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash ^= hash << 13;
    hash >>>= 0;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    hash >>>= 0;
    return hash / 4294967296;
  };
}

function order(list, rand) {
  const out = [...list];
  for (let at = out.length - 1; at > 0; at -= 1) {
    const pick = Math.floor(rand() * (at + 1));
    [out[at], out[pick]] = [out[pick], out[at]];
  }
  return out;
}

/** The two other confirmed forms of the same kind, stepped out of the same list so they never repeat. */
function wrongOf(mix, at, askMeaning) {
  const right = askMeaning ? mix[at].en : mix[at].kb;
  const out = [];
  for (let step = 1; out.length < 2 && step < 60; step += 1) {
    const other = mix[(at + step * 13) % mix.length];
    const text = askMeaning ? other.en : other.kb;
    if (text && text !== right && !out.includes(text)) out.push(text);
  }
  return out;
}

/** One confirmed pair asked: its Kibembe for the meaning, or its meaning for the Kibembe. */
function wordQuestion(pair, askMeaning, mix, at, rand) {
  const right = askMeaning ? pair.en : pair.kb;
  const options = order([right, ...wrongOf(mix, at, askMeaning)], rand);
  return {
    id: `pool:${askMeaning ? 'mean' : 'form'}:${form(pair.kb)}`,
    focus: FOCUS[pair.section] || 'Confirmed words',
    prompt: askMeaning
      ? `What does the Kibembe term “${pair.kb}” mean?`
      : `What is the Kibembe word for “${pair.en}”?`,
    lead: askMeaning ? 'What does the Kibembe term “' : 'What is the Kibembe word for “',
    key: askMeaning ? pair.kb : pair.en,
    tail: askMeaning ? '” mean?' : '”?',
    kb: askMeaning ? pair.kb : '',
    options,
    correct: options.indexOf(right),
    explain: `${pair.kb} — ${pair.en}.`,
    practice: [{ en: pair.en, kb: pair.kb }],
    image: null,
    hint: '',
  };
}

/** One group's whole run: every pair asked one way, then every pair asked the other way. */
function queueOf(pairs, seedText) {
  const rand = seeded(seedText);
  const mix = order(pairs, rand);
  const first = mix.map((pair, at) => wordQuestion(pair, true, mix, at, rand));
  const second = order(mix, rand).map((pair, at) => wordQuestion(pair, false, mix, at, rand));
  return [...first, ...second];
}

/** The confirmed numbers, each asked the three ways the examination knows, each one time only. */
const NUMBER_QUESTIONS = CONFIRMED_NUMBERS.flatMap((row, at) => {
  const lang = at % 2 === 0 ? 'en' : 'sw';
  return [numberToKibembe(row, lang), numberNext(row, lang), numberToDigit(row, lang)].filter(Boolean);
});

/** The numbers stand among the words of every day, one every twentieth question. */
function withNumbers(list) {
  const out = [];
  let at = 0;
  list.forEach((question, index) => {
    if (index > 0 && index % 20 === 0 && at < NUMBER_QUESTIONS.length) {
      out.push(NUMBER_QUESTIONS[at]);
      at += 1;
    }
    out.push(question);
  });
  return out;
}

/** Every confirmed word made into questions: the words of every day in one run, the body and health in another. */
export function buildQueues(pairs) {
  const safe = Array.isArray(pairs) ? pairs.filter((pair) => pair && pair.kb && pair.en) : [];
  const anatomy = safe.filter((pair) => ANATOMY.includes(pair.section));
  const medical = safe.filter((pair) => MEDICAL.includes(pair.section));
  const everyday = safe.filter(
    (pair) => !MEDICAL.includes(pair.section) && !ANATOMY.includes(pair.section)
  );
  return {
    everyday: withNumbers(queueOf(everyday, 'everyday')),
    medical: queueOf(medical, 'medical'),
    anatomy: queueOf(anatomy, 'anatomy'),
  };
}

export function installQueues(next) {
  queues = next || null;
}

export function currentQueues() {
  return queues;
}

/** How many word questions the confirmed bank holds: what the examination's papers are shared out of. */
export function poolShare() {
  return queues ? queues.everyday.length + queues.medical.length : 0;
}

function keep(records) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(records));
  } catch (err) {
    // a phone that keeps no store still takes the examination
  }
}

function heldRecords() {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const records = JSON.parse(raw);
    if (!records?.at || Date.now() - records.at > CACHE_HOURS * 3600 * 1000) return null;
    return records;
  } catch (err) {
    return null;
  }
}

/**
 * The confirmed words, read once and kept: from the phone's own copy when it holds a fresh one, and from
 * the app otherwise. Nothing is drawn when the document cannot be reached — the paper then falls back to
 * the examination's own written lists rather than standing empty.
 */
export async function loadExamPool() {
  if (queues) return queues;
  const records = heldRecords();
  if (records?.pairs?.length) {
    installQueues(buildQueues(records.pairs));
    return queues;
  }
  const answer = await base44.functions.invoke('examPool', {});
  const rows = answer?.data?.pairs || [];
  const pairs = rows.map((row) =>
    Array.isArray(row) ? { kb: row[0], en: row[1], section: row[2] } : row
  );
  if (!pairs.length) return null;
  keep({ at: Date.now(), version: answer?.data?.version || '', pairs });
  installQueues(buildQueues(pairs));
  return queues;
}