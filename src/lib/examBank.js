/**
 * GLOIRE AI — the confirmed Kibembe medical vocabulary, and the examination built from it.
 *
 * Every term below was confirmed by Gloire Sadiki Asende (8 October 2026). The spelling, the accents,
 * the capitalisation and the spacing stand exactly as they were confirmed: nothing here is replaced
 * with Bemba, Chibemba, Lingala or an invented translation, and the wrong choices of every question
 * are taken from the other confirmed terms and from nowhere else.
 */

/** The selected medical study illustration, used exactly as it was supplied. */
export const DIAGRAM_URL =
  "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/7ffdce801_generated_a4a1faa3.png";

/** The three answer choices of every question. */
export const LETTERS = ["A", "B", "C"];

/** How many questions one examination holds. */
export const QUESTION_COUNT = 20;

/**
 * The four views of the illustration, named as they stand in it. A question says which view to study
 * and crops the plate to it — the numbered callouts are never read out as though they were confirmed
 * words, so nothing is claimed for a number that was not confirmed by the creator.
 */
const VIEW = {
  urinary: { name: "Urinary view", where: "the urinary view (top left)", spot: { x: 0.25, y: 0.25 } },
  organs: {
    name: "Internal organs view",
    where: "the internal organs view (top right)",
    spot: { x: 0.75, y: 0.25 },
  },
  female: {
    name: "Female reproductive view",
    where: "the female reproductive view (bottom left)",
    spot: { x: 0.25, y: 0.75 },
  },
  male: {
    name: "Male reproductive view",
    where: "the male reproductive view (bottom right)",
    spot: { x: 0.75, y: 0.75 },
  },
};

/** The confirmed vocabulary, each term with the system it belongs to and the view that shows it. */
const VOCAB = [
  { en: "Blood vessel", kb: "m-i-wa mshi", group: "Internal organs and blood vessels", view: "urinary" },
  { en: "Uterus", kb: "Mbuka ya chemmi", group: "Female reproductive system", view: "female" },
  { en: "Ovary", kb: "Ibolo la muinga na mandana enda", group: "Female reproductive system", view: "female" },
  { en: "Fallopian tube", kb: "Lubochi", group: "Female reproductive system", view: "female" },
  {
    en: "Cervix",
    kb: "Iochi la Lubochi; Iochi la Ibota",
    group: "Female reproductive system",
    view: "female",
    note: "Both expressions are correct.",
  },
  { en: "Vagina", kb: "Eisunde", group: "Female reproductive system", view: "female" },
  { en: "Vulva", kb: "Bútabala bw’a eisunde", group: "Female reproductive system", view: "female" },
  { en: "Clitoris", kb: "Loleká", group: "Female reproductive system", view: "female" },
  { en: "Labia", kb: "Bisweté", group: "Female reproductive system", view: "female" },
  { en: "Penis", kb: "Eloká", group: "Male reproductive system", view: "male" },
  { en: "Glans penis", kb: "Mchwe wa elúká", group: "Male reproductive system", view: "male" },
  {
    en: "Scrotum",
    kb: "Mabolo",
    group: "Male reproductive system",
    view: "male",
    note: "Scrotum and testicle both use Mabolo.",
  },
  {
    en: "Testicle",
    kb: "Mabolo",
    group: "Male reproductive system",
    view: "male",
    note: "Scrotum and testicle both use Mabolo.",
  },
  { en: "Sperm", kb: "Malúmé", group: "Male reproductive system", view: "male" },
  { en: "Semen", kb: "Ma verse", group: "Male reproductive system", view: "male" },
  { en: "Prostate gland", kb: "Mshipa", group: "Male reproductive system", view: "male" },
  { en: "Bladder", kb: "Esubalo", group: "Urinary system", view: "urinary" },
  { en: "Urethra", kb: "Elemba y’a masu", group: "Urinary system", view: "urinary" },
  {
    en: "Anus (woman)",
    kb: "hanyo",
    group: "Lower bowel",
    view: "female",
    note: "The recorded word for the anus differs by sex.",
  },
  {
    en: "Anus (man)",
    kb: "henyo",
    group: "Lower bowel",
    view: "male",
    note: "The recorded word for the anus differs by sex.",
  },
  { en: "Rectum", kb: "ibe", group: "Lower bowel", view: "female" },
];

const entryOf = (label) => VOCAB.find((row) => row.en === label);

/** The same list, in a different order, so no examination repeats the last one. */
function shuffled(list) {
  const out = [...list];
  for (let at = out.length - 1; at > 0; at -= 1) {
    const pick = Math.floor(Math.random() * (at + 1));
    [out[at], out[pick]] = [out[pick], out[at]];
  }
  return out;
}

/** Two wrong choices, every one of them another confirmed term and never an invented word. */
function wrongs(entry, pool, pick) {
  const out = [];
  for (const row of shuffled(pool)) {
    const text = pick(row);
    if (!text || text === pick(entry) || out.includes(text)) continue;
    out.push(text);
    if (out.length === 2) break;
  }
  return out;
}

/** One question, with the correct answer standing wherever the shuffle has put it. */
function questionOf({ id, kind, entry, prompt, right, wrong, explain, practice }) {
  const options = shuffled([right, ...wrong]);
  const view = VIEW[entry.view];
  return {
    id,
    kind,
    prompt,
    explain,
    options,
    correct: options.indexOf(right),
    practice: practice || [{ en: entry.en, kb: entry.kb }],
    focus: entry.group,
    view: view.name,
    spot: view.spot,
    hint: `Study ${view.where} of the illustration before you answer.`,
  };
}

/** English to Kibembe, and Kibembe to English: the two directions of the same confirmed pair. */
function translationQuestion(entry, direction) {
  const askKibembe = direction === "en_to_kb";
  const pick = askKibembe ? (row) => row.kb : (row) => row.en;
  const right = pick(entry);
  return questionOf({
    id: `${direction}:${entry.en}`,
    kind: direction,
    entry,
    prompt: askKibembe
      ? `What is the Kibembe word for “${entry.en}”?`
      : `What does the Kibembe term “${entry.kb}” mean?`,
    right,
    wrong: wrongs(entry, VOCAB, pick),
    explain: `${entry.kb} = ${entry.en}.${entry.note ? ` ${entry.note}` : ""}`,
  });
}

/** Which confirmed term names a structure of the system the question is about. */
function structureQuestion(entry) {
  return questionOf({
    id: `structure:${entry.en}`,
    kind: "structure",
    entry,
    prompt: `Look at ${VIEW[entry.view].where} of the illustration. Which confirmed Kibembe term names a structure of the ${entry.group.toLowerCase()}?`,
    right: entry.kb,
    wrong: wrongs(entry, VOCAB.filter((row) => row.group !== entry.group), (row) => row.kb),
    explain: `${entry.kb} = ${entry.en}.`,
  });
}

/** The terms that were confirmed with a rule of their own: two forms, one word for two structures, the anus by sex. */
function confirmedQuestions() {
  const cervix = entryOf("Cervix");
  const scrotum = entryOf("Scrotum");
  const woman = entryOf("Anus (woman)");
  const man = entryOf("Anus (man)");
  return [
    questionOf({
      id: "confirmed:cervix",
      kind: "confirmed",
      entry: cervix,
      prompt: "Both confirmed Kibembe expressions for the cervix stand as correct. Which choice carries them?",
      right: cervix.kb,
      wrong: ["Lubochi", "Eisunde"],
      explain: `Cervix — ${cervix.kb}. Both expressions are correct.`,
    }),
    questionOf({
      id: "confirmed:mabolo",
      kind: "confirmed",
      entry: scrotum,
      prompt: "Which confirmed Kibembe word is used for both the scrotum and the testicle?",
      right: "Mabolo",
      wrong: ["Malúmé", "Mshipa"],
      explain: "Mabolo = Scrotum and Testicle. The confirmed word is the same for both.",
      practice: [
        { en: "Scrotum", kb: "Mabolo" },
        { en: "Testicle", kb: "Mabolo" },
      ],
    }),
    questionOf({
      id: "confirmed:anus-woman",
      kind: "confirmed",
      entry: woman,
      prompt: "The recorded word for the anus differs by sex. Which is the confirmed form for a woman?",
      right: woman.kb,
      wrong: [man.kb, "ibe"],
      explain: "hanyo = Anus (woman). The form recorded for a man is henyo.",
      practice: [
        { en: "Anus (woman)", kb: "hanyo" },
        { en: "Anus (man)", kb: "henyo" },
      ],
    }),
    questionOf({
      id: "confirmed:anus-man",
      kind: "confirmed",
      entry: man,
      prompt: "The recorded word for the anus differs by sex. Which is the confirmed form for a man?",
      right: man.kb,
      wrong: [woman.kb, "ibe"],
      explain: "henyo = Anus (man). The form recorded for a woman is hanyo.",
      practice: [
        { en: "Anus (man)", kb: "henyo" },
        { en: "Anus (woman)", kb: "hanyo" },
      ],
    }),
  ];
}

/**
 * One examination of twenty questions, covering every confirmed term: twelve translation questions in
 * both directions, four questions naming a structure of a system, and four on the terms that carry a
 * rule of their own. The questions and the answer choices are both shuffled at the start, so the
 * correct answer never keeps one place.
 */
export function buildExam() {
  const translated = [
    ["Blood vessel", "en_to_kb"],
    ["Uterus", "kb_to_en"],
    ["Fallopian tube", "en_to_kb"],
    ["Vagina", "kb_to_en"],
    ["Vulva", "en_to_kb"],
    ["Clitoris", "kb_to_en"],
    ["Labia", "en_to_kb"],
    ["Penis", "kb_to_en"],
    ["Glans penis", "en_to_kb"],
    ["Sperm", "kb_to_en"],
    ["Semen", "en_to_kb"],
    ["Urethra", "kb_to_en"],
  ].map(([label, direction]) => translationQuestion(entryOf(label), direction));

  const structures = ["Ovary", "Prostate gland", "Bladder", "Rectum"].map((label) =>
    structureQuestion(entryOf(label))
  );

  return shuffled([...translated, ...structures, ...confirmedQuestions()]);
}