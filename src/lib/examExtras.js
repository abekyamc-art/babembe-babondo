import { shuffled } from "./examSeries";

/**
 * GLOIRE AI — the numbers, the greetings and phrases, and the proverbs of the examination.
 *
 * Every Ebembe form below stands exactly as the admin's own knowledge document confirms it — its
 * spelling, its accents, its apostrophes and its spaces kept as they were written — and every meaning
 * is the document's own gloss of that form. A form the document does not hold is left out altogether
 * rather than guessed at: nothing is invented, and nothing is replaced with another language's word.
 *
 * A question may be put in English or in Kiswahili — the admin uses both — and its three choices are
 * always the confirmed forms themselves, so the language a question is asked in never changes which
 * answer is the right one. The two wrong choices are other confirmed entries of the same kind.
 */

/** The confirmed number system, one entry for every form the document holds. */
const NUMBERS = [
  { n: 1, kb: "y-imo", en: "one" },
  { n: 2, kb: "bobele", en: "two" },
  { n: 3, kb: "busatu", en: "three" },
  { n: 4, kb: "bonachi", en: "four" },
  { n: 5, kb: "botano", en: "five" },
  { n: 6, kb: "mtoba", en: "six" },
  { n: 7, kb: "Mwenji", en: "seven" },
  { n: 8, kb: "E-nane", en: "eight" },
  { n: 9, kb: "ienda", en: "nine" },
  { n: 10, kb: "iomi", en: "ten" },
  { n: 11, kb: "iomi na y-imo", en: "eleven" },
  { n: 12, kb: "iomi na bobele", en: "twelve" },
  { n: 13, kb: "iomi na busatu", en: "thirteen" },
  { n: 14, kb: "iomi na bonachi", en: "fourteen" },
  { n: 15, kb: "iomi na botano", en: "fifteen" },
  { n: 16, kb: "iomi na mtoba", en: "sixteen" },
  { n: 17, kb: "iomi na Mwenji", en: "seventeen" },
  { n: 18, kb: "iomi na E-nane", en: "eighteen" },
  { n: 19, kb: "iomi na ienda", en: "nineteen" },
  { n: 20, kb: "Mo ma bele", en: "twenty" },
  { n: 30, kb: "Mo ma sato", en: "thirty" },
  { n: 40, kb: "Mo maa nachi", en: "forty" },
  { n: 50, kb: "Mo ma tano", en: "fifty" },
  { n: 60, kb: "Ma omi mtoba", en: "sixty" },
  { n: 80, kb: "Ma omi e nane", en: "eighty" },
  { n: 90, kb: "Ma omi ienda", en: "ninety" },
  { n: 100, kb: "Ikana", en: "one hundred" },
  { n: 1000, kb: "Elufu", en: "one thousand" },
];

/** The confirmed greetings and everyday phrases, one entry for each meaning the document gives. */
const PHRASES = [
  { kb: "Walo lala bile?", en: "How did you sleep?" },
  { kb: "Na lo lalabia ngeni.", en: "I slept well" },
  { kb: "Karibu lo nge.", en: "Welcome back" },
  { kb: "Twa i-ana mda wa lea bila i-monana.", en: "Long time no see" },
  { kb: "Nasoa Kilwa Iomona.", en: "Nice to see you" },
  { kb: "Ole bile lunoru suku?", en: "How was your day?" },
  { kb: "Obe na lu suku luwa ngene.", en: "Have a good day" },
  { kb: "O lale byangene.", en: "Sleep well" },
  { kb: "Tomo nane badae.", en: "See you later" },
  { kb: "Karibu umboka.", en: "Welcome home" },
  { kb: "Hongera.", en: "Congratulations" },
  { kb: "Soa kelwa ya lu suku lui bo chwa.", en: "Happy birthday" },
  { kb: "Oto ela", en: "Please repeat" },
  { kb: "Ya wa chibwa.", en: "It has been confirmed" },
  { kb: "E-nywa.", en: "Word" },
  { kb: "Ole tayari iendelea.", en: "Are you ready to continue?" },
];

/** The confirmed proverbs of the document, each with the meaning the document itself gives it. */
const PROVERBS = [
  { kb: "Ikyi laanine anyonyi.", en: "An egg advised a bird" },
  { kb: "Yangéne taé lamaka.", en: "Something good never lasts" },
  { kb: "Mlébinge imwikyúfacwa binge.", en: "More goes where there is more" },
  { kb: "Bwato bwikye ú nyata mwake ú’mkongo.", en: "A boat moves using its back" },
  { kb: "A’amba chikyúmina cilingye.", en: "Monkeys of the same age play together" },
  { kb: "Búakwe lile cala.", en: "In-laws are a dustbin" },
  { kb: "Úaboo úakyúsaa úange.", en: "One hand washes another" },
  { kb: "Búakúamba étonde.", en: "Sterility is a shining stain" },
  { kb: "Lúsúabila ta lúakye.", en: "Stagnant water is always dangerous" },
  { kb: "Tú yake eléma ‘yobe.", en: "Never kill your own lame person" },
  { kb: "Mwanúae takyomanya lwango tana bela ndea.", en: "A child learns after breaking a calabash" },
  { kb: "Bikye úayana baana i pala ca baúlú.", en: "Children’s games are the work of adults" },
  { kb: "Cécécé hikyúbangya.", en: "Gossip is harmful" },
  { kb: "Aya m’nda i obe.", en: "Yours is what has entered your stomach" },
  { kb: "Úanga obe a mnobe alé na malinga.", en: "Take care of what belongs to you" },
  { kb: "Asúfngile taâniaka.", en: "One who swam never sinks" },
  { kb: "Hitú likyúahúfangwa na léshi lyake.", en: "An ear can hear even what does not belong to it" },
  { kb: "Wa chimbya mchwe aema ibekwa.", en: "One who shakes the head refuses to be shaved" },
];

/** The three kinds a mixed question is taken from. */
const KINDS = ["number", "phrase", "proverb"];

/**
 * Each kind's own list, shuffled once and then kept: an episode's mixed questions are cut from it one
 * form further on with every turn, so the episodes beside one another never ask the same form.
 */
const ORDER = {
  number: shuffled(NUMBERS),
  phrase: shuffled(PHRASES),
  proverb: shuffled(PROVERBS),
};

/**
 * The form of a confirmed entry, compared apart from a trailing full stop or question mark. The two
 * lists write a few of the same phrases a little differently, and one paper must not ask it twice.
 */
const form = (text) => String(text || "").toLowerCase().replace(/[.?!\s]+$/, "");

// the label the card carries over the question
const FOCUS = { number: "Number", phrase: "Phrase", proverb: "Proverb" };

// what the question turns on, and the one line telling the student how to read it
const HINT = "Read the coloured words first — they are what the question turns on.";

/**
 * What each question asks, in the two languages the whole examination is put in: the English ask and
 * the Kiswahili one, each split into the words that come before the key, the key itself, and the
 * words after it — so the key stands in its own colour wherever it falls in the sentence.
 */
const ASK = {
  number_to_kibembe: {
    en: ["Write the number ", " in Kibembe."],
    sw: ["Andika namba ", " kwa Kibembe."],
  },
  number_to_digit: {
    en: ["Which number is the Kibembe “", "”?"],
    sw: ["Namba ya Kibembe “", "” ni namba ipi?"],
  },
  phrase: {
    en: ["What does the Kibembe phrase “", "” mean?"],
    sw: ["Maneno ya Kibembe “", "” yana maana gani?"],
  },
  proverb: {
    en: ["What does the Kibembe proverb “", "” mean?"],
    sw: ["Methali hii ya Kibembe “", "” ina maana gani?"],
  },
};

/** The two other confirmed forms of the same kind, so no unconfirmed choice is ever put up. */
function others(row, pool, pick) {
  const out = [];
  for (const other of shuffled(pool)) {
    const text = pick(other);
    if (!text || text === pick(row) || out.includes(text)) continue;
    out.push(text);
    if (out.length === 2) break;
  }
  return out;
}

/** One question, with the correct answer standing wherever the shuffle has put it. */
function question({ id, kind, lead, key, tail, right, wrong, explain, practice }) {
  const options = shuffled([right, ...wrong]);
  return {
    id,
    kind,
    prompt: `${lead}${key}${tail}`,
    lead,
    key,
    tail,
    options,
    correct: options.indexOf(right),
    explain,
    practice,
    focus: FOCUS[kind],
    hint: HINT,
  };
}

/** The number itself is given and its confirmed Kibembe form is asked for. */
function numberToKibembe(row, lang) {
  const [lead, tail] = ASK.number_to_kibembe[lang];
  return question({
    id: `number:${row.n}:kibembe:${lang}`,
    kind: "number",
    lead,
    key: String(row.n),
    tail,
    right: row.kb,
    wrong: others(row, NUMBERS, (other) => other.kb),
    explain: `${row.n} = ${row.kb} — ${row.en}.`,
    practice: [{ en: row.en, kb: row.kb }],
  });
}

/** The confirmed Kibembe form is given and the number it stands for is asked for. */
function numberToDigit(row, lang) {
  const [lead, tail] = ASK.number_to_digit[lang];
  return question({
    id: `number:${row.n}:digit:${lang}`,
    kind: "number",
    lead,
    key: row.kb,
    tail,
    right: String(row.n),
    wrong: others(row, NUMBERS, (other) => String(other.n)),
    explain: `${row.kb} = ${row.n} — ${row.en}.`,
    practice: [{ en: row.en, kb: row.kb }],
  });
}

/** A confirmed greeting or everyday phrase is given and its meaning is asked for. */
function phraseQuestion(row, lang) {
  const [lead, tail] = ASK.phrase[lang];
  return question({
    id: `phrase:${row.kb}:${lang}`,
    kind: "phrase",
    lead,
    key: row.kb,
    tail,
    right: row.en,
    wrong: others(row, PHRASES, (other) => other.en),
    explain: `${row.kb} — ${row.en}.`,
    practice: [{ en: row.en, kb: row.kb }],
  });
}

/** A confirmed proverb is given and the meaning the document gives it is asked for. */
function proverbQuestion(row, lang) {
  const [lead, tail] = ASK.proverb[lang];
  return question({
    id: `proverb:${row.kb}:${lang}`,
    kind: "proverb",
    lead,
    key: row.kb,
    tail,
    right: row.en,
    wrong: others(row, PROVERBS, (other) => other.en),
    explain: `${row.kb} — ${row.en}.`,
    practice: [{ en: row.en, kb: row.kb }],
  });
}

/**
 * One mixed question: a number, a greeting or a proverb, put in English or in Kiswahili. Which of the two
 * languages it is put in, and which way round a number is asked, follow the place the question stands in,
 * so an episode's own mixed questions are always its own.
 */
function extraQuestion(entry, episode, slot) {
  const odd = (episode + slot) % 2 === 1;
  const lang = odd ? "en" : "sw";
  if (entry.kind === "number") {
    return odd ? numberToKibembe(entry.row, lang) : numberToDigit(entry.row, lang);
  }
  return entry.kind === "phrase"
    ? phraseQuestion(entry.row, lang)
    : proverbQuestion(entry.row, lang);
}

/**
 * The mixed questions of one episode: its number, its greeting or phrase and its proverb, taken from the
 * kind whose turn it is and from that kind's own place in its list — so the episodes beside each other
 * never ask the same form, and a paper of two never asks two numbers or two proverbs where a number and a
 * saying will do. The counting, the talking of every day and the sayings of the language are met in the
 * same paper.
 *
 * `avoid` carries the forms the paper is already asking — the everyday words it has just drawn — so a
 * phrase the same paper asks as a word of every day is stepped over rather than asked a second time.
 */
export function buildExtraMix(count, episode = 1, avoid = []) {
  if (!count || count <= 0) return [];
  const at = Math.max(1, episode);
  // how many times each kind has had its turn before this episode
  const turn = Math.floor((at - 1) / KINDS.length);
  const asked = new Set(avoid.map(form));

  const picked = [];
  for (let slot = 0; slot < Math.min(count, KINDS.length); slot += 1) {
    const kind = KINDS[(at - 1 + slot) % KINDS.length];
    const order = ORDER[kind];
    // step on along this kind's own list until a form the paper does not already ask stands
    let row = order[turn % order.length];
    for (let step = 1; step <= order.length && asked.has(form(row.kb)); step += 1) {
      row = order[(turn + step) % order.length];
    }
    asked.add(form(row.kb));
    picked.push(extraQuestion({ kind, row }, at, slot));
  }
  return picked;
}