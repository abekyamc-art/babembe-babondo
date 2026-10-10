import { shuffled } from "./examSeries";
import { LIFE_SCENES, NUMBER_SCENES, PHRASE_SCENES, PROVERB_SCENES } from "./examPictures";

/**
 * GLOIRE AI — the numbers, the greetings, the everyday phrases and the proverbs of the examination.
 *
 * Every Ebembe form below stands exactly as the admin's own knowledge document confirms it — its
 * spelling, its accents, its apostrophes and its spaces kept as they were written — and every meaning
 * is the document's own gloss of that form. A form the document does not hold is left out altogether
 * rather than guessed at: nothing is invented, and nothing is replaced with another language's word.
 *
 * A question may be put in English or in Kiswahili — the admin uses both — and its three choices are
 * always the confirmed forms themselves, so the language a question is asked in never changes which
 * answer is the right one. The two wrong choices are other confirmed entries of the same kind.
 *
 * Every entry carries the picture drawn for its own scene, so a mixed question is studied on a picture
 * the same way the words of every day are, and every question turns on the one form it asks about,
 * standing in a colour of its own.
 */

/** The scenes drawn for the counting, one of them standing beside every number question. */
const COUNTING = [NUMBER_SCENES.coins, NUMBER_SCENES.tally, NUMBER_SCENES.herd];

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
].map((row, at) => ({ ...row, scene: COUNTING[at % COUNTING.length] }));

/** The confirmed greetings, one entry for each meaning the document gives. */
const GREETINGS = [
  { kb: "Walo lala bile?", en: "How did you sleep?", scene: LIFE_SCENES.morning },
  { kb: "Na lo lalabia ngeni.", en: "I slept well", scene: LIFE_SCENES.rested },
  { kb: "Karibu lo nge.", en: "Welcome back", scene: LIFE_SCENES.arriving },
  { kb: "Karibu umboka.", en: "Welcome home", scene: LIFE_SCENES.welcoming },
  { kb: "Nasoa Kilwa Iomona.", en: "Nice to see you", scene: PHRASE_SCENES.meeting },
  { kb: "Twa i-ana mda wa lea bila i-monana.", en: "Long time no see", scene: PHRASE_SCENES.meeting },
  { kb: "Ole bile lunoru suku?", en: "How was your day?", scene: PHRASE_SCENES.evening },
  { kb: "Obe na lu suku luwa ngene.", en: "Have a good day", scene: PHRASE_SCENES.evening },
  { kb: "O lale byangene.", en: "Sleep well", scene: LIFE_SCENES.night },
  { kb: "Tomo nane badae.", en: "See you later", scene: PHRASE_SCENES.parting },
  { kb: "Hongera.", en: "Congratulations", scene: PHRASE_SCENES.celebration },
  { kb: "Soa kelwa ya lu suku lui bo chwa.", en: "Happy birthday", scene: PHRASE_SCENES.celebration },
];

/** The confirmed everyday phrases that are not greetings. */
const PHRASES = [
  { kb: "Oto ela", en: "Please repeat", scene: LIFE_SCENES.again },
  { kb: "Ya wa chibwa.", en: "It has been confirmed", scene: PHRASE_SCENES.agreement },
  { kb: "E-nywa.", en: "Word", scene: PHRASE_SCENES.agreement },
  { kb: "Ole tayari iendelea.", en: "Are you ready to continue?", scene: PHRASE_SCENES.ready },
];

/** The confirmed proverbs of the document, each with the meaning the document itself gives it. */
const PROVERBS = [
  { kb: "Ikyi laanine anyonyi.", en: "An egg advised a bird", scene: PROVERB_SCENES.bird },
  { kb: "Yangéne taé lamaka.", en: "Something good never lasts", scene: PROVERB_SCENES.flower },
  {
    kb: "Mlébinge imwikyúfacwa binge.",
    en: "More goes where there is more",
    scene: PROVERB_SCENES.granary,
  },
  {
    kb: "Bwato bwikye ú nyata mwake ú’mkongo.",
    en: "A boat moves using its back",
    scene: PROVERB_SCENES.river,
  },
  {
    kb: "A’amba chikyúmina cilingye.",
    en: "Monkeys of the same age play together",
    scene: PROVERB_SCENES.monkeys,
  },
  { kb: "Búakwe lile cala.", en: "In-laws are a dustbin", scene: PROVERB_SCENES.granary },
  { kb: "Úaboo úakyúsaa úange.", en: "One hand washes another", scene: PROVERB_SCENES.hands },
  { kb: "Búakúamba étonde.", en: "Sterility is a shining stain", scene: PROVERB_SCENES.granary },
  {
    kb: "Lúsúabila ta lúakye.",
    en: "Stagnant water is always dangerous",
    scene: PROVERB_SCENES.river,
  },
  {
    kb: "Tú yake eléma ‘yobe.",
    en: "Never kill your own lame person",
    scene: PROVERB_SCENES.helping,
  },
  {
    kb: "Mwanúae takyomanya lwango tana bela ndea.",
    en: "A child learns after breaking a calabash",
    scene: PROVERB_SCENES.children,
  },
  {
    kb: "Bikye úayana baana i pala ca baúlú.",
    en: "Children’s games are the work of adults",
    scene: PROVERB_SCENES.children,
  },
  { kb: "Cécécé hikyúbangya.", en: "Gossip is harmful", scene: PROVERB_SCENES.whispering },
  {
    kb: "Aya m’nda i obe.",
    en: "Yours is what has entered your stomach",
    scene: PROVERB_SCENES.granary,
  },
  {
    kb: "Úanga obe a mnobe alé na malinga.",
    en: "Take care of what belongs to you",
    scene: PROVERB_SCENES.granary,
  },
  { kb: "Asúfngile taâniaka.", en: "One who swam never sinks", scene: PROVERB_SCENES.river },
  {
    kb: "Hitú likyúahúfangwa na léshi lyake.",
    en: "An ear can hear even what does not belong to it",
    scene: PROVERB_SCENES.whispering,
  },
  {
    kb: "Wa chimbya mchwe aema ibekwa.",
    en: "One who shakes the head refuses to be shaved",
    scene: PROVERB_SCENES.barber,
  },
];

/** The four kinds a mixed question is taken from. */
const KINDS = ["number", "greeting", "phrase", "proverb"];

/** Each kind's own list of confirmed entries. */
const POOLS = { number: NUMBERS, greeting: GREETINGS, phrase: PHRASES, proverb: PROVERBS };

/** The ways one entry can be asked, taken in turn so the same form never comes back the same way twice. */
const WAYS = {
  number: ["number_to_kibembe", "number_to_digit", "number_next"],
  greeting: ["to_meaning", "to_form"],
  phrase: ["to_meaning", "to_form"],
  proverb: ["to_meaning", "to_form"],
};

/**
 * Each kind's own list, shuffled once and then kept: an episode's mixed questions are cut from it one
 * form further on with every turn, so the episodes beside one another never ask the same form.
 */
const ORDER = {
  number: shuffled(NUMBERS),
  greeting: shuffled(GREETINGS),
  phrase: shuffled(PHRASES),
  proverb: shuffled(PROVERBS),
};

/**
 * The form of a confirmed entry, compared apart from a trailing full stop or question mark. The two
 * lists write a few of the same phrases a little differently, and one paper must not ask it twice.
 */
const form = (text) => String(text || "").toLowerCase().replace(/[.?!\s]+$/, "");

// the label the card carries over the question
const FOCUS = { number: "Number", greeting: "Greeting", phrase: "Phrase", proverb: "Proverb" };

/**
 * What each way of asking says, in the two languages the whole examination is put in: the English ask
 * and the Kiswahili one, each split into the words that come before the key, the key itself, and the
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
  greeting_to_meaning: {
    en: ["What does the Kibembe greeting “", "” mean?"],
    sw: ["Salamu ya Kibembe “", "” ina maana gani?"],
  },
  greeting_to_form: {
    en: ["Which Kibembe greeting means “", "”?"],
    sw: ["Salamu ipi ya Kibembe ina maana “", "”?"],
  },
  phrase_to_meaning: {
    en: ["What does the Kibembe phrase “", "” mean?"],
    sw: ["Maneno ya Kibembe “", "” yana maana gani?"],
  },
  phrase_to_form: {
    en: ["Which Kibembe phrase means “", "”?"],
    sw: ["Maneno ipi ya Kibembe ina maana “", "”?"],
  },
  proverb_to_meaning: {
    en: ["What does the Kibembe proverb “", "” mean?"],
    sw: ["Methali hii ya Kibembe “", "” ina maana gani?"],
  },
  proverb_to_form: {
    en: ["Which Kibembe proverb means “", "”?"],
    sw: ["Methali ipi ya Kibembe ina maana “", "”?"],
  },
};

/** The two other confirmed forms of the same kind, so no unconfirmed choice is ever put up. */
function others(row, pool, pick, skip = []) {
  const out = [];
  for (const other of shuffled(pool)) {
    const text = pick(other);
    if (!text || text === pick(row) || skip.includes(text) || out.includes(text)) continue;
    out.push(text);
    if (out.length === 2) break;
  }
  return out;
}

/** One question, with the correct answer standing wherever the shuffle has put it. */
function question({ id, kind, lead, key, tail, right, wrong, explain, practice, picture }) {
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
    image: picture,
    hint: picture
      ? `Study the picture — ${picture.scene} — before you answer.`
      : "Read the coloured words first — they are what the question turns on.",
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
    picture: row.scene,
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
    picture: row.scene,
  });
}

/**
 * The counting itself: the confirmed Kibembe form is given with its meaning, and the number that comes
 * right after it is asked for. A question is only put where the number after it stands in the confirmed
 * list as well, so nothing is ever counted on beyond what the document holds.
 */
function numberNext(row, lang) {
  const after = NUMBERS.find((other) => other.n === row.n + 1);
  if (!after) return null;
  const en = lang !== "sw";
  return question({
    id: `number:${row.n}:next:${lang}`,
    kind: "number",
    lead: en
      ? "Which confirmed Kibembe number comes right after “"
      : "Namba ya Kibembe inayofuata “",
    key: row.kb,
    tail: en ? `” (${row.en})?` : `” (${row.en}) ni ipi?`,
    right: after.kb,
    wrong: others(row, NUMBERS, (other) => other.kb, [after.kb]),
    explain: `After ${row.kb} (${row.n}) comes ${after.kb} (${after.n}).`,
    practice: [
      { en: row.en, kb: row.kb },
      { en: after.en, kb: after.kb },
    ],
    picture: row.scene,
  });
}

/** A confirmed form of a kind is given and its meaning is asked for. */
function meaningQuestion(kind, row, lang) {
  const [lead, tail] = ASK[`${kind}_to_meaning`][lang];
  return question({
    id: `${kind}:${row.kb}:meaning:${lang}`,
    kind,
    lead,
    key: row.kb,
    tail,
    right: row.en,
    wrong: others(row, POOLS[kind], (other) => other.en),
    explain: `${row.kb} — ${row.en}.`,
    practice: [{ en: row.en, kb: row.kb }],
    picture: row.scene,
  });
}

/** A meaning is given and the confirmed form of that kind is asked for: the same pair the other way. */
function formQuestion(kind, row, lang) {
  const [lead, tail] = ASK[`${kind}_to_form`][lang];
  return question({
    id: `${kind}:${row.kb}:form:${lang}`,
    kind,
    lead,
    key: row.en,
    tail,
    right: row.kb,
    wrong: others(row, POOLS[kind], (other) => other.kb),
    explain: `${row.en} — ${row.kb}.`,
    practice: [{ en: row.en, kb: row.kb }],
    picture: row.scene,
  });
}

/** One mixed question, put the way its kind's turn has come round to and in one of the two languages. */
function extraQuestion(kind, row, way, lang) {
  if (kind !== "number") {
    return way === "to_form" ? formQuestion(kind, row, lang) : meaningQuestion(kind, row, lang);
  }
  if (way === "number_to_digit") return numberToDigit(row, lang);
  if (way === "number_next") return numberNext(row, lang) || numberToKibembe(row, lang);
  return numberToKibembe(row, lang);
}

/**
 * The mixed questions of one episode: taken from the kinds whose turn it is — a number, a greeting, a
 * phrase and a proverb in turn — and from each kind's own place in its list, so the episodes beside each
 * other never ask the same form, and no paper asks two numbers or two proverbs where a greeting will do.
 *
 * Every way of asking is taken in turn as well: a number is asked for its Kibembe form, then the number
 * it stands for, then the number that comes after it, and a greeting, a phrase or a proverb is asked
 * from its Kibembe to its meaning and back again — so the counting, the greetings of every day and the
 * sayings of the language are met in the same paper, each of them more than one way.
 *
 * `avoid` carries the forms the paper is already asking — the everyday words it has just drawn — so a
 * phrase the same paper asks as a word of every day is stepped over rather than asked a second time.
 */
/** How many times each kind has been asked in the episodes before this one. */
function turnsBefore(episode, count) {
  const turns = { number: 0, greeting: 0, phrase: 0, proverb: 0 };
  for (let at = 1; at < episode; at += 1) {
    for (let slot = 0; slot < Math.min(count, KINDS.length); slot += 1) {
      turns[KINDS[(at - 1 + slot) % KINDS.length]] += 1;
    }
  }
  return turns;
}

export function buildExtraMix(count, episode = 1, avoid = []) {
  if (!count || count <= 0) return [];
  const at = Math.max(1, episode);
  // each kind's own place in its list: every time a kind is asked it steps one form on, so two episodes
  // beside each other never ask the same form, and a form only comes back once its whole list is round
  const turns = turnsBefore(at, count);
  const asked = new Set(avoid.map(form));

  const picked = [];
  for (let slot = 0; slot < Math.min(count, KINDS.length); slot += 1) {
    const kind = KINDS[(at - 1 + slot) % KINDS.length];
    const order = ORDER[kind];
    const turn = turns[kind];
    // step on along this kind's own list until a form the paper does not already ask stands
    let row = order[turn % order.length];
    for (let step = 1; step <= order.length; step += 1) {
      if (!asked.has(form(row.kb)) && !asked.has(form(row.en))) break;
      row = order[(turn + step) % order.length];
    }
    asked.add(form(row.kb));
    asked.add(form(row.en));
    turns[kind] = turn + 1;

    const ways = WAYS[kind];
    const lang = (at + slot) % 2 === 1 ? "en" : "sw";
    picked.push(extraQuestion(kind, row, ways[turn % ways.length], lang));
  }
  return picked.filter(Boolean);
}