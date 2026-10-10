import { LIFE_ROWS } from "./lifeExamWords";
import { buildMedicalMix, buildMedicalPaper, buildRulePaper } from "./examBank";

/**
 * The one examination series of GLOIRE AI: numbered levels 1, 2, 3 and on, every one of them mixing the
 * everyday Kibembe of daily life with the confirmed terms of the body and health.
 *
 * Nothing here is guessed at. The daily-life forms come from lifeExamWords.js and the health terms from
 * examBank.js, each exactly as the admin's own knowledge document confirms it, and the two wrong choices
 * of every question are other confirmed forms — so no choice that was never confirmed is ever put in
 * front of a student. Passing a level at 80% opens the one after it; a level may be taken again as often
 * as the student likes, and no day has a limit anywhere in it.
 */

/** The same list, in a different order, so no paper repeats the last one. */
export function shuffled(list) {
  const out = [...list];
  for (let at = out.length - 1; at > 0; at -= 1) {
    const pick = Math.floor(Math.random() * (at + 1));
    [out[at], out[pick]] = [out[pick], out[at]];
  }
  return out;
}

const BY_ID = new Map(LIFE_ROWS.map((row) => [row.id, row]));

/** One daily-life question, with the correct answer standing wherever the shuffle has put it. */
export function lifeQuestionOf(row) {
  const askKibembe = row.direction === "en_to_kb";
  const right = askKibembe ? row.kb : row.en;
  const options = shuffled([right, ...row.wrong]);

  return {
    id: row.id,
    prompt: askKibembe
      ? `What is the Kibembe word for “${row.en}”?`
      : `What does the Kibembe term “${row.kb}” mean?`,
    explain: `${row.kb} = ${row.en}.`,
    options,
    correct: options.indexOf(right),
    practice: row.practice || [{ en: row.en, kb: row.kb }],
    image: row.image,
    hint: `Study the picture — ${row.image.scene} — before you answer.`,
  };
}

/**
 * The series, level by level. Each level asks its own everyday words beside its own health terms, so a
 * student meets the two together from the first level on; the last two levels draw their papers from the
 * whole series at once. A level is one more entry here, and nothing else has to change to add it.
 */
const LEVELS = [
  {
    no: 1,
    title: "First greetings",
    blurb: "Thanking, welcoming, saying yes · the urinary terms",
    life: { ids: ["greet:thanks", "greet:repeat", "greet:back", "greet:home", "greet:yes"] },
    medical: {
      terms: [
        ["Blood vessel", "en_to_kb"],
        ["Bladder", "kb_to_en"],
        ["Urethra", "en_to_kb"],
      ],
    },
  },
  {
    no: 2,
    title: "Sleep and rest",
    blurb: "Sleeping well, the bed and the room · the lower bowel terms",
    life: { ids: ["sleep:how", "sleep:well", "sleep:slept", "sleep:bed", "sleep:room"] },
    medical: {
      terms: [
        ["Anus (woman)", "kb_to_en"],
        ["Anus (man)", "en_to_kb"],
        ["Rectum", "kb_to_en"],
      ],
    },
  },
  {
    no: 3,
    title: "Home and family",
    blurb: "Father, child, house, water and door · the female terms, part one",
    life: { ids: ["home:father", "home:child", "home:house", "home:water", "home:door"] },
    medical: {
      terms: [
        ["Uterus", "kb_to_en"],
        ["Ovary", "en_to_kb"],
        ["Fallopian tube", "kb_to_en"],
      ],
    },
  },
  {
    no: 4,
    title: "Out in the village",
    blurb: "The market, money, the road, school and hospital · the female terms, part two",
    life: {
      ids: ["village:market", "village:money", "village:road", "village:school", "village:hospital"],
    },
    medical: {
      terms: [
        ["Vagina", "kb_to_en"],
        ["Vulva", "en_to_kb"],
        ["Clitoris", "kb_to_en"],
      ],
    },
  },
  {
    no: 5,
    title: "Everyday talk",
    blurb: "Saying okay, coming, paying and help · the male terms, part one",
    life: { ids: ["talk:know", "talk:okay", "talk:come", "talk:pay", "talk:help"] },
    medical: {
      terms: [
        ["Penis", "kb_to_en"],
        ["Glans penis", "en_to_kb"],
        // one confirmed word covers both the scrotum and the testicle, so each is asked toward Kibembe only
        ["Scrotum", "en_to_kb"],
      ],
    },
  },
  {
    no: 6,
    title: "On the way",
    blurb: "The shop, the journey, medicine and a sick day · the male terms, part two",
    life: {
      ids: ["way:shop", "way:onmyway", "way:medicine", "way:sick", "way:nomoney"],
    },
    medical: {
      terms: [
        ["Testicle", "en_to_kb"],
        ["Sperm", "kb_to_en"],
        ["Semen", "en_to_kb"],
      ],
    },
  },
  {
    no: 7,
    title: "Terms with a rule",
    blurb: "A mixed life paper · the words confirmed with a rule of their own",
    life: { mix: 5 },
    medical: { rules: true },
  },
  {
    no: 8,
    title: "The whole series",
    blurb: "Every theme at once — everyday Kibembe and the health terms together",
    life: { mix: 6 },
    medical: { mix: 4 },
  },
];

/** How many questions a level asks: its everyday part and its health part together. */
function sizeOf(level) {
  const life = level.life.ids ? level.life.ids.length : level.life.mix;
  const medical = level.medical.terms ? level.medical.terms.length : level.medical.mix || 4;
  return life + medical;
}

/** The series itself, every level carrying the count of questions it asks. */
export const EXAM_LEVELS = LEVELS.map((level) => ({ ...level, size: sizeOf(level) }));

/** One level, by the number it goes by. */
export function levelByNo(no) {
  return EXAM_LEVELS.find((level) => level.no === no) || null;
}

/** How many questions a level asks. */
export function levelSize(level) {
  return level?.size || 0;
}

/** A level's everyday part: its own words, or a paper drawn from the whole series. */
function lifePart(level) {
  if (level.life.mix) return shuffled(LIFE_ROWS).slice(0, level.life.mix).map(lifeQuestionOf);
  return shuffled((level.life.ids || []).map((id) => BY_ID.get(id)).filter(Boolean)).map(lifeQuestionOf);
}

/** A level's health part: its own terms, the terms that carry a rule, or one drawn from the whole list. */
function medicalPart(level) {
  if (level.medical.rules) return buildRulePaper();
  if (level.medical.mix) return buildMedicalMix(level.medical.mix);
  return buildMedicalPaper(level.medical.terms || []);
}

/**
 * One level's paper: its everyday questions and its health questions, freshly ordered and shuffled
 * together, so neither part is ever met in the same place twice.
 */
export function buildLevelPaper(no) {
  const level = levelByNo(no);
  if (!level) return [];
  return shuffled([...lifePart(level), ...medicalPart(level)]);
}